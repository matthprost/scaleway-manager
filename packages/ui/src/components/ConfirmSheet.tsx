import { Sheet } from './Sheet';
import type { SheetVisibility } from './Sheet';

type ConfirmSheetProps = {
  visible: SheetVisibility;
  // Names the resource: "Reboot web-prod-1?"
  title: string;
  // What will happen, in one plain sentence
  message: string;
  // The action's verb: "Reboot", never "OK"
  confirmLabel: string;
  // While the action runs: a spinner on the confirm button, and nothing can be pressed
  busy?: boolean;
  // The verb is off, and these words say why under the buttons ("You're offline")
  disabledReason?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Asks before an action that stops, restarts, replaces or deletes something. From a sheet, use Sheet `confirm` instead.
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  busy = false,
  disabledReason,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Sheet
      visible={visible}
      title={title}
      onClose={onCancel}
      confirm={{ title, message, confirmLabel, busy, disabledReason, onConfirm, onCancel }}
    >
      {null}
    </Sheet>
  );
}
