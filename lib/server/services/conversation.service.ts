import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { conversations, messages } from '../db/schema';

export const conversationService = {
  async create(userId: string, title?: string) {
    const [conversation] = await db
      .insert(conversations)
      .values({ userId, title: title ?? 'New Conversation' })
      .returning();
    return conversation;
  },

  async getById(conversationId: string, userId: string) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
    return conversation ?? null;
  },

  async getWithMessages(conversationId: string, userId: string) {
    const conversation = await this.getById(conversationId, userId);
    if (!conversation) return null;

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return { conversation, messages: msgs };
  },

  async listByUser(userId: string) {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  },

  async delete(conversationId: string, userId: string) {
    const deleted = await db
      .delete(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .returning();
    return deleted.length > 0;
  },

  async touch(conversationId: string) {
    await db
      .update(conversations)
      .set({ updatedAt: sql`now()` })
      .where(eq(conversations.id, conversationId));
  },

  async updateTitle(conversationId: string, title: string) {
    await db.update(conversations).set({ title }).where(eq(conversations.id, conversationId));
  },
};
