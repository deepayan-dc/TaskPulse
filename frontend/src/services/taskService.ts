import { Task, TaskComment, TaskStatus } from '../types/task';
import { apiFetch } from './api';

const mapBackendTask = (task: any): Task => {
  let elapsedTime = 0;
  let isRunning = false;
  let startTime: number | null = null;
  const logs: any[] = [];

  const timeLogs = task.timeLogs || [];
  timeLogs.forEach((log: any) => {
    if (log.endTime) {
      elapsedTime += log.duration;
      logs.push({
        start: new Date(log.startTime).getTime(),
        end: new Date(log.endTime).getTime(),
        duration: log.duration
      });
    } else {
      isRunning = true;
      startTime = new Date(log.startTime).getTime();
    }
  });

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
    timerData: { startTime, isRunning, elapsedTime, logs }
  };
};

export const taskService = {
  async getTasks(): Promise<Task[]> {
    const response = await apiFetch('/tasks');
    const data = await response.json();
    return data.data.map(mapBackendTask);
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
    return mapBackendTask(data.data);
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    const response = await apiFetch(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    return mapBackendTask(data.data);
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

  async startTimer(taskId: string): Promise<Task> {
    await apiFetch(`/tasks/${taskId}/timer/start`, { method: 'POST' });
    const { task } = await this.getTaskById(taskId);
    return task;
  },

  async pauseTimer(taskId: string): Promise<Task> {
    await apiFetch(`/tasks/${taskId}/timer/stop`, { method: 'POST' });
    const { task } = await this.getTaskById(taskId);
    return task;
  },

  async stopTimer(taskId: string): Promise<Task> {
    return this.pauseTimer(taskId);
  }
};
