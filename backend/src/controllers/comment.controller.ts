import { Response, NextFunction } from 'express';
import { createComment, getCommentsByTaskId } from '../services/comment.service';
import { assertTaskAccess } from '../services/task.service';
import { parseTaskId, requireString } from '../utils/validators';
import { BasicAuthRequest } from '../middleware/basic-auth.middleware';

export const listCommentsByTaskController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const taskId = parseTaskId(req.params.taskId);
    await assertTaskAccess(taskId, req.user.id);

    const comments = await getCommentsByTaskId(taskId);
    res.status(200).json({ data: comments });
  } catch (error) {
    next(error);
  }
};

export const createCommentController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const content = requireString(req.body?.content, 'content');
    const taskId = parseTaskId(String(req.body?.taskId));
    await assertTaskAccess(taskId, req.user.id);

    // Author is always the authenticated user — never trust a client-supplied id.
    const comment = await createComment({ content, taskId, userId: req.user.id });
    res.status(201).json({
      message: 'Comment created successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};
