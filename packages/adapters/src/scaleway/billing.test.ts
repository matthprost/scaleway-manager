import { createScalewayBilling } from './billing';
import type { ScalewayHttp } from './http';

const line = (
  product_name: string,
  units: number | string,
  nanos: number,
  currency_code = 'EUR',
  project_id = 'project-1',
) => ({
  project_id,
  product_name,
  value: { currency_code, units, nanos },
});

// A line of the given project, in euros
const lineIn = (project_id: string, product_name: string, units: number, nanos: number) =>
  line(product_name, units, nanos, 'EUR', project_id);

const eur = (minor: number) => ({ minor, currency: 'EUR' });

const consumptionsPath = (page: number) =>
  `/billing/v2beta1/consumptions?organization_id=org-1&billing_period=2026-11&page_size=100&page=${page}`;

test('billing sums every page of consumptions', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce({
      consumptions: Array.from({ length: 100 }, () => line('Instances', 1, 0)),
      total_count: 150,
      total_discount_untaxed_value: 0,
    })
    .mockResolvedValueOnce({
      consumptions: Array.from({ length: 50 }, () => line('Object Storage', 0, 500_000_000)),
      total_count: 150,
      total_discount_untaxed_value: 0,
    });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  const month = await billing.getMonth('org-1', '2026-11');

  expect(month.total).toEqual({ minor: 12500, currency: 'EUR' });
  expect(month.byProduct).toEqual([
    { product: 'Instances', amount: { minor: 10000, currency: 'EUR' } },
    { product: 'Object Storage', amount: { minor: 2500, currency: 'EUR' } },
  ]);
  expect(request.mock.calls).toEqual([
    ['GET', consumptionsPath(1)],
    ['GET', consumptionsPath(2)],
  ]);
});

test('billing groups by product, largest first', async () => {
  const request = jest.fn().mockResolvedValueOnce({
    consumptions: [
      line('Object Storage', 0, 4_000_000),
      line('Instances', '3', 0),
      line('Object Storage', 0, 4_000_000),
      line('Managed Databases', 12, 500_000_000),
      line('Instances', 1, 250_000_000),
    ],
    total_count: 5,
    total_discount_untaxed_value: 0,
  });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  const month = await billing.getMonth('org-1', '2026-11');

  // Two lines under a cent add up to one cent: a product is rounded once, not per line.
  expect(month.byProduct).toEqual([
    { product: 'Managed Databases', amount: { minor: 1250, currency: 'EUR' } },
    { product: 'Instances', amount: { minor: 425, currency: 'EUR' } },
    { product: 'Object Storage', amount: { minor: 1, currency: 'EUR' } },
  ]);
  expect(month.total).toEqual({ minor: 1676, currency: 'EUR' });
});

test("billing applies the month's discount to the total", async () => {
  const page = (discount: number) => ({
    consumptions: [line('Instances', 20, 0), line('Object Storage', 5, 0)],
    total_count: 2,
    total_discount_untaxed_value: discount,
  });
  // The same discount, sent positive then negative.
  const request = jest.fn().mockResolvedValueOnce(page(4.5)).mockResolvedValueOnce(page(-4.5));
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  const month = await billing.getMonth('org-1', '2026-11');

  expect(month.total).toEqual({ minor: 2050, currency: 'EUR' });
  expect(month.discount).toEqual({ minor: 450, currency: 'EUR' });
  expect(month.byProduct).toEqual([
    { product: 'Instances', amount: { minor: 2000, currency: 'EUR' } },
    { product: 'Object Storage', amount: { minor: 500, currency: 'EUR' } },
  ]);
  // Projects are before the discount: Scaleway gives it for the whole organization only
  expect(month.byProject.map((project) => project.amount)).toEqual([eur(2500)]);
  await expect(billing.getMonth('org-1', '2026-11')).resolves.toMatchObject({
    total: { minor: 2050, currency: 'EUR' },
    discount: { minor: 450, currency: 'EUR' },
  });
});

test('billing never shows a total below zero', async () => {
  // A voucher covers the whole month and a bit more.
  const request = jest.fn().mockResolvedValueOnce({
    consumptions: [line('Instances', 9, 990_000_000)],
    total_count: 1,
    total_discount_untaxed_value: 10,
  });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  const month = await billing.getMonth('org-1', '2026-11');

  expect(month.total).toEqual({ minor: 0, currency: 'EUR' });
});

test('billing leaves out products that round to zero', async () => {
  const request = jest.fn().mockResolvedValueOnce({
    consumptions: [
      line('Instances', 3, 0),
      line('Object Storage', 0, 3_000_000),
      line('Flexible IPs', 0, 0),
    ],
    total_count: 3,
    total_discount_untaxed_value: 0,
  });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  await expect(billing.getMonth('org-1', '2026-11')).resolves.toEqual({
    month: '2026-11',
    total: { minor: 300, currency: 'EUR' },
    byProduct: [{ product: 'Instances', amount: { minor: 300, currency: 'EUR' } }],
    byProject: [
      {
        projectId: 'project-1',
        amount: { minor: 300, currency: 'EUR' },
        byProduct: [{ product: 'Instances', amount: { minor: 300, currency: 'EUR' } }],
      },
    ],
    discount: { minor: 0, currency: 'EUR' },
  });
});

test('billing counts a missing discount as zero', async () => {
  const request = jest.fn().mockResolvedValueOnce({
    consumptions: [line('Instances', 7, 250_000_000)],
    total_count: 1,
  });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  const month = await billing.getMonth('org-1', '2026-11');

  expect(month.total).toEqual({ minor: 725, currency: 'EUR' });
  expect(month.discount).toEqual({ minor: 0, currency: 'EUR' });
});

test('billing takes the currency from the lines', async () => {
  const request = jest.fn().mockResolvedValueOnce({
    consumptions: [line('Instances', 4, 0, 'USD'), line('Object Storage', 1, 500_000_000, 'USD')],
    total_count: 2,
    total_discount_untaxed_value: 0.5,
  });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  await expect(billing.getMonth('org-1', '2026-11')).resolves.toEqual({
    month: '2026-11',
    total: { minor: 500, currency: 'USD' },
    byProduct: [
      { product: 'Instances', amount: { minor: 400, currency: 'USD' } },
      { product: 'Object Storage', amount: { minor: 150, currency: 'USD' } },
    ],
    byProject: [
      {
        projectId: 'project-1',
        amount: { minor: 550, currency: 'USD' },
        byProduct: [
          { product: 'Instances', amount: { minor: 400, currency: 'USD' } },
          { product: 'Object Storage', amount: { minor: 150, currency: 'USD' } },
        ],
      },
    ],
    discount: { minor: 50, currency: 'USD' },
  });
});

test('billing returns zero EUR for an empty month', async () => {
  const request = jest
    .fn()
    .mockResolvedValueOnce({ consumptions: [], total_count: 0, total_discount_untaxed_value: 0 });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  await expect(billing.getMonth('org-1', '2026-11')).resolves.toEqual({
    month: '2026-11',
    total: { minor: 0, currency: 'EUR' },
    byProduct: [],
    byProject: [],
    discount: { minor: 0, currency: 'EUR' },
  });
  expect(request.mock.calls).toEqual([['GET', consumptionsPath(1)]]);
});

test('billing sums each project exactly from its lines, largest first, with its own products', async () => {
  const request = jest.fn().mockResolvedValueOnce({
    consumptions: [
      lineIn('p-small', 'Object Storage', 0, 4_000_000),
      lineIn('p-big', 'Instances', 12, 0),
      lineIn('p-small', 'Object Storage', 0, 4_000_000),
      lineIn('p-zero', 'Object Storage', 0, 3_000_000),
      lineIn('p-small', 'Instances', 2, 250_000_000),
      lineIn('p-big', 'Databases', 3, 0),
      lineIn('p-small', 'Object Storage', 0, 4_000_000),
      lineIn('p-big', 'Instances', 0, 500_000_000),
    ],
    total_count: 8,
    total_discount_untaxed_value: 0,
  });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  const month = await billing.getMonth('org-1', '2026-11');

  // Three lines of €0.004 make one cent in p-small; p-zero's €0.003 rounds to €0.00, so it's left out
  expect(month.byProject).toEqual([
    {
      projectId: 'p-big',
      amount: eur(1550),
      byProduct: [
        { product: 'Instances', amount: eur(1250) },
        { product: 'Databases', amount: eur(300) },
      ],
    },
    {
      projectId: 'p-small',
      amount: eur(226),
      byProduct: [
        { product: 'Instances', amount: eur(225) },
        { product: 'Object Storage', amount: eur(1) },
      ],
    },
  ]);
  // The organization's products still count every line (p-zero's too)
  expect(month.byProduct).toEqual([
    { product: 'Instances', amount: eur(1475) },
    { product: 'Databases', amount: eur(300) },
    { product: 'Object Storage', amount: eur(2) },
  ]);
  expect(month.discount).toEqual(eur(0));
});

test('a project is rounded once, not as the sum of its rounded products', async () => {
  const request = jest.fn().mockResolvedValueOnce({
    consumptions: [lineIn('p-1', 'Instances', 0, 6_000_000), lineIn('p-1', 'Object Storage', 0, 6_000_000)],
    total_count: 2,
    total_discount_untaxed_value: 0,
  });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  const month = await billing.getMonth('org-1', '2026-11');

  // €0.006 each: one cent apiece once rounded, but the project spent €0.012
  expect(month.byProject).toEqual([
    {
      projectId: 'p-1',
      amount: eur(1),
      byProduct: [
        { product: 'Instances', amount: eur(1) },
        { product: 'Object Storage', amount: eur(1) },
      ],
    },
  ]);
});

test('invoices map untaxed totals and dates', async () => {
  const request = jest.fn().mockResolvedValueOnce({
    total_count: 2,
    invoices: [
      {
        id: 'inv-2',
        number: 1042,
        start_date: '2026-10-01T00:00:00Z',
        issued_date: '2026-11-02T08:15:00Z',
        total_untaxed: { currency_code: 'EUR', units: 84, nanos: 600_000_000 },
        total_taxed: { currency_code: 'EUR', units: 101, nanos: 520_000_000 },
        state: 'outdated',
      },
      {
        id: 'inv-1',
        number: 987,
        start_date: '2026-09-01T00:00:00Z',
        issued_date: '2026-10-02T08:15:00Z',
        total_untaxed: { currency_code: 'EUR', units: 0, nanos: 0 },
        total_taxed: { currency_code: 'EUR', units: 0, nanos: 0 },
        state: 'paid',
      },
    ],
  });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  await expect(billing.list('org-1')).resolves.toEqual([
    {
      id: 'inv-2',
      number: 1042,
      periodStart: '2026-10-01T00:00:00Z',
      issuedAt: '2026-11-02T08:15:00Z',
      totalUntaxed: { minor: 8460, currency: 'EUR' },
      state: 'outdated',
    },
    {
      id: 'inv-1',
      number: 987,
      periodStart: '2026-09-01T00:00:00Z',
      issuedAt: '2026-10-02T08:15:00Z',
      totalUntaxed: { minor: 0, currency: 'EUR' },
      state: 'paid',
    },
  ]);
  expect(request.mock.calls).toEqual([
    ['GET', '/billing/v2beta1/invoices?organization_id=org-1&order_by=start_date_desc&page_size=24'],
  ]);
});

test('invoices leave out drafts without an issued date', async () => {
  const invoice = (id: string) => ({
    id,
    number: 1043,
    start_date: '2026-11-01T00:00:00Z',
    total_untaxed: { currency_code: 'EUR', units: 12, nanos: 0 },
    state: 'draft',
  });
  const request = jest.fn().mockResolvedValueOnce({
    total_count: 3,
    invoices: [
      { ...invoice('draft-null'), issued_date: null },
      invoice('draft-missing'),
      { ...invoice('inv-3'), issued_date: '2026-11-02T08:15:00Z', state: 'issued' },
    ],
  });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  const invoices = await billing.list('org-1');

  expect(invoices.map((i) => i.id)).toEqual(['inv-3']);
  expect(invoices[0]?.issuedAt).toBe('2026-11-02T08:15:00Z');
});

test('downloadPdf returns the base64 content', async () => {
  const request = jest.fn().mockResolvedValueOnce({
    name: 'scaleway-invoice-1042.pdf',
    content_type: 'application/pdf',
    content: 'JVBERi0xLjQK',
  });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  await expect(billing.downloadPdf('inv-2')).resolves.toEqual({
    fileName: 'scaleway-invoice-1042.pdf',
    base64: 'JVBERi0xLjQK',
  });
  expect(request.mock.calls).toEqual([['GET', '/billing/v2beta1/invoices/inv-2/download?file_type=pdf']]);
});

test('downloadPdf encodes the invoice id in the path', async () => {
  const request = jest.fn().mockResolvedValueOnce({ name: 'a.pdf', content_type: 'application/pdf', content: 'AA==' });
  const billing = createScalewayBilling({ http: { request } as unknown as ScalewayHttp });

  await billing.downloadPdf('a/../b?x=1');

  expect(request.mock.calls).toEqual([['GET', '/billing/v2beta1/invoices/a%2F..%2Fb%3Fx%3D1/download?file_type=pdf']]);
});
