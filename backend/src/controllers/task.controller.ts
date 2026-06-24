import { Response, NextFunction } from 'express';
import { createTask, getTasks, updateTaskStatus, assertTaskAccess } from '../services/task.service';
import { parseTaskId, parseTaskStatus, requireString } from '../utils/validators';
import { prisma } from '../lib/prisma';
import { BasicAuthRequest } from '../middleware/basic-auth.middleware';

export const listTasks = async (req: BasicAuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const tasks = await getTasks(req.user.id);
    res.status(200).json({ data: tasks });
  } catch (error) {
    next(error);
  }
};

export const createTaskController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create tasks' });
    }

    const title = requireString(req.body?.title, 'title');
    const assignedToId = requireString(req.body?.assignedToId, 'assignedToId');
    const description = req.body?.description ? String(req.body.description) : undefined;

    let dueDate: Date | undefined;
    if (req.body?.dueDate) {
      const parsedDate = new Date(req.body.dueDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid dueDate format' });
      }
      dueDate = parsedDate;
    }

    // Tenancy: a manager may only assign tasks to their own team members.
    const employee = await prisma.user.findFirst({
      where: { id: assignedToId, managerId: req.user.id },
      select: { id: true },
    });
    if (!employee) {
      return res.status(403).json({ message: 'You can only assign tasks to your own team members.' });
    }

    const task = await createTask({
      title,
      description,
      assignedToId,
      createdById: req.user.id, // authoritative — never trust the client
      dueDate,
    });

    res.status(201).json({
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatusController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const taskId = parseTaskId(req.params.id);
    const status = parseTaskStatus(req.body?.status);

    await assertTaskAccess(taskId, req.user.id);

    const task = await updateTaskStatus(taskId, status);
    res.status(200).json({
      message: 'Task status updated',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};
