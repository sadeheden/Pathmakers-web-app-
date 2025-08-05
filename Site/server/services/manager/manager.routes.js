// services/manager/manager.routes.js
import express from 'express';
import { getManagerDashboardData } from './manager.controller.js';

const router = express.Router();

router.get('/dashboard', getManagerDashboardData);

export default router;
