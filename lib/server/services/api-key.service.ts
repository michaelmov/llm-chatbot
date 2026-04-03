import { eq } from 'drizzle-orm';
import { db } from '../db';
import { userApiKeys } from '../db/schema';
import { encrypt, decrypt } from '../crypto';
import { logger } from '../logger';

export const apiKeyService = {
  async upsert(userId: string, apiKey: string) {
    const { ciphertext, iv, authTag } = encrypt(apiKey);

    const [result] = await db
      .insert(userApiKeys)
      .values({
        userId,
        encryptedApiKey: ciphertext,
        iv,
        authTag,
      })
      .onConflictDoUpdate({
        target: userApiKeys.userId,
        set: {
          encryptedApiKey: ciphertext,
          iv,
          authTag,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: userApiKeys.id,
        createdAt: userApiKeys.createdAt,
        updatedAt: userApiKeys.updatedAt,
      });

    return result;
  },

  async getDecryptedKey(userId: string): Promise<string | null> {
    const [row] = await db.select().from(userApiKeys).where(eq(userApiKeys.userId, userId));

    if (!row) return null;

    try {
      return decrypt(row.encryptedApiKey, row.iv, row.authTag);
    } catch (error) {
      logger.error('Failed to decrypt API key (secret may have rotated)', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  },

  async hasKey(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: userApiKeys.id })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId));

    return !!row;
  },

  async delete(userId: string): Promise<boolean> {
    const deleted = await db
      .delete(userApiKeys)
      .where(eq(userApiKeys.userId, userId))
      .returning();

    return deleted.length > 0;
  },
};
