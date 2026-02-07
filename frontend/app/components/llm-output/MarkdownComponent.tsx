'use client';

import { type LLMOutputComponent } from '@llm-ui/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MarkdownComponent: LLMOutputComponent = ({ blockMatch }) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{blockMatch.output}</ReactMarkdown>
    </div>
  );
};
