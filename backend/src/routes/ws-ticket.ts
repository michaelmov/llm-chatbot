import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ticketService } from '../services/ticket-service.js';

const router = Router();

router.post('/ticket', requireAuth, async (req, res) => {
  const ticket = await ticketService.create(req.userId);
  res.json({ ticket });
});

export { router as wsTicketRouter };
