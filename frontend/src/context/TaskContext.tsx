import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Task, TaskStatus, TaskComment } from '../types/task';
import { taskService } from '../services/taskService';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  createTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'timerData'>) => Promise<Task>;
  updateStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  addComment: (taskId: string, text: string, author: { id: string; name: string; role?: string }) => Promise<TaskComment>;
  startTimer: (taskId: string) => Promise<void>;
  pauseTimer: (taskId: string) => Promise<void>;
  stopTimer: (taskId: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await taskService.getTasks();
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'timerData'>) => {
    const newTask = await taskService.createTask(taskData);
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  };

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    const updatedTask = await taskService.updateTaskStatus(taskId, status);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
  };

  const addComment = async (taskId: string, text: string, author: { id: string; name: string; role?: string }) => {
    return await taskService.addComment(taskId, { text, author });
  };

  const startTimer = async (taskId: string) => {
    const updatedTask = await taskService.startTimer(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
  };

  const pauseTimer = async (taskId: string) => {
    const updatedTask = await taskService.pauseTimer(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
  };

  const stopTimer = async (taskId: string) => {
    const updatedTask = await taskService.stopTimer(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
  };

  return (
    <TaskContext.Provider value={{ 
      tasks, isLoading, error, refreshTasks: fetchTasks, 
      createTask, updateStatus, addComment,
      startTimer, pauseTimer, stopTimer 
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
