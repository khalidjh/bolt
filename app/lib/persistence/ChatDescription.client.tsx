import { useStore } from '@nanostores/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useEditChatDescription } from '~/lib/hooks';
import { description as descriptionStore } from '~/lib/persistence';
import { openShareSheet, openPublishSheet } from '~/lib/stores/sheets';
import { classNames } from '~/utils/classNames';

const pillClasses = classNames(
  'inline-flex items-center gap-1.5 max-w-full px-4 py-1.5 rounded-full text-sm font-medium',
  'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 shadow-sm',
  'text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-colors',
);

// Desktop title: bold text + chevron, no pill chrome (matches the Lovable top-left layout).
const bareClasses = classNames(
  'inline-flex items-center gap-1 text-[15px] font-semibold rounded-md px-1 -mx-1 py-0.5',
  'bg-transparent hover:bg-transparent focus:bg-transparent outline-none',
  'text-bolt-elements-textPrimary transition-colors',
);

interface ChatDescriptionProps {
  /** 'pill' (mobile, default) renders the bordered pill; 'bare' renders bold title text only. */
  variant?: 'pill' | 'bare';

  /** Dropdown menu alignment relative to the trigger. */
  align?: 'start' | 'center' | 'end';
}

export function ChatDescription({ variant = 'pill', align = 'center' }: ChatDescriptionProps) {
  const initialDescription = useStore(descriptionStore)!;

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentDescription, toggleEditMode } =
    useEditChatDescription({
      initialDescription,
      syncWithGlobalStore: true,
    });

  if (!initialDescription) {
    // doing this to prevent showing edit button until chat description is set
    return null;
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center justify-center">
        <input
          type="text"
          className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded-full border border-bolt-elements-borderColor px-3 py-1 mr-2 text-sm w-fit"
          autoFocus
          value={currentDescription}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{ width: `${Math.max(currentDescription.length * 8, 100)}px` }}
        />
        <button
          type="submit"
          aria-label="Save title"
          className="i-ph:check-bold scale-110 text-bolt-elements-textSecondary hover:text-bolt-elements-item-contentAccent"
          onMouseDown={handleSubmit}
        />
      </form>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={variant === 'bare' ? bareClasses : pillClasses}>
        <span className={variant === 'bare' ? 'whitespace-nowrap' : 'truncate min-w-0'}>{currentDescription}</span>
        <span className="i-ph:caret-down text-xs shrink-0 text-bolt-elements-textSecondary" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className={classNames(
            'min-w-[200px] z-[250] py-1',
            'bg-bolt-elements-background-depth-2 rounded-xl shadow-lg',
            'border border-bolt-elements-borderColor',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          <MenuItem icon="i-ph:pencil-simple" label="Rename" onSelect={toggleEditMode} />
          <MenuItem icon="i-ph:export" label="Share project" onSelect={openShareSheet} />
          <MenuItem icon="i-ph:rocket-launch" label="Publish" onSelect={openPublishSheet} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuItem({ icon, label, onSelect }: { icon: string; label: string; onSelect: () => void }) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className="cursor-pointer flex items-center gap-2.5 mx-1 px-3 py-2 rounded-lg text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive outline-none"
    >
      <span className={classNames(icon, 'text-base text-bolt-elements-textSecondary')} />
      {label}
    </DropdownMenu.Item>
  );
}
