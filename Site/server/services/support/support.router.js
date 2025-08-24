// services/support/support.routes.js
import { Router } from 'express';
import {
  getAllSupportRequests,
  createSupportRequest,
  updateSupportStatus,
  replyToSupportRequest,
} from './support.controller.js';

const router = Router();

router.get('/', getAllSupportRequests);
router.post('/', createSupportRequest);
router.patch('/:id', updateSupportStatus);
router.post('/:id/reply', replyToSupportRequest);

export default router;
