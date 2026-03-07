'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/spinner';

const LLMOutputRenderer = dynamic(
  () => import('./LLMOutputRenderer').then((mod) => mod.LLMOutputRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-2">
        <Spinner />
      </div>
    ),
  }
);

interface LLMOutputDynamicProps {
  content: string;
  isStreamFinished: boolean;
}

export function LLMOutputDynamic({ content, isStreamFinished }: LLMOutputDynamicProps) {
  return <LLMOutputRenderer content={content} isStreamFinished={isStreamFinished} />;
}
