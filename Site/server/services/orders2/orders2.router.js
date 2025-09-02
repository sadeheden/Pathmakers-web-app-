// services/orders2/orders2.router.js
import express from 'express';
import Orders2Controller from './orders2.controller.js';
import authenticateUser from '../middleware/authenticateUser.js';

const router = express.Router();

router.use(authenticateUser);                 // 🔒 protect all
router.get('/conflicts', Orders2Controller.checkConflict);  // ✅ conflict check
router.post('/', Orders2Controller.createOrder);
router.get('/', Orders2Controller.getUserOrders);

export default router;
