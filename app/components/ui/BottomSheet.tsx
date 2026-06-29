import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import useViewport from '~/lib/hooks';
import { classNames } from '~/utils/classNames';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;

  /** Optional accessible title; falls back to a visually-hidden generic label. */
  ariaTitle?: string;
}

/**
 * Adaptive sheet: a slide-up sheet anchored to the bottom on mobile, and a centered modal on
 * desktop. Styled to match the rest of the app (depth-2 surface, rounded corners, drag handle on
 * mobile). Built on Radix Dialog so it gets focus trapping, escape-to-close and a backdrop.
 */
export function BottomSheet({ open, onClose, children, ariaTitle = 'Dialog' }: BottomSheetProps) {
  const isSmallViewport = useViewport(1024);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            {isSmallViewport ? (
              <Dialog.Content
                asChild
                forceMount
                aria-describedby={undefined}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <motion.div
                  className={classNames(
                    'fixed bottom-0 left-0 right-0 z-[1001] mx-auto w-full max-w-lg',
                    'bg-bolt-elements-background-depth-2 border-t border-x border-bolt-elements-borderColor',
                    'rounded-t-2xl shadow-2xl',
                    'max-h-[88vh] overflow-y-auto modern-scrollbar',
                    'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
                  )}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                >
                  <Dialog.Title className="sr-only">{ariaTitle}</Dialog.Title>
                  <div className="sticky top-0 flex justify-center pt-2.5 pb-1 bg-bolt-elements-background-depth-2">
                    <div className="h-1 w-10 rounded-full bg-bolt-elements-borderColor" />
                  </div>
                  <div className="px-5 pt-2">{children}</div>
                </motion.div>
              </Dialog.Content>
            ) : (
              <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
                <Dialog.Content
                  asChild
                  forceMount
                  aria-describedby={undefined}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <motion.div
                    className={classNames(
                      'pointer-events-auto w-full max-w-md',
                      'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
                      'rounded-2xl shadow-2xl',
                      'max-h-[85vh] overflow-y-auto modern-scrollbar p-5',
                    )}
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Dialog.Title className="sr-only">{ariaTitle}</Dialog.Title>
                    {children}
                  </motion.div>
                </Dialog.Content>
              </div>
            )}
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
