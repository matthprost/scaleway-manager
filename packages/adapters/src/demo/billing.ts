import { monthKeyOf, monthRange } from '@scaleway-manager/core';
import type { ClockPort, InvoicesPort, Money, SpendingPort } from '@scaleway-manager/core';

import { DEMO_PDF_BASE64 } from './data';

// Oldest to newest, in euros. The last one is the current month.
const TOTALS = [72.1, 78.4, 75.0, 83.2, 88.0, 91.3, 96.1, 104.3, 99.8, 118.6, 141.2, 84.6];

// Instances take the rounding rest so the parts add up exactly.
const SHARES: [string, number][] = [
  ['Kubernetes', 25],
  ['Databases', 13],
  ['Object Storage', 4],
  ['Load Balancer', 3],
];

// Production's part of each product, in percent; Staging takes the rest (the demo workspace's two projects)
const PRODUCTION_SHARES: Record<string, number> = {
  Instances: 70,
  Kubernetes: 80,
  Databases: 100,
  'Object Storage': 60,
  'Load Balancer': 100,
};

const money = (minor: number): Money => ({ minor, currency: 'EUR' });

export const createDemoBilling = (clock: ClockPort): SpendingPort & InvoicesPort => {
  const months = () => monthRange(monthKeyOf(clock.now()), 12);

  return {
    getMonth: async (_organizationId, month) => {
      const total = Math.round((TOTALS[months().indexOf(month)] ?? 0) * 100);
      const others = SHARES.map(([product, share]) => ({
        product,
        amount: money(Math.floor((total * share) / 100)),
      }));
      const rest = others.reduce((sum, part) => sum + part.amount.minor, 0);
      const byProduct = [{ product: 'Instances', amount: money(total - rest) }, ...others];
      // Each product split between the projects, so they add up to the products exactly
      const split = byProduct.map(({ product, amount }) => {
        const production = Math.round((amount.minor * (PRODUCTION_SHARES[product] ?? 100)) / 100);

        return { product, production, staging: amount.minor - production };
      });
      const project = (projectId: string, amountOf: (part: (typeof split)[number]) => number) => {
        const products = split
          .map((part) => ({ product: part.product, amount: money(amountOf(part)) }))
          .filter((part) => part.amount.minor > 0)
          .sort((a, b) => b.amount.minor - a.amount.minor);

        return {
          projectId,
          amount: money(products.reduce((sum, part) => sum + part.amount.minor, 0)),
          byProduct: products,
        };
      };

      return {
        month,
        total: money(total),
        byProduct,
        byProject: [
          project('demo-prod', (part) => part.production),
          project('demo-staging', (part) => part.staging),
        ].sort((a, b) => b.amount.minor - a.amount.minor),
        discount: money(0),
      };
    },

    list: async () => {
      const past = months().slice(0, 11);

      return past
        .map((month, index) => {
          const [year = 0, number = 1] = month.split('-').map(Number);

          return {
            id: `demo-invoice-${month}`,
            number: year * 1000 + number,
            periodStart: new Date(Date.UTC(year, number - 1, 1)).toISOString(),
            issuedAt: new Date(Date.UTC(year, number, 2)).toISOString(),
            totalUntaxed: money(Math.round((TOTALS[index] ?? 0) * 100)),
            state: 'paid',
          };
        })
        .reverse();
    },

    downloadPdf: async (invoiceId) => ({
      fileName: `${invoiceId}.pdf`,
      base64: DEMO_PDF_BASE64,
    }),
  };
};
