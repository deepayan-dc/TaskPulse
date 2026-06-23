import { AppError } from './app-error';
import { config } from '../config';

export const requireString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`${fieldName} is required`, 400);
  }

  return value.trim();
};

/**
 * Normalize an optional phone number into the international, digits-only
 * format Gupshup expects for `destination` (e.g. "919625587090").
 *
 * - Returns undefined for empty/missing input (phone is optional).
 * - Strips spaces, dashes, parentheses and a leading "+".
 * - A 10-digit local number is prefixed with the default country code.
 */
export const normalizePhone = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new AppError('phone must be a string', 400);
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) {
    return undefined;
  }

  const normalized = digits.length === 10 ? `${config.defaultCountryCode}${digits}` : digits;

  // E.164 allows up to 15 digits; require at least a country code + subscriber number.
  if (normalized.length < 11 || normalized.length > 15) {
    throw new AppError(
      'Invalid phone number. Include the country code, e.g. 919625587090',
      400
    );
  }

  return normalized;
};

export const parseTaskId = (value: string): number => {
  const taskId = Number(value);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new AppError('Invalid task id', 400);
  }

  return taskId;
};

const validTaskStatuses = [
  'Pending',
  'In Progress',
  'Completed',
  'Approved',
  'Returned',
  'TODO',
  'IN_PROGRESS',
  'DONE'
] as const;
type TaskStatusValue = (typeof validTaskStatuses)[number];

export const parseTaskStatus = (value: unknown): TaskStatusValue => {
  if (typeof value !== 'string') {
    throw new AppError('status is required', 400);
  }

  if (!validTaskStatuses.includes(value as TaskStatusValue)) {
    throw new AppError('Invalid status. Use Pending, In Progress, Completed, Approved, or Returned', 400);
  }

  return value as TaskStatusValue;
};
