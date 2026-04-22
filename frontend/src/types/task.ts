export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Approved' | 'Returned';
export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface UserReference {
  id: string;
  name: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  text: string;
  author: UserReference & { role?: string };
  createdAt: string;
}

export interface TimeSegment {
  start: number;
  end: number;
  duration: number; // in seconds
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignee: UserReference;
  createdBy: UserReference;
  createdAt: string;
  timerData: {
    startTime: number | null;
    isRunning: boolean;
    elapsedTime: number; // in seconds
    logs: TimeSegment[];
  };
}
