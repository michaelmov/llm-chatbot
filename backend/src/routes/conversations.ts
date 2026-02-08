import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { conversationService } from '../services/index.js';

const router = Router();

router.use(requireAuth);

router.post('/', async (req, res) => {
  const { title } = req.body as { title?: string };
  const conversation = await conversationService.create(req.userId, title);
  res.status(201).json(conversation);
});

router.get('/', async (req, res) => {
  const conversations = await conversationService.listByUser(req.userId);
  res.json(conversations);
});

router.get('/:id', async (req, res) => {
  const result = await conversationService.getWithMessages(req.params.id, req.userId);
  if (!result) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.json(result);
});

export { router as conversationsRouter };
