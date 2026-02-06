import { tool, type ContentAndArtifact } from '@langchain/core/tools';
import { z } from 'zod';
import type { ToolArtifact } from './weather.js';

export const dateTimeTool = tool(
  async (): Promise<ContentAndArtifact> => {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return [formatted, { shouldSummarize: true } as ToolArtifact];
  },
  {
    name: 'get_current_datetime',
    description:
      'Get the current date and time. Use this when users ask about the current date, day, or time.',
    schema: z.object({}),
    responseFormat: 'content_and_artifact',
  }
);
