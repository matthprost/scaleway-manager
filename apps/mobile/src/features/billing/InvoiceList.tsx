import { formatMoney, monthAndYear, monthKeyOf } from '@scaleway-manager/core';
import type { Invoice } from '@scaleway-manager/core';
import { EmptyState, ListRow, Section, SectionHeader, Stack, Text } from '@scaleway-manager/ui';
import { useEffect, useRef, useState } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useIsOnline } from '../connectivity/useIsOnline';
import { ActionFailed } from '../errors/ActionFailed';
import { LoadFailed } from '../errors/LoadFailed';
import { useLockState } from '../lock/LockProvider';
import { NoBillingAccess } from './NoBillingAccess';
import type { Invoices } from './useInvoices';

// Scaleway's word for an invoice's state, in plain words; a word the app doesn't know is left out
const STATES: Partial<Record<string, string>> = {
  paid: 'Paid',
  issued: 'Unpaid',
  outdated: 'Outdated',
};

type InvoiceListProps = {
  invoices: Invoices;
  // Something above already says "You're offline": once per screen
  offlineSaidAbove?: boolean;
};

// "Invoices", then one row per invoice: tapping one downloads its PDF and hands it to the phone's share sheet.
export function InvoiceList({ invoices, offlineSaidAbove = false }: InvoiceListProps) {
  const { mode, invoices: source, files } = useServices();
  const isOnline = useIsOnline();
  const { locked, decided } = useLockState();
  // The invoice being opened: one at a time
  const [opening, setOpening] = useState<string | null>(null);
  // Why the last tap opened nothing: its quiet line shows above the rows
  const [failure, setFailure] = useState<string | null>(null);
  // Whether a PDF arriving now may open the share sheet: not once the list is gone (signed out), and not while the
  // lock covers the app (the share sheet is its own window, above the lock screen)
  const mayShare = useRef(false);
  const { list, error, retry } = invoices;

  useEffect(() => {
    mayShare.current = !locked && decided;

    return () => {
      mayShare.current = false;
    };
  }, [locked, decided]);

  const open = async (invoice: Invoice) => {
    if (opening !== null) {
      return;
    }

    // The demo has no real PDF to share: say so at once, rather than a spinner that leads nowhere
    if (mode === 'demo') {
      setFailure("Invoices aren't available in the demo.");

      return;
    }

    setOpening(invoice.id);
    setFailure(null);
    try {
      const pdf = await source.downloadPdf(invoice.id);

      if (mayShare.current) {
        await files.sharePdf(pdf.fileName, pdf.base64);
      }
    } catch {
      setFailure("Couldn't open the invoice. Please try again.");
    } finally {
      setOpening(null);
    }
  };

  return (
    <>
      <SectionHeader title="Invoices" />

      {error?.kind === 'forbidden' ? (
        <NoBillingAccess />
      ) : error !== null ? (
        <LoadFailed title="Couldn't load your invoices" onRetry={retry} offlineSaidAbove={offlineSaidAbove} />
      ) : list === undefined ? (
        <Section loading />
      ) : list.length === 0 ? (
        <EmptyState icon="file" title="No invoices yet" />
      ) : (
        <Stack gap="xs">
          {/* By the newest invoices, not below a long list */}
          {failure === null ? null : <ActionFailed message={failure} />}

          <Section>
            {list.map((invoice) => {
              const state = STATES[invoice.state.toLowerCase()];

              return (
                <ListRow
                  key={invoice.id}
                  icon="file"
                  title={monthAndYear(monthKeyOf(new Date(invoice.periodStart)))}
                  subtitle={state === undefined ? `Invoice ${invoice.number}` : `Invoice ${invoice.number} · ${state}`}
                  trailing={{ type: 'text', text: formatMoney(invoice.totalUntaxed) }}
                  onPress={() => void open(invoice)}
                  loading={opening === invoice.id}
                  // While one opens, the others wait
                  disabled={!isOnline || (opening !== null && opening !== invoice.id)}
                />
              );
            })}
          </Section>

          {isOnline || offlineSaidAbove ? null : (
            <Text variant="caption" tone="muted">
              {"You're offline"}
            </Text>
          )}
        </Stack>
      )}
    </>
  );
}
