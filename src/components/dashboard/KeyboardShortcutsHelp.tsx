"use client";

import { useEffect, useRef } from "react";
import X from "lucide-react/dist/esm/icons/x.mjs";
import { ghBtnSecondary } from "@/lib/interactive-classes";

export const KEYBOARD_SHORTCUTS = [
  { keys: ["/"], description: "Focus username search" },
  { keys: ["g", "h"], description: "Go to homepage" },
  { keys: ["r"], description: "Refresh dashboard data" },
  { keys: ["d"], description: "Toggle dark / light mode" },
  { keys: ["e"], description: "Export dashboard data" },
  { keys: ["?"], description: "Show or hide this help panel" },
] as const;

type KeyboardShortcutsHelpProps = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="no-print mx-4 w-full max-w-md rounded-card border border-gh-gray-2 bg-gh-surface p-0 text-gh-gray-7 shadow-xl backdrop:bg-black/40"
      aria-labelledby="keyboard-shortcuts-title"
      aria-describedby="keyboard-shortcuts-desc"
    >
      <div className="flex items-start justify-between gap-3 border-b border-gh-gray-2 px-4 py-4">
        <div>
          <h2 id="keyboard-shortcuts-title" className="text-gh-h2 text-gh-gray-7">
            Keyboard shortcuts
          </h2>
          <p id="keyboard-shortcuts-desc" className="mt-1 text-gh-muted">
            Power-user shortcuts for the dashboard. Disabled while typing in a field.
          </p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className={`${ghBtnSecondary} tap-target-mobile h-8 w-8 shrink-0 p-0 text-gh-gray-6`}
          aria-label="Close keyboard shortcuts"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <ul className="divide-y divide-gh-gray-2 px-4 py-2">
        {KEYBOARD_SHORTCUTS.map((shortcut) => (
          <li
            key={shortcut.description}
            className="flex items-center justify-between gap-4 py-3 text-gh-body"
          >
            <span className="text-gh-gray-6">{shortcut.description}</span>
            <span className="flex shrink-0 items-center gap-1">
              {shortcut.keys.map((key, index) => (
                <span key={`${shortcut.description}-${key}-${index}`} className="flex items-center gap-1">
                  {index > 0 ? (
                    <span className="text-gh-muted" aria-hidden>
                      then
                    </span>
                  ) : null}
                  <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-gh-gray-2 bg-gh-gray-0 px-1.5 py-0.5 text-gh-mono font-medium text-gh-gray-7">
                    {key}
                  </kbd>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-gh-gray-2 px-4 py-3">
        <p className="text-gh-muted">
          Press <kbd className="rounded border border-gh-gray-2 bg-gh-gray-0 px-1 text-gh-mono">Esc</kbd>{" "}
          or <kbd className="rounded border border-gh-gray-2 bg-gh-gray-0 px-1 text-gh-mono">?</kbd> to
          close.
        </p>
      </div>
    </dialog>
  );
}
