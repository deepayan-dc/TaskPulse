import { Task, TaskComment, TaskStatus } from '../types/task';

const DEFAULT_TIMER_DATA = { startTime: null, isRunning: false, elapsedTime: 0, logs: [] };

const INITIAL_TASKS: Task[] = [
  {
    id: 't-1',
    title: 'Update landing page hero section',
    description: 'The marketing team requested a new layout for the hero section. Includes new copy and background image.',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    assignee: { id: '3', name: 'Vikram Patel' },
    createdBy: { id: '1', name: 'Rajesh Gupta' },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    timerData: { ...DEFAULT_TIMER_DATA }
  },
  {
    id: 't-2',
    title: 'Fix payment gateway timeout',
    description: 'Customers are reporting timeouts during checkout. Investigate Stripe integration.',
    status: 'Pending',
    priority: 'Critical',
    dueDate: new Date(Date.now() - 86400000).toISOString(),
    assignee: { id: '4', name: 'Priya Singh' },
    createdBy: { id: '1', name: 'Rajesh Gupta' },
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    timerData: { ...DEFAULT_TIMER_DATA }
  },
  {
    id: 't-3',
    title: 'Write Q3 API Documentation',
    description: 'Document the new user management endpoints introduced in Q3.',
    status: 'Completed',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    assignee: { id: '5', name: 'Arjun Mehta' },
    createdBy: { id: '2', name: 'Anita Sharma' },
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    timerData: { ...DEFAULT_TIMER_DATA, elapsedTime: 7200 } // 2 hours fake time
  }
];

let mockTasks: Task[] = JSON.parse(localStorage.getItem('taskpulse_tasks_v2') || 'null') || INITIAL_TASKS;
let mockComments: TaskComment[] = JSON.parse(localStorage.getItem('taskpulse_comments_v2') || 'null') || [];

const saveToLocal = () => {
  localStorage.setItem('taskpulse_tasks_v2', JSON.stringify(mockTasks));
  localStorage.setItem('taskpulse_comments_v2', JSON.stringify(mockComments));
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const taskService = {
  async getTasks(): Promise<Task[]> {
    await delay(300);
    return [...mockTasks];
  },

  async getTaskById(id: string): Promise<{ task: Task; comments: TaskComment[] }> {
    await delay(200);
    const task = mockTasks.find(t => t.id === id);
    if (!task) throw new Error('Task not found');
    const comments = mockComments.filter(c => c.taskId === id);
    return { task: { ...task }, comments: [...comments] };
  },

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'timerData'>): Promise<Task> {
    await delay(300);
    const newTask: Task = {
      ...taskData,
      id: `t-${Math.random().toString(36).substring(2, 9)}`,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      timerData: { startTime: null, isRunning: false, elapsedTime: 0, logs: [] }
    };
    mockTasks = [newTask, ...mockTasks];
    saveToLocal();
    return { ...newTask };
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    await delay(200);
    const index = mockTasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');
    
    mockTasks[index] = { ...mockTasks[index], status };
    saveToLocal();
    return { ...mockTasks[index] };
  },

  async addComment(taskId: string, commentData: Omit<TaskComment, 'id' | 'taskId' | 'createdAt'>): Promise<TaskComment> {
    await delay(200);
    const newComment: TaskComment = {
      ...commentData,
      id: `c-${Math.random().toString(36).substring(2, 9)}`,
      taskId,
      createdAt: new Date().toISOString(),
    };
    mockComments = [...mockComments, newComment];
    saveToLocal();
    return { ...newComment };
  },

  async startTimer(taskId: string): Promise<Task> {
    const index = mockTasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');
    
    const task = mockTasks[index];
    if (task.timerData.isRunning) return task; // Already running
    
    task.timerData = {
      ...task.timerData,
      startTime: Date.now(),
      isRunning: true
    };
    
    saveToLocal();
    return { ...task };
  },

  async pauseTimer(taskId: string): Promise<Task> {
    const index = mockTasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');
    
    const task = mockTasks[index];
    if (!task.timerData.isRunning || !task.timerData.startTime) return task;
    
    const now = Date.now();
    const durationMs = now - task.timerData.startTime;
    const durationSec = Math.floor(durationMs / 1000);
    
    task.timerData = {
      ...task.timerData,
      startTime: null,
      isRunning: false,
      elapsedTime: task.timerData.elapsedTime + durationSec,
      logs: [
        ...task.timerData.logs,
        { start: task.timerData.startTime, end: now, duration: durationSec }
      ]
    };
    
    saveToLocal();
    return { ...task };
  },

  async stopTimer(taskId: string): Promise<Task> {
    return this.pauseTimer(taskId); // Logic is the same, caller sets status
  }
};
