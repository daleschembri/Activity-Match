import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@activity-match/ui";

interface ActivityOptionsSheetProps {
  open: boolean;
  isHost: boolean;
  onClose: () => void;
  onShare: () => void;
  onEdit?: () => void;
  onManageAttendees?: () => void;
}

export function ActivityOptionsSheet({
  open,
  isHost,
  onClose,
  onShare,
  onEdit,
  onManageAttendees,
}: ActivityOptionsSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const action = (handler: () => void) => {
    onClose();
    handler();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[100] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="menu"
            className="fixed bottom-0 inset-x-0 z-[101] bg-surface rounded-t-2xl px-margin-mobile pt-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="w-10 h-1 rounded-full bg-outline-variant/60 mx-auto mb-4" />
            <ul className="space-y-1">
              {isHost && onEdit && (
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-surface-container-low text-left"
                    onClick={() => action(onEdit)}
                  >
                    <Icon name="edit" className="text-on-surface-variant" />
                    <span className="text-body-md font-medium">Edit details</span>
                  </button>
                </li>
              )}
              {isHost && onManageAttendees && (
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-surface-container-low text-left"
                    onClick={() => action(onManageAttendees)}
                  >
                    <Icon name="group" className="text-on-surface-variant" />
                    <span className="text-body-md font-medium">Manage attendees</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-surface-container-low text-left"
                  onClick={() => action(onShare)}
                >
                  <Icon name="share" className="text-on-surface-variant" />
                  <span className="text-body-md font-medium">Share activity</span>
                </button>
              </li>
            </ul>
            <button
              type="button"
              className="w-full mt-3 py-3.5 rounded-xl text-label-bold text-on-surface-variant hover:bg-surface-container-low"
              onClick={onClose}
            >
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
