'use client';

import { useCodeBlockToHtml, parseCompleteMarkdownCodeBlock } from '@llm-ui/code';
import { type LLMOutputComponent } from '@llm-ui/react';
import { useTheme } from 'next-themes';
import parseHtml from 'html-react-parser';
import { highlighter, codeToHtmlDark, codeToHtmlLight } from './highlighter';

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
      <pre className="my-4 overflow-x-auto rounded-lg border border-border bg-muted p-4">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border [&_pre]:p-4">
      {parseHtml(html)}
    </div>
  );
};
