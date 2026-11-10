export type Money = { minor: number; currency: string };

export function moneyFromScaleway(v: {
  currency_code: string;
  units: number | string;
  nanos: number;
}): Money {
  return {
    minor: Number(v.units) * 100 + Math.round(v.nanos / 10_000_000) || 0,
    currency: v.currency_code,
  };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add ${a.currency} and ${b.currency}`);
  }

  return { minor: a.minor + b.minor, currency: a.currency };
}

export function zeroMoney(currency: string): Money {
  return { minor: 0, currency };
}

export function formatMoney(m: Money): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: m.currency }).format(
    m.minor / 100,
  );
}
