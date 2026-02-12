import { randomUUID } from 'crypto';

interface TicketEntry {
  userId: string;
  createdAt: number;
}

const TICKET_TTL_MS = 30_000;
const CLEANUP_INTERVAL_MS = 10_000;

class TicketService {
  private tickets = new Map<string, TicketEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  create(userId: string): string {
    const ticket = randomUUID();
    this.tickets.set(ticket, { userId, createdAt: Date.now() });
    return ticket;
  }

  validate(ticket: string): string | null {
    const entry = this.tickets.get(ticket);
    if (!entry) return null;

    this.tickets.delete(ticket);

    if (Date.now() - entry.createdAt > TICKET_TTL_MS) return null;

    return entry.userId;
  }

  startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [ticket, entry] of this.tickets) {
        if (now - entry.createdAt > TICKET_TTL_MS) {
          this.tickets.delete(ticket);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const ticketService = new TicketService();
