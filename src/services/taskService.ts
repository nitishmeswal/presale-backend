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
  ): Promise<{ unclaimed_reward: number; total_unclaimed_reward: number; task_count: number; success: boolean; task_id?: string }> {
    try {
      logger.info(`📝 Task completion: User=${userId}, Amount=${incrementAmount}, Type=${taskType}`);

      // 1. Create earning record (unclaimed) - matches exact schema
      const earningData = {
        user_id: userId,
        amount: incrementAmount,
        earning_type: 'other',
        reward_type: 'task',
        is_claimed: false,
        description: `Task completion: ${taskType || 'unknown'}`,
        metadata: taskId ? { task_id: taskId, hardware_tier: hardwareTier, multiplier } : null
      };

      logger.info('📝 Inserting earning:', earningData);

      const { data: earning, error: earningError } = await supabaseAdmin
        .from('earnings')
        .insert(earningData)
        .select()
        .single();

      if (earningError) {
        logger.error('❌ Error creating earning record:', {
          error: earningError,
          message: earningError.message,
          details: earningError.details,
          hint: earningError.hint,
          code: earningError.code,
          insertData: earningData
        });
        throw new Error(`Failed to create earning record: ${earningError.message || earningError.details || earningError.hint || 'Unknown error'}`);
      }

      // 2. Update user_profiles: increment task count and unclaimed rewards
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('task_completed, unclaimed_reward')
        .eq('id', userId)
        .single();

      if (profileError) {
        logger.error(`❌ Error fetching user profile: ${profileError.message || JSON.stringify(profileError)}`);
        throw new Error('Failed to fetch user profile');
      }

      const newTaskCount = (userProfile?.task_completed || 0) + 1;
      const newUnclaimedReward = (userProfile?.unclaimed_reward || 0) + incrementAmount;

      logger.info(`📊 Updating user profile: TaskCount ${userProfile?.task_completed || 0} → ${newTaskCount}, Unclaimed ${userProfile?.unclaimed_reward || 0} → ${newUnclaimedReward}`);

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          task_completed: newTaskCount,
          unclaimed_reward: newUnclaimedReward
        })
        .eq('id', userId);

      if (updateError) {
        logger.error(`❌ Error updating user profile: ${updateError.message || JSON.stringify(updateError)}`);
        throw new Error('Failed to update user profile');
      }

      // 3. Update global stats based on task type
      if (taskType) {
        const statsMap: Record<string, string> = {
          'three_d': 'TOTAL_3D_TASKS',
          '3d': 'TOTAL_3D_TASKS',
          'video': 'TOTAL_VIDEO_TASKS',
          'text': 'TOTAL_TEXT_TASKS',
          'image': 'TOTAL_IMAGE_TASKS'
        };

        const statId = statsMap[taskType.toLowerCase()];
        if (statId) {
          const { data: currentStat } = await supabaseAdmin
            .from('global_stats')
            .select('total_tasks_completed')
            .eq('id', statId)
            .single();

          if (currentStat) {
            await supabaseAdmin
              .from('global_stats')
              .update({
                total_tasks_completed: (currentStat.total_tasks_completed || 0) + 1
              })
              .eq('id', statId);
          }
        }
      }

      logger.info(`✅ Task completed: TaskCount=${newTaskCount}, TotalUnclaimed=${newUnclaimedReward}`);

      // 4. Distribute tiered royalty earnings to referrers
      try {
        const { referralService } = await import('./referralService');
        await referralService.distributeRoyaltyEarnings(userId, incrementAmount);
        logger.info(`💰 Royalty earnings distributed for task completion`);
      } catch (royaltyError: any) {
        logger.error(`⚠️ Failed to distribute royalty earnings: ${royaltyError.message || JSON.stringify(royaltyError)}`);
        // Don't fail the task completion if royalty distribution fails
      }

      // 4. Return updated totals
      return {
        unclaimed_reward: incrementAmount,
        total_unclaimed_reward: newUnclaimedReward,
        task_count: newTaskCount,
        success: true,
        task_id: earning?.id
      };
    } catch (error: any) {
      logger.error(`Error in completeTaskWithRewards: ${error.message || JSON.stringify(error)}`);
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

    // Create earning record - matches exact schema
    await supabaseAdmin.from('earnings').insert({
      user_id: task.user_id,
      amount: task.reward,
      earning_type: 'other',
      reward_type: 'task',
      is_claimed: false,
      description: `Task ${taskId} completed`,
      metadata: { task_id: taskId, session_id: task.session_id }
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
      // Get user profile with task_completed (correct column name!)
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('task_completed')
        .eq('id', userId)
        .single();

      const totalTasksCompleted = profile?.task_completed || 0;

      // Get total earnings from earnings_history (not earnings table!)
      const { data: history } = await supabaseAdmin
        .from('earnings_history')
        .select('total_amount')
        .eq('user_id', userId)
        .single();

      const totalEarnings = parseFloat(history?.total_amount?.toString() || '0');

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
    } catch (error: any) {
      logger.error(`Error getting task stats: ${error.message || JSON.stringify(error)}`);
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
