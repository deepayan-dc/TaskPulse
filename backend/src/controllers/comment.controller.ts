import { NextFunction, Request, Response } from 'express';
import { createComment, getCommentsByTaskId } from '../services/comment.service';
import { parseTaskId, requireString } from '../utils/validators';

export const listCommentsByTaskController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseTaskId(req.params.taskId);
    const comments = await getCommentsByTaskId(taskId);

    res.status(200).json({ data: comments });
  } catch (error) {
    next(error);
  }
};

export const createCommentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const content = requireString(req.body?.content, 'content');
    const userId = requireString(req.body?.userId, 'userId');
    const taskId = parseTaskId(String(req.body?.taskId));

    const comment = await createComment({ content, taskId, userId });
    res.status(201).json({
      message: 'Comment created successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};
