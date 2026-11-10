import type { ScalewayHttp } from '../http';

// Tests only: answers by path, throws an Error answer, and sends `fallback` for any other path.
export const fakeHttp = (answers: Record<string, unknown>, fallback: unknown) => {
  const request = jest.fn(async (_method: string, path: string) => {
    const answer = answers[path] ?? fallback;
    if (answer instanceof Error) {
      throw answer;
    }

    return answer;
  });

  return { request, http: { request } as unknown as ScalewayHttp };
};
