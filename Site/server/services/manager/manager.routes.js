// services/manager/manager.routes.js
import express from 'express';
import { getManagerDashboardData, cleanupCityAttractionsField ,insertAttractionsForCity } from './manager.controller.js';
const router = express.Router();

router.get('/dashboard', getManagerDashboardData);
router.post('/city/:cityId/attractions', insertAttractionsForCity);
router.post('/cleanup/cities', cleanupCityAttractionsField);

export default router;
