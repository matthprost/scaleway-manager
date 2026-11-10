import { addMoney, moneyFromScaleway, zeroMoney } from '@scaleway-manager/core';
import type { InvoicesPort, Money, SpendingPort } from '@scaleway-manager/core';

import type { ScalewayHttp } from './http';
import { PAGE_SIZE, paginate } from './paginate';

type ScalewayMoney = { currency_code: string; units: number | string; nanos: number };

type ConsumptionsResponse = {
  consumptions: { project_id: string; product_name: string; value: ScalewayMoney }[];
  total_count: number;
  // In currency units, e.g. 4.5 for €4.50.
  total_discount_untaxed_value?: number;
};

type InvoicesResponse = {
  invoices: {
    id: string;
    number: number;
    start_date: string;
    // Null or missing on a draft.
    issued_date?: string | null;
    total_untaxed: ScalewayMoney;
    state: string;
  }[];
};

type DownloadResponse = { name: string; content: string };

type Sum = { units: number; nanos: number };

// Adds a line to its sum exactly: lines are often under a cent, so a sum is rounded only once, at the end.
const add = (sums: Map<string, Sum>, key: string, value: ScalewayMoney) => {
  const sum = sums.get(key) ?? { units: 0, nanos: 0 };
  sums.set(key, { units: sum.units + Number(value.units), nanos: sum.nanos + value.nanos });
};

export const createScalewayBilling = (deps: { http: ScalewayHttp }): SpendingPort & InvoicesPort => ({
  async getMonth(organizationId, month) {
    let discount = 0;
    const lines = await paginate(async (page) => {
      const data = await deps.http.request<ConsumptionsResponse>(
        'GET',
        `/billing/v2beta1/consumptions?organization_id=${organizationId}&billing_period=${month}&page_size=${PAGE_SIZE}&page=${page}`,
      );
      // Every page repeats the month's discount: keep the first one.
      if (page === 1) {
        discount = data.total_discount_untaxed_value ?? 0;
      }

      return { items: data.consumptions, total: data.total_count };
    });

    const currency = lines[0]?.value.currency_code ?? 'EUR';

    // Every line counts for its product, its project, and its product within that project
    const products = new Map<string, Sum>();
    const projects = new Map<string, Sum>();
    const projectProducts = new Map<string, Map<string, Sum>>();
    for (const line of lines) {
      add(products, line.product_name, line.value);
      add(projects, line.project_id, line.value);
      const inProject = projectProducts.get(line.project_id) ?? new Map<string, Sum>();
      add(inProject, line.product_name, line.value);
      projectProducts.set(line.project_id, inProject);
    }

    // Rounded once, largest first. What rounds to €0.00 is left out; it doesn't change the total.
    const rounded = (sums: Map<string, Sum>): [string, Money][] =>
      [...sums]
        .map(([key, sum]): [string, Money] => [key, moneyFromScaleway({ currency_code: currency, ...sum })])
        .filter(([, amount]) => amount.minor !== 0)
        .sort(([, a], [, b]) => b.minor - a.minor);
    const productsOf = (sums: Map<string, Sum>) => rounded(sums).map(([product, amount]) => ({ product, amount }));

    const byProduct = productsOf(products);
    const byProject = rounded(projects).map(([projectId, amount]) => ({
      projectId,
      amount,
      byProduct: productsOf(projectProducts.get(projectId) ?? new Map()),
    }));
    const spent = byProduct.reduce((total, p) => addMoney(total, p.amount), zeroMoney(currency));

    // A discount always lowers the total, whatever sign Scaleway gives it, but never below zero.
    const discountMinor = Math.round(Math.abs(discount) * 100);

    return {
      month,
      total: { minor: Math.max(0, spent.minor - discountMinor), currency },
      byProduct,
      byProject,
      discount: { minor: discountMinor, currency },
    };
  },

  async list(organizationId) {
    // One page of 24 is enough: two years of monthly invoices.
    const data = await deps.http.request<InvoicesResponse>(
      'GET',
      `/billing/v2beta1/invoices?organization_id=${organizationId}&order_by=start_date_desc&page_size=24`,
    );

    // Drafts (no issued date yet) are left out.
    return data.invoices.flatMap((invoice) =>
      invoice.issued_date
        ? [
            {
              id: invoice.id,
              number: invoice.number,
              periodStart: invoice.start_date,
              issuedAt: invoice.issued_date,
              totalUntaxed: moneyFromScaleway(invoice.total_untaxed),
              state: invoice.state,
            },
          ]
        : [],
    );
  },

  async downloadPdf(invoiceId) {
    const file = await deps.http.request<DownloadResponse>(
      'GET',
      `/billing/v2beta1/invoices/${encodeURIComponent(invoiceId)}/download?file_type=pdf`,
    );

    return { fileName: file.name, base64: file.content };
  },
});
