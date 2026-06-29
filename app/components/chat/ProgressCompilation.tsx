import { motion } from 'framer-motion';
import { useStore } from '@nanostores/react';
import React from 'react';
import type { ProgressAnnotation } from '~/types/context';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';

export default function ProgressCompilation({ data }: { data?: ProgressAnnotation[] }) {
  const [progressList, setProgressList] = React.useState<ProgressAnnotation[]>([]);
  const previews = useStore(workbenchStore.previews);
  const hasPreview = previews.length > 0;
  React.useEffect(() => {
    if (!data || data.length == 0) {
      setProgressList([]);
      return;
    }

    const progressMap = new Map<string, ProgressAnnotation>();
    data.forEach((x) => {
      const existingProgress = progressMap.get(x.label);

      if (existingProgress && existingProgress.status === 'complete') {
        return;
      }

      progressMap.set(x.label, x);
    });

    const newData = Array.from(progressMap.values());
    newData.sort((a, b) => a.order - b.order);
    setProgressList(newData);
  }, [data]);

  if (progressList.length === 0) {
    return <></>;
  }

  const latest = progressList[progressList.length - 1];

  /*
   * The model emits a final "complete" step as soon as it finishes writing, but the app isn't
   * usable until the dev server boots and a live preview is available. Keep the indicator in an
   * active state until then, so we don't signal "done" while npm install / dev is still running.
   */
  const display: ProgressAnnotation =
    latest.status === 'complete' && !hasPreview
      ? { ...latest, status: 'in-progress', message: 'Getting your preview ready…' }
      : latest;

  return (
    <div className="w-full max-w-chat mx-auto px-1">
      <ProgressItem progress={display} />
    </div>
  );
}

const ProgressItem = ({ progress }: { progress: ProgressAnnotation }) => {
  const isComplete = progress.status === 'complete';

  return (
    <motion.div
      className={classNames('flex items-center gap-2 pl-1 select-none')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Match the "thinking" indicator: spinning Etlaq star while working, a check once done.
          The mark grows past its box while spinning, so keep horizontal room (overflow-visible). */}
      {isComplete ? (
        <span className="i-ph:check-bold text-sm shrink-0 text-bolt-elements-icon-success" />
      ) : (
        <span className="inline-flex shrink-0 overflow-visible">
          <img src="/etlaq-mark.svg" alt="" aria-hidden className="etlaq-mark-thinking w-4 h-4" />
        </span>
      )}
      <span
        className={classNames(
          'text-sm font-medium',
          isComplete ? 'text-bolt-elements-textSecondary' : 'thinking-shimmer',
        )}
      >
        {progress.message}
      </span>
    </motion.div>
  );
};
