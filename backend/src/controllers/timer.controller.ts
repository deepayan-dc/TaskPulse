import { NextFunction, Response } from 'express';
import { prisma } from '../lib/prisma';
import { parseTaskId } from '../utils/validators';
import { AppError } from '../utils/app-error';
import { assertTaskAccess } from '../services/task.service';
import { BasicAuthRequest } from '../middleware/basic-auth.middleware';

export const startTimerController = async (req: BasicAuthRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = parseTaskId(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    // Scope: only the task's creator or assignee may time it.
    await assertTaskAccess(taskId, userId);

    // Check if there is already an active timer
    const activeLog = await prisma.timeLog.findFirst({
      where: { taskId, endTime: null }
    });

    if (activeLog) {
      return res.status(200).json({
        message: 'Timer is already running',
        data: activeLog
      });
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        taskId,
        userId,
        startTime: new Date()
      }
    });

    res.status(201).json({
      message: 'Timer started',
      data: timeLog
    });
  } catch (error) {
    next(error);
  }
};

export const stopTimerController = async (req: BasicAuthRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = parseTaskId(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    // Scope: only the task's creator or assignee may time it.
    await assertTaskAccess(taskId, userId);

    // Find the active timer
    const activeLog = await prisma.timeLog.findFirst({
      where: { taskId, endTime: null }
    });

    if (!activeLog) {
      return res.status(400).json({
        message: 'No active timer found for this task'
      });
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - activeLog.startTime.getTime();
    const durationSec = Math.floor(durationMs / 1000);

    const updatedLog = await prisma.timeLog.update({
      where: { id: activeLog.id },
      data: {
        endTime,
        duration: durationSec
      }
    });

    res.status(200).json({
      message: 'Timer stopped',
      data: updatedLog
    });
  } catch (error) {
    next(error);
  }
};
