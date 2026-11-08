import { paginate } from './paginate';

test('paginate stops when every item is in', async () => {
  const fetchPage = jest
    .fn()
    .mockResolvedValueOnce({ items: ['a', 'b'], total: 4 })
    .mockResolvedValueOnce({ items: ['c', 'd'], total: 4 });

  await expect(paginate(fetchPage, 2)).resolves.toEqual(['a', 'b', 'c', 'd']);
  expect(fetchPage.mock.calls).toEqual([[1], [2]]);
});

test('paginate stops on an empty page', async () => {
  // Items were deleted between two calls, so the total is too high.
  const fetchPage = jest
    .fn()
    .mockResolvedValueOnce({ items: ['a', 'b'], total: 5 })
    .mockResolvedValueOnce({ items: [], total: 5 });

  await expect(paginate(fetchPage, 2)).resolves.toEqual(['a', 'b']);
  expect(fetchPage.mock.calls).toEqual([[1], [2]]);
});

test('paginate stops on a short page when there is no total', async () => {
  const fetchPage = jest
    .fn()
    .mockResolvedValueOnce({ items: ['a', 'b'] })
    .mockResolvedValueOnce({ items: ['c'] });

  await expect(paginate(fetchPage, 2)).resolves.toEqual(['a', 'b', 'c']);
  expect(fetchPage.mock.calls).toEqual([[1], [2]]);
});
