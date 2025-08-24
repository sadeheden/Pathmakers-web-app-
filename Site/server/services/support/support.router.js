import { Router } from 'express';
import {
  getAllSupportRequests,
  createSupportRequest,
  updateSupportStatus,
  replyToSupportRequest,
  verifyEmailTransport, // <-- make sure this is here
} from './support.controller.js';

const router = Router();

router.get('/', getAllSupportRequests);
router.post('/', createSupportRequest);
router.patch('/:id', updateSupportStatus);
router.post('/:id/reply', replyToSupportRequest);

// optional: transport health-check
router.get('/_verify-email', verifyEmailTransport);

export default router;
