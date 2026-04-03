import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '../config';
import { logger } from '../logger';

const SYSTEM_PROMPT = `Generate a short title (2-6 words) for this conversation. Rules:
- Sentence case (capitalize first word only)
- No quotes, no trailing punctuation
- Be specific and descriptive
- Output ONLY the title, nothing else`;

const MAX_CHARS = 500;

function truncate(text: string): string {
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '...' : text;
}

export async function generateTitle(
  userMessage: string,
  assistantMessage: string,
  apiKey: string
): Promise<string> {
  try {
    const model = new ChatAnthropic({
      modelName: config.titleModel.name,
      maxTokens: config.titleModel.maxTokens,
      temperature: config.titleModel.temperature,
      anthropicApiKey: apiKey,
    });

    const response = await model.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(
        `User: ${truncate(userMessage)}\n\nAssistant: ${truncate(assistantMessage)}`
      ),
    ]);

    const title =
      typeof response.content === 'string'
        ? response.content.trim()
        : Array.isArray(response.content)
          ? response.content
              .filter((b) => b.type === 'text')
              .map((b) => ('text' in b ? b.text : ''))
              .join('')
              .trim()
          : '';

    if (!title || title.length > 100) {
      return '';
    }

    logger.info('Generated conversation title', { title });
    return title;
  } catch (error) {
    logger.error('Failed to generate title', {
      error: error instanceof Error ? error.message : error,
    });
    return '';
  }
}
