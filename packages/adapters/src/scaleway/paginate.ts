// Every list call asks for this many items per page.
export const PAGE_SIZE = 100;

// Loads pages 1, 2, … until every item is in, or a page comes back short or empty.
export const paginate = async <T>(
  fetchPage: (page: number) => Promise<{ items: T[]; total?: number }>,
  pageSize = PAGE_SIZE,
): Promise<T[]> => {
  const all: T[] = [];

  for (let page = 1; ; page += 1) {
    const { items, total } = await fetchPage(page);
    all.push(...items);
    if (items.length < pageSize || (total !== undefined && all.length >= total)) {
      return all;
    }
  }
};
