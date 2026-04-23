import { AppError } from './app-error';

export const requireString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`${fieldName} is required`, 400);
  }

  return value.trim();
};

export const parseTaskId = (value: string): number => {
  const taskId = Number(value);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new AppError('Invalid task id', 400);
  }

  return taskId;
};

const validTaskStatuses = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
type TaskStatusValue = (typeof validTaskStatuses)[number];

export const parseTaskStatus = (value: unknown): TaskStatusValue => {
  if (typeof value !== 'string') {
    throw new AppError('status is required', 400);
  }

  if (!validTaskStatuses.includes(value as TaskStatusValue)) {
    throw new AppError('Invalid status. Use TODO, IN_PROGRESS, or DONE', 400);
  }

  return value as TaskStatusValue;
};
