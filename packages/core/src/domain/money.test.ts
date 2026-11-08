import { addMoney, formatMoney, moneyFromScaleway, zeroMoney } from './money';

describe('money', () => {
  it('moneyFromScaleway converts units and nanos', () => {
    expect(moneyFromScaleway({ currency_code: 'EUR', units: 84, nanos: 600000000 })).toEqual({
      minor: 8460,
      currency: 'EUR',
    });
  });

  it('moneyFromScaleway accepts units as a string', () => {
    expect(moneyFromScaleway({ currency_code: 'EUR', units: '3', nanos: 50000000 }).minor).toBe(305);
  });

  it('moneyFromScaleway rounds nanos to the nearest cent', () => {
    expect(moneyFromScaleway({ currency_code: 'EUR', units: 0, nanos: 5_000_000 }).minor).toBe(1);
    expect(moneyFromScaleway({ currency_code: 'EUR', units: 0, nanos: 4_000_000 }).minor).toBe(0);
  });

  it('moneyFromScaleway never returns negative zero', () => {
    expect(moneyFromScaleway({ currency_code: 'EUR', units: 0, nanos: -1 })).toEqual({
      minor: 0,
      currency: 'EUR',
    });
  });

  it('formatMoney shows euros', () => {
    expect(formatMoney({ minor: 8460, currency: 'EUR' })).toBe('€84.60');
  });

  it('addMoney sums amounts', () => {
    expect(addMoney({ minor: 100, currency: 'EUR' }, { minor: 250, currency: 'EUR' }).minor).toBe(350);
  });

  it('addMoney throws on mixed currencies', () => {
    expect(() => addMoney({ minor: 1, currency: 'EUR' }, { minor: 1, currency: 'USD' })).toThrow();
  });

  it('zeroMoney is zero in the given currency', () => {
    expect(zeroMoney('EUR')).toEqual({ minor: 0, currency: 'EUR' });
  });
});
