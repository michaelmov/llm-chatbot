import { loadHighlighter, type CodeToHtmlOptions } from '@llm-ui/code';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

export const highlighter = loadHighlighter(
  createHighlighterCore({
    langs: [
      import('@shikijs/langs/typescript'),
      import('@shikijs/langs/javascript'),
      import('@shikijs/langs/python'),
      import('@shikijs/langs/bash'),
      import('@shikijs/langs/json'),
      import('@shikijs/langs/html'),
      import('@shikijs/langs/css'),
      import('@shikijs/langs/jsx'),
      import('@shikijs/langs/tsx'),
      import('@shikijs/langs/sql'),
      import('@shikijs/langs/go'),
      import('@shikijs/langs/rust'),
      import('@shikijs/langs/java'),
      import('@shikijs/langs/yaml'),
      import('@shikijs/langs/markdown'),
    ],
    themes: [import('@shikijs/themes/github-dark'), import('@shikijs/themes/github-light')],
    engine: createJavaScriptRegexEngine(),
  }),
);

export const codeToHtmlDark: CodeToHtmlOptions = {
  theme: 'github-dark',
};

export const codeToHtmlLight: CodeToHtmlOptions = {
  theme: 'github-light',
};
