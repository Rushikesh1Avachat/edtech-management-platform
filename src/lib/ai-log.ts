import { db } from '@/db';
import { aiLogs } from '@/db/schema';

interface LogAiUsageInput {
  userId?: string;
  promptType: string;
  promptText: string;
  responseContent: unknown;
}

export async function logAiUsage({
  userId,
  promptType,
  promptText,
  responseContent,
}: LogAiUsageInput) {
  try {
    await db.insert(aiLogs).values({
      userId: userId || null,
      promptType,
      promptText,
      responseContent: typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent),
    });
  } catch (error) {
    console.warn('AI usage log could not be saved:', error);
  }
}
