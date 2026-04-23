import { NextFunction, Request, Response } from 'express';
import { createTask, getTasks, updateTaskStatus } from '../services/task.service';
import { parseTaskId, parseTaskStatus, requireString } from '../utils/validators';

export const listTasks = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await getTasks();
    res.status(200).json({ data: tasks });
  } catch (error) {
    next(error);
  }
};

export const createTaskController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const title = requireString(req.body?.title, 'title');
    const assignedToId = requireString(req.body?.assignedToId, 'assignedToId');
    const createdById = requireString(req.body?.createdById, 'createdById');
    const description = req.body?.description ? String(req.body.description) : undefined;

    let dueDate: Date | undefined;
    if (req.body?.dueDate) {
      const parsedDate = new Date(req.body.dueDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid dueDate format' });
      }
      dueDate = parsedDate;
    }

    const task = await createTask({
      title,
      description,
      assignedToId,
      createdById,
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

export const updateTaskStatusController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseTaskId(req.params.id);
    const status = parseTaskStatus(req.body?.status);

    const task = await updateTaskStatus(taskId, status);
    res.status(200).json({
      message: 'Task status updated',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};
