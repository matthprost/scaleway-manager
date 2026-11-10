import { ConfirmSheet } from '@scaleway-manager/ui';
import type { SheetConfirm } from '@scaleway-manager/ui';
import { onlineManager } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useIsOnline } from '../connectivity/useIsOnline';
import { failureWords } from '../errors/failureWords';
import { useToast } from '../feedback/useToast';
import { useSheetVisible } from '../lock/useSheetVisible';
import { useResourceDetail } from './DetailScreen';

// What an action asks first, naming the resource: "Reboot web-prod-1?", one plain sentence, the verb
export type ActionQuestion = { title: string; message: string; confirmLabel: string };

export type ActionSpec<Key extends string> = {
  // Which action: its ActionGrid button spins while it runs
  key: Key;
  // Asked first for anything that stops, restarts, replaces or redeploys something, and Run now
  confirm?: ActionQuestion;
  // Said once it worked: "Reboot requested"
  toast: string;
  // Sends it, once, right away: never kept for later
  perform: () => Promise<void>;
  // false: nothing to watch afterwards (a backup leaves the status as it is): the resource and its list are asked
  // again once, without polling. Default true
  poll?: boolean;
};

export type ResourceAction<Key extends string> = {
  run: (spec: ActionSpec<Key>) => void;
  // The action that runs (ActionGrid busyKey): every other one waits
  running: Key | null;
  busy: boolean;
  // ActionGrid disabledReason: "You're offline", or nothing
  disabledReason: string | undefined;
  // The last action failed: which one, and the quiet failure line's words (ActionFailed under the grid, or under the
  // button of the sheet that sent it)
  failure: { key: Key; message: string } | null;
  // The question, for a screen to draw (a ConfirmSheet)
  sheet: ReactNode;
  // The same question, for a sheet to show as its own confirm step (a sheet can't open a sheet); null when none
  confirm: SheetConfirm | null;
};

type Asked<Key extends string> = { spec: ActionSpec<Key>; question: ActionQuestion; open: boolean };

type QuestionSheetProps = {
  question: ActionQuestion;
  open: boolean;
  busy: boolean;
  disabledReason: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
};

// The question from a screen: a sheet of its own, so its visibility comes from the lock-aware hook
function QuestionSheet({ question, open, ...answer }: QuestionSheetProps) {
  const visible = useSheetVisible(open);

  return <ConfirmSheet visible={visible} {...question} {...answer} />;
}

// A resource's actions, inside its DetailScreen: one at a time, asked first when they need it, refused offline (never
// queued), then the toast, the refresh and (unless `poll: false`) the polling. A failure is the quiet line, never a
// toast, and the resource is asked again.
export function useResourceAction<Key extends string = string>(): ResourceAction<Key> {
  const { mode } = useServices();
  const isOnline = useIsOnline();
  const toast = useToast();
  const { acted, failed } = useResourceDetail();
  // The question asked last: it stays drawn while its sheet slides away
  const [asked, setAsked] = useState<Asked<Key> | null>(null);
  const [running, setRunning] = useState<Key | null>(null);
  const [failure, setFailure] = useState<{ key: Key; message: string } | null>(null);
  // Set at the tap, before anything waits: a second tap in the same frame sends nothing
  const sending = useRef(false);

  // Asked at the tap itself, so nothing waits for the network to come back (the demo ignores the network)
  const online = () => mode === 'demo' || onlineManager.isOnline();

  const close = () => setAsked((current) => (current === null ? null : { ...current, open: false }));

  const send = async (spec: ActionSpec<Key>) => {
    if (sending.current) {
      return;
    }
    if (!online()) {
      close();

      return;
    }
    sending.current = true;
    setRunning(spec.key);
    setFailure(null);
    try {
      await spec.perform();
      close();
      toast(spec.toast);
      acted({ follow: spec.poll !== false });
    } catch (error) {
      const message = failureWords(error);
      close();
      // The session ended: nothing to say, the app goes back to Welcome
      setFailure(message === null ? null : { key: spec.key, message });
      // It may still have reached Scaleway (a timeout): show what the resource does now before anyone tries again
      if (message !== null) {
        failed();
      }
    } finally {
      sending.current = false;
      setRunning(null);
    }
  };

  const run = (spec: ActionSpec<Key>) => {
    if (sending.current || asked?.open === true || !online()) {
      return;
    }
    if (spec.confirm === undefined) {
      void send(spec);

      return;
    }
    setAsked({ spec, question: spec.confirm, open: true });
  };

  const disabledReason = isOnline ? undefined : "You're offline";

  return {
    run,
    running,
    busy: running !== null,
    disabledReason,
    failure,
    sheet:
      asked === null ? null : (
        <QuestionSheet
          question={asked.question}
          open={asked.open}
          busy={running !== null}
          disabledReason={disabledReason}
          onConfirm={() => void send(asked.spec)}
          onCancel={close}
        />
      ),
    confirm:
      asked?.open === true
        ? {
            ...asked.question,
            busy: running !== null,
            disabledReason,
            onConfirm: () => void send(asked.spec),
            onCancel: close,
          }
        : null,
  };
}
