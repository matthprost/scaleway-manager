import { noticeLayout } from './noticeLayout';

describe('noticeLayout', () => {
  it('puts the notice just under the status bar', () => {
    expect(noticeLayout(47, 1).top).toBe(51);
  });

  it('leaves room for the pill and a small gap under it', () => {
    // 4 above, a 24-high pill (16 pt icon, 4 pt padding), 8 below
    expect(noticeLayout(47, 1).clearance).toBe(47 + 4 + 24 + 8);
  });

  it('leaves room for two lines at twice the text size, where the long offline label wraps', () => {
    // Two caption lines of 28 pt (14 pt doubled), plus 4 pt above and below
    expect(noticeLayout(47, 2).clearance).toBe(47 + 4 + 64 + 8);
  });

  it('leaves room for three lines at three times the text size', () => {
    // Three caption lines of 42 pt, plus 4 pt above and below
    expect(noticeLayout(47, 3).clearance).toBe(47 + 4 + 134 + 8);
  });
});
