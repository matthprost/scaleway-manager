export type ActivityEvent = {
  id: string;
  at: string;
  kind: 'api' | 'login' | 'system';
  actorId: string | null;
  title: string;
  // In plain words, as people know it ("Instances"); null when the event has none (a login)
  product: string | null;
  result: 'success' | 'failure' | null;
};

// 'StopServer' -> 'Stop server'; acronyms stay upper case.
export function humanizeMethod(name: string): string {
  const words = name
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(' ');

  return words
    .map((word, index) =>
      index === 0 || (word.length > 1 && word === word.toUpperCase()) ? word : word.toLowerCase(),
    )
    .join(' ');
}
