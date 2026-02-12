import { randomUUID } from 'crypto';
import { redis } from '../redis.js';

const TICKET_TTL_SECONDS = 30;
const TICKET_PREFIX = 'ws-ticket:';

class TicketService {
  async create(userId: string): Promise<string> {
    const ticket = randomUUID();
    await redis.set(`${TICKET_PREFIX}${ticket}`, userId, 'EX', TICKET_TTL_SECONDS);
    return ticket;
  }

  async validate(ticket: string): Promise<string | null> {
    const userId = await redis.getdel(`${TICKET_PREFIX}${ticket}`);
    return userId;
  }
}

export const ticketService = new TicketService();
