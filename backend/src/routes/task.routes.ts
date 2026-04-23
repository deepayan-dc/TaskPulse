import { Router } from 'express';
import {
  createTaskController,
  listTasks,
  updateTaskStatusController,
} from '../controllers/task.controller';
import { basicAuth } from '../middleware/basic-auth.middleware';

const router = Router();

router.get('/', basicAuth, listTasks);
router.post('/', basicAuth, createTaskController);
router.patch('/:id/status', basicAuth, updateTaskStatusController);

export default router;
