import express from 'express';
import { handleNewsletterSubscription } from './newsletter.controller.js';

const router = express.Router();

router.post('/', handleNewsletterSubscription);

export default router;
