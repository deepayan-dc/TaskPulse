import { Task, TaskComment, TaskStatus } from '../types/task';
import { apiFetch } from './api';

const DEFAULT_TIMER_DATA = { startTime: null, isRunning: false, elapsedTime: 0, logs: [] };

export const taskService = {
  async getTasks(): Promise<Task[]> {
    const response = await apiFetch('/tasks');
    const data = await response.json();
    return data.data.map((task: any) => ({
      id: String(task.id),
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: 'Medium', // Backend doesn't have priority, default to Medium
      dueDate: task.dueDate || new Date().toISOString(),
      assignee: { 
        id: String(task.assignedTo.id), 
        name: task.assignedTo.name 
      },
      createdBy: { 
        id: String(task.createdBy.id), 
        name: task.createdBy.name 
      },
      createdAt: task.createdAt,
      timerData: { ...DEFAULT_TIMER_DATA }
    }));
  },

  async getTaskById(id: string): Promise<{ task: Task; comments: TaskComment[] }> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) throw new Error('Task not found');
    
    let comments: TaskComment[] = [];
    try {
      const response = await apiFetch(`/comments/${id}`);
      const data = await response.json();
      comments = data.data.map((c: any) => ({
        id: String(c.id),
        taskId: String(c.taskId),
        text: c.content,
        author: {
          id: String(c.user.id),
          name: c.user.name,
          role: c.user.role
        },
        createdAt: c.createdAt
      }));
    } catch (e) {
      console.error('Failed to fetch comments', e);
    }

    return { task, comments };
  },

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'timerData'>): Promise<Task> {
    const response = await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: taskData.title,
        description: taskData.description,
        assignedToId: taskData.assignee.id,
        createdById: taskData.createdBy.id,
        dueDate: taskData.dueDate
      })
    });
    const data = await response.json();
    const task = data.data;
    
    return {
      id: String(task.id),
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: taskData.priority,
      dueDate: task.dueDate || taskData.dueDate,
      assignee: taskData.assignee,
      createdBy: taskData.createdBy,
      createdAt: task.createdAt,
      timerData: { ...DEFAULT_TIMER_DATA }
    };
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    const response = await apiFetch(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    const task = data.data;
    
    return {
      id: String(task.id),
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: 'Medium',
      dueDate: task.dueDate || new Date().toISOString(),
      assignee: { 
        id: String(task.assignedTo?.id || ''), 
        name: task.assignedTo?.name || '' 
      },
      createdBy: { 
        id: String(task.createdBy?.id || ''), 
        name: task.createdBy?.name || '' 
      },
      createdAt: task.createdAt,
      timerData: { ...DEFAULT_TIMER_DATA }
    };
  },

  async addComment(taskId: string, commentData: Omit<TaskComment, 'id' | 'taskId' | 'createdAt'>): Promise<TaskComment> {
    const response = await apiFetch('/comments', {
      method: 'POST',
      body: JSON.stringify({
        taskId: parseInt(taskId, 10),
        content: commentData.text,
        userId: commentData.author.id
      })
    });
    const data = await response.json();
    const c = data.data;
    
    return {
      id: String(c.id),
      taskId: String(c.taskId),
      text: c.content,
      author: commentData.author,
      createdAt: c.createdAt
    };
  },

  // Timer logic remains in memory since backend doesn't support it yet
  // We keep it so UI doesn't break, but it won't persist across reloads
  async startTimer(taskId: string): Promise<Task> {
    const { task } = await this.getTaskById(taskId);
    if (task.timerData.isRunning) return task;
    
    task.timerData = {
      ...task.timerData,
      startTime: Date.now(),
      isRunning: true
    };
    return task;
  },

  async pauseTimer(taskId: string): Promise<Task> {
    const { task } = await this.getTaskById(taskId);
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
    return task;
  },

  async stopTimer(taskId: string): Promise<Task> {
    return this.pauseTimer(taskId);
  }
};
