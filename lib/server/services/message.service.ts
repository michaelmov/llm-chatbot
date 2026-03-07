import { eq } from 'drizzle-orm';
import { db } from '../db';
import { messages, type NewMessage } from '../db/schema';

export const messageService = {
  async create(data: NewMessage) {
    const [message] = await db.insert(messages).values(data).returning();
    return message;
  },

  async getByConversationId(conversationId: string) {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  },
};
