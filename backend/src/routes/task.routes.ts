import { Router } from 'express';
import {
  createTaskController,
  listTasks,
  updateTaskStatusController,
} from '../controllers/task.controller';
import { startTimerController, stopTimerController } from '../controllers/timer.controller';
import { basicAuth } from '../middleware/basic-auth.middleware';

const router = Router();

router.get('/', basicAuth, listTasks);
router.post('/', basicAuth, createTaskController);
router.patch('/:id/status', basicAuth, updateTaskStatusController);

// Timer routes
router.post('/:id/timer/start', basicAuth, startTimerController);
router.post('/:id/timer/stop', basicAuth, stopTimerController);

export default router;
