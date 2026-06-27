import { useEffect, useState } from 'react';
import { classNames } from '~/utils/classNames';

/**
 * Whimsical, ever-changing status verbs shown while Etlaq is working — gives the
 * user a sense that something is happening instead of a bare loading animation.
 */
const THINKING_WORDS = [
  'Thinking',
  'Pondering',
  'Conjuring',
  'Brewing',
  'Tinkering',
  'Synthesizing',
  'Crafting',
  'Architecting',
  'Composing',
  'Computing',
  'Assembling',
  'Untangling',
  'Noodling',
  'Percolating',
  'Wrangling',
  'Sketching',
  'Plotting',
  'Spinning up',
  'Reticulating',
  'Cooking',
];

function pickWord(exclude?: string) {
  let word = exclude;

  while (word === exclude) {
    word = THINKING_WORDS[Math.floor(Math.random() * THINKING_WORDS.length)];
  }

  return word as string;
}

export function ThinkingIndicator({ className }: { className?: string }) {
  const [word, setWord] = useState(() => THINKING_WORDS[0]);

  useEffect(() => {
    const wordTimer = setInterval(() => setWord((prev) => pickWord(prev)), 2200);

    return () => clearInterval(wordTimer);
  }, []);

  return (
    <div className={classNames('flex items-center gap-2 mt-4 select-none', className)}>
      <img src="/etlaq-mark.svg" alt="" aria-hidden className="etlaq-mark-thinking w-4 h-4 shrink-0" />
      <span className="thinking-shimmer text-sm font-medium">{word}…</span>
    </div>
  );
}
