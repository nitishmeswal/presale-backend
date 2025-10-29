import { supabaseAdmin } from '../config/database';
import logger from '../utils/logger';

// Compute multipliers (from your edge function)
const COMPUTE_MULTIPLIERS = {
  text: 0.12,
  image: 0.4,
  three_d: 0.8,
  video: 1.6
};

export const globalStatsService = {
  // Update global stats - migrated from update-device-uptime edge function
  async updateGlobalStats(completedTasks: { three_d: number; video: number; text: number; image: number }): Promise<void> {
    try {
      const updates = [
        { id: 'TOTAL_3D_TASKS', increment: completedTasks.three_d },
        { id: 'TOTAL_VIDEO_TASKS', increment: completedTasks.video },
        { id: 'TOTAL_TEXT_TASKS', increment: completedTasks.text },
        { id: 'TOTAL_IMAGE_TASKS', increment: completedTasks.image }
      ];

      for (const update of updates) {
        if (update.increment > 0) {
          // Get current value
          const { data: currentStat } = await supabaseAdmin
            .from('global_stats')
            .select('total_tasks_completed')
            .eq('id', update.id)
            .maybeSingle();

          if (currentStat) {
            // Update existing record
            const currentValue = Number(currentStat.total_tasks_completed) || 0;
            const newTotal = currentValue + update.increment;

            await supabaseAdmin
              .from('global_stats')
              .update({ total_tasks_completed: newTotal })
              .eq('id', update.id);
          } else {
            // Insert new record
            await supabaseAdmin
              .from('global_stats')
              .insert({
                id: update.id,
                total_tasks_completed: update.increment
              });
          }
        }
      }
    } catch (error) {
      logger.error('Error updating global stats:', error);
      throw error;
    }
  },

  // Get global stats - migrated from global-stats edge function
  async getGlobalStats(): Promise<{
    global_sp: number;
    total_users: number;
    global_compute_generated: number;
  }> {
    try {
      // Get total earnings (global_sp)
      const { data: earningsData } = await supabaseAdmin
        .from('earnings_history')
        .select('total_amount');

      const globalSp = earningsData?.reduce((sum, record) => sum + Number(record.total_amount), 0) || 0;

      // Get total users count
      const { count: totalUsers } = await supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Get task completion data from global_stats table
      const { data: globalStatsData } = await supabaseAdmin
        .from('global_stats')
        .select('id, total_tasks_completed')
        .in('id', ['TOTAL_3D_TASKS', 'TOTAL_IMAGE_TASKS', 'TOTAL_TEXT_TASKS', 'TOTAL_VIDEO_TASKS']);

      // Calculate global compute generated
      let globalComputeGenerated = 0;
      globalStatsData?.forEach((stat) => {
        const count = Number(stat.total_tasks_completed) || 0;
        switch (stat.id) {
          case 'TOTAL_3D_TASKS':
            globalComputeGenerated += count * COMPUTE_MULTIPLIERS.three_d;
            break;
          case 'TOTAL_IMAGE_TASKS':
            globalComputeGenerated += count * COMPUTE_MULTIPLIERS.image;
            break;
          case 'TOTAL_TEXT_TASKS':
            globalComputeGenerated += count * COMPUTE_MULTIPLIERS.text;
            break;
          case 'TOTAL_VIDEO_TASKS':
            globalComputeGenerated += count * COMPUTE_MULTIPLIERS.video;
            break;
        }
      });

      return {
        global_sp: Number(globalSp.toFixed(2)),
        total_users: totalUsers || 0,
        global_compute_generated: Number(globalComputeGenerated.toFixed(2))
      };
    } catch (error) {
      logger.error('Error getting global stats:', error);
      throw error;
    }
  },

  // Get user compute stats - migrated from user-compute-stats edge function
  async getUserComputeStats(): Promise<{
    total_users: number;
    total_compute_generated: number;
    total_tasks: number;
  }> {
    try {
      // Get total users count
      const { count: totalUsers } = await supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Get task completion data from global_stats table
      const { data: globalStatsData } = await supabaseAdmin
        .from('global_stats')
        .select('id, total_tasks_completed')
        .in('id', ['TOTAL_3D_TASKS', 'TOTAL_IMAGE_TASKS', 'TOTAL_TEXT_TASKS', 'TOTAL_VIDEO_TASKS']);

      // Calculate global compute generated and total tasks
      let globalComputeGenerated = 0;
      let totalTasks = 0;

      globalStatsData?.forEach((stat) => {
        const count = Number(stat.total_tasks_completed) || 0;
        totalTasks += count;
        switch (stat.id) {
          case 'TOTAL_3D_TASKS':
            globalComputeGenerated += count * COMPUTE_MULTIPLIERS.three_d;
            break;
          case 'TOTAL_IMAGE_TASKS':
            globalComputeGenerated += count * COMPUTE_MULTIPLIERS.image;
            break;
          case 'TOTAL_TEXT_TASKS':
            globalComputeGenerated += count * COMPUTE_MULTIPLIERS.text;
            break;
          case 'TOTAL_VIDEO_TASKS':
            globalComputeGenerated += count * COMPUTE_MULTIPLIERS.video;
            break;
        }
      });

      return {
        total_users: totalUsers || 0,
        total_compute_generated: Number(globalComputeGenerated.toFixed(2)),
        total_tasks: totalTasks
      };
    } catch (error) {
      logger.error('Error getting user compute stats:', error);
      throw error;
    }
  },

  // Update device uptime - migrated from update-device-uptime edge function
  async updateDeviceUptime(
    deviceId: string,
    uptimeSeconds: number,
    completedTasks: { three_d: number; video: number; text: number; image: number }
  ): Promise<any> {
    try {
      // Get current device
      const { data: device, error: deviceError } = await supabaseAdmin
        .from('devices')
        .select('uptime, device_name, owner')
        .eq('id', deviceId)
        .single();

      if (deviceError || !device) {
        throw new Error('Device not found');
      }

      // Calculate new uptime
      const currentUptime = Number(device.uptime) || 0;
      const newUptime = currentUptime + uptimeSeconds;

      // Update device uptime
      const { error: updateError } = await supabaseAdmin
        .from('devices')
        .update({ uptime: newUptime })
        .eq('id', deviceId);

      if (updateError) {
        throw new Error(`Failed to update device uptime: ${updateError.message}`);
      }

      // Update global statistics
      await this.updateGlobalStats(completedTasks);

      return {
        device_id: deviceId,
        device_name: device.device_name,
        new_uptime: newUptime,
        previous_uptime: currentUptime,
        uptime_added: uptimeSeconds,
        tasks_processed: completedTasks
      };
    } catch (error) {
      logger.error('Error updating device uptime:', error);
      throw error;
    }
  },
};
