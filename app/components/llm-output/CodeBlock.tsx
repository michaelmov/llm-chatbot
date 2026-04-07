'use client';

import { useState, useCallback } from 'react';
import { useCodeBlockToHtml, parseCompleteMarkdownCodeBlock } from '@llm-ui/code';
import { type LLMOutputComponent } from '@llm-ui/react';
import { useTheme } from 'next-themes';
import parseHtml from 'html-react-parser';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { highlighter, codeToHtmlDark, codeToHtmlLight } from './highlighter';

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute right-2 top-2"
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy code'}
          >
            {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">{copied ? 'Copied!' : 'Copy'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const CodeBlock: LLMOutputComponent = ({ blockMatch }) => {
  const { resolvedTheme } = useTheme();
  const codeToHtmlOptions = resolvedTheme === 'dark' ? codeToHtmlDark : codeToHtmlLight;

  // Check if the language from the code block is loaded in the highlighter
  const { language } = parseCompleteMarkdownCodeBlock(blockMatch.output);
  const loadedLangs = highlighter.getHighlighter()?.getLoadedLanguages() ?? [];
  const isLanguageSupported = !language || loadedLangs.includes(language);

  const { html, code } = useCodeBlockToHtml({
    markdownCodeBlock: blockMatch.output,
    highlighter,
    codeToHtmlOptions: isLanguageSupported
      ? codeToHtmlOptions
      : { ...codeToHtmlOptions, lang: 'plain' },
  });

  if (!html) {
    return (
      <div className="relative my-4">
        <CopyButton code={code} />
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted py-8 px-4">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="relative my-4 rounded-lg border border-border">
      <CopyButton code={code} />
      <div className="overflow-x-auto [&_pre]:min-w-full [&_pre]:w-fit [&_pre]:py-8 [&_pre]:px-4">
        {parseHtml(html)}
      </div>
    </div>
  );
};
