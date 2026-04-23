import { Router } from 'express';
import {
  createCommentController,
  listCommentsByTaskController,
} from '../controllers/comment.controller';
import { basicAuth } from '../middleware/basic-auth.middleware';

const router = Router();

router.get('/:taskId', basicAuth, listCommentsByTaskController);
router.post('/', basicAuth, createCommentController);

export default router;
