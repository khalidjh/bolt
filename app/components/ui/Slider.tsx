import { motion } from 'framer-motion';
import { memo } from 'react';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { genericMemo } from '~/utils/react';

type SliderOption<T> = { value: T; text: string; icon?: string };

export type SliderOptions<T> = {
  left: SliderOption<T>;
  middle?: SliderOption<T>;
  right: SliderOption<T>;
};

interface SliderProps<T> {
  selected: T;
  options: SliderOptions<T>;
  setSelected?: (selected: T) => void;
}

export const Slider = genericMemo(<T,>({ selected, options, setSelected }: SliderProps<T>) => {
  const hasMiddle = !!options.middle;
  const isLeftSelected = selected === options.left.value;
  const isMiddleSelected = hasMiddle && options.middle ? selected === options.middle.value : false;

  return (
    <div className="flex items-center shrink-0 gap-1 rounded-full p-1 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor shadow-sm">
      <SliderButton
        selected={isLeftSelected}
        icon={options.left.icon}
        label={options.left.text}
        setSelected={() => setSelected?.(options.left.value)}
      />

      {options.middle && (
        <SliderButton
          selected={isMiddleSelected}
          icon={options.middle.icon}
          label={options.middle.text}
          setSelected={() => setSelected?.(options.middle!.value)}
        />
      )}

      <SliderButton
        selected={!isLeftSelected && !isMiddleSelected}
        icon={options.right.icon}
        label={options.right.text}
        setSelected={() => setSelected?.(options.right.value)}
      />
    </div>
  );
});

interface SliderButtonProps {
  selected: boolean;
  icon?: string;
  label: string;
  setSelected: () => void;
}

// Selected tab shows icon + label inside a solid accent pill; inactive tabs collapse to icon-only
// with no background (Lovable-style).
const SliderButton = memo(({ selected, icon, label, setSelected }: SliderButtonProps) => {
  return (
    <button
      onClick={setSelected}
      title={label}
      aria-label={label}
      className={classNames(
        'relative inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-full transition-all duration-150',
        'bg-transparent',
        selected
          ? 'text-white px-3.5 py-1'
          : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary px-2 py-1',
      )}
    >
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {icon && <span className={classNames(icon, 'text-base')} />}
        {selected && <span>{label}</span>}
      </span>
      {selected && (
        <motion.span
          layoutId="pill-tab"
          transition={{ duration: 0.2, ease: cubicEasingFn }}
          className="absolute inset-0 z-0 rounded-full bg-accent-500 shadow-sm"
        ></motion.span>
      )}
    </button>
  );
});
