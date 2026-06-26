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
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const wordTimer = setInterval(() => setWord((prev) => pickWord(prev)), 2200);
    const secTimer = setInterval(() => setSeconds((s) => s + 1), 1000);

    return () => {
      clearInterval(wordTimer);
      clearInterval(secTimer);
    };
  }, []);

  return (
    <div className={classNames('flex items-center gap-2 mt-4 select-none', className)}>
      <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-item-contentAccent text-lg" />
      <span
        key={word}
        className="text-sm font-medium animate-fade-in bg-gradient-to-r from-accent-500 to-accent-400 bg-clip-text text-transparent"
      >
        {word}…
      </span>
      {seconds > 0 && <span className="text-xs text-bolt-elements-textTertiary tabular-nums">{seconds}s</span>}
    </div>
  );
}
