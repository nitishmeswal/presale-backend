import { supabaseAdmin } from '../config/database';
import { ERROR_MESSAGES, EARNINGS_CONFIG } from '../utils/constants';
import { Task, TaskHistory } from '../types/task';
import logger from '../utils/logger';

export const taskService = {
  // Main method from old MVP - Complete task and update unclaimed rewards
  async completeTaskWithRewards(
    userId: string,
    incrementAmount: number,
    taskId: string,
    taskType?: string,
    hardwareTier?: string,
    multiplier?: number
  ): Promise<{ unclaimed_reward: number; success: boolean; task_id?: string }> {
    try {
      // Create earning record (unclaimed)
      const { data: earning, error: earningError } = await supabaseAdmin
        .from('earnings')
        .insert({
          user_id: userId,
          amount: incrementAmount,
          reward_type: 'task_completion',
          is_claimed: false,
          description: `Task completion: ${taskType || 'unknown'}`,
          metadata: { task_id: taskId, hardware_tier: hardwareTier, multiplier }
        })
        .select()
        .single();

      if (earningError) {
        logger.error('Error creating earning record:', earningError);
        throw new Error('Failed to create earning record');
      }

      // Get total unclaimed rewards
      const { data: unclaimedEarnings } = await supabaseAdmin
        .from('earnings')
        .select('amount')
        .eq('user_id', userId)
        .eq('is_claimed', false);

      const totalUnclaimed = unclaimedEarnings?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0;

      return {
        unclaimed_reward: totalUnclaimed,
        success: true,
        task_id: earning.id
      };
    } catch (error) {
      logger.error('Error in completeTaskWithRewards:', error);
      throw error;
    }
  },

  async generateTask(
    sessionId: string,
    taskType: 'training' | 'inference' | 'validation',
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<Task> {
    // Calculate reward based on task type
    let reward = EARNINGS_CONFIG.BASE_RATE_PER_HOUR;
    if (taskType === 'training') {
      reward *= EARNINGS_CONFIG.TRAINING_MULTIPLIER;
    } else if (taskType === 'inference') {
      reward *= EARNINGS_CONFIG.INFERENCE_MULTIPLIER;
    } else if (taskType === 'validation') {
      reward *= EARNINGS_CONFIG.VALIDATION_MULTIPLIER;
    }

    const estimatedDuration = Math.floor(Math.random() * 3600) + 300; // 5 mins to 1 hour

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        session_id: sessionId,
        task_type: taskType,
        status: 'pending',
        priority,
        estimated_duration: estimatedDuration,
        reward,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapTaskFromDB(task);
  },

  async completeTask(
    taskId: string,
    result: any,
    metrics?: Record<string, any>
  ): Promise<Task> {
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (!task) {
      throw new Error(ERROR_MESSAGES.TASK_NOT_FOUND);
    }

    const completedAt = new Date();
    const startedAt = new Date(task.started_at || task.created_at);
    const actualDuration = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

    const { data: updatedTask, error } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: completedAt.toISOString(),
        actual_duration: actualDuration,
        metadata: { result, metrics },
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Update session task count
    await supabaseAdmin.rpc('increment_session_tasks', {
      session_id: task.session_id,
    });

    // Create earning record
    await supabaseAdmin.from('earnings').insert({
      user_id: task.user_id,
      session_id: task.session_id,
      task_id: taskId,
      amount: task.reward,
      type: 'task',
      status: 'confirmed',
    });

    return this.mapTaskFromDB(updatedTask);
  },

  async getTask(taskId: string): Promise<Task> {
    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      throw new Error(ERROR_MESSAGES.TASK_NOT_FOUND);
    }

    return this.mapTaskFromDB(task);
  },

  async getTaskHistory(userId: string): Promise<TaskHistory> {
    const { data: tasks, error } = await supabaseAdmin
      .from('tasks')
      .select('*, sessions!inner(user_id)')
      .eq('sessions.user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const failedTasks = tasks.filter((t) => t.status === 'failed');
    const totalRewards = completedTasks.reduce((sum, t) => sum + (t.reward || 0), 0);

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      totalRewards,
      tasks: tasks.map(this.mapTaskFromDB),
    };
  },

  async getTaskStats(userId: string): Promise<any> {
    try {
      // Get user profile with total_tasks_completed
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('total_tasks_completed')
        .eq('id', userId)
        .single();

      const totalTasksCompleted = profile?.total_tasks_completed || 0;

      // Get earnings from task completions
      const { data: taskEarnings } = await supabaseAdmin
        .from('earnings')
        .select('amount')
        .eq('user_id', userId)
        .eq('reward_type', 'task_completion');

      const totalEarnings = taskEarnings?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0;

      // Get today's completed tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayEarnings } = await supabaseAdmin
        .from('earnings')
        .select('amount')
        .eq('user_id', userId)
        .eq('reward_type', 'task_completion')
        .gte('created_at', today.toISOString());

      const todayTasksCompleted = todayEarnings?.length || 0;
      const todayEarnings_amount = todayEarnings?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0;

      return {
        totalTasksCompleted,
        totalEarnings,
        todayTasksCompleted,
        todayEarnings: todayEarnings_amount,
        averageEarningsPerTask: totalTasksCompleted > 0 ? totalEarnings / totalTasksCompleted : 0
      };
    } catch (error) {
      logger.error('Error getting task stats:', error);
      throw error;
    }
  },

  mapTaskFromDB(dbTask: any): Task {
    return {
      id: dbTask.id,
      sessionId: dbTask.session_id,
      taskType: dbTask.task_type,
      status: dbTask.status,
      priority: dbTask.priority,
      estimatedDuration: dbTask.estimated_duration,
      actualDuration: dbTask.actual_duration,
      reward: dbTask.reward,
      metadata: dbTask.metadata,
      createdAt: dbTask.created_at,
      startedAt: dbTask.started_at,
      completedAt: dbTask.completed_at,
    };
  },
};
