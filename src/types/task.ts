export interface Task {
  id: string;
  sessionId: string;
  taskType: 'training' | 'inference' | 'validation';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  estimatedDuration: number;
  actualDuration?: number;
  reward: number;
  metadata?: Record<string, any>;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface GenerateTaskRequest {
  sessionId: string;
  taskType: 'training' | 'inference' | 'validation';
  priority?: 'low' | 'medium' | 'high';
}

export interface CompleteTaskRequest {
  taskId: string;
  result: any;
  metrics?: Record<string, any>;
}

export interface TaskHistory {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalRewards: number;
  tasks: Task[];
}
