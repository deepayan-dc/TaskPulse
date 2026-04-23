import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { parseTaskId } from '../utils/validators';
import { AppError } from '../utils/app-error';
import { BasicAuthRequest } from '../middleware/basic-auth.middleware';

export const startTimerController = async (req: BasicAuthRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = parseTaskId(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError('Task not found', 404);
    }

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

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError('Task not found', 404);
    }

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
