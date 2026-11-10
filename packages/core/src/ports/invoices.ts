import type { Invoice } from '../domain/invoices';

export type InvoicesPort = {
  list(organizationId: string): Promise<Invoice[]>;
  downloadPdf(invoiceId: string): Promise<{ fileName: string; base64: string }>;
};
