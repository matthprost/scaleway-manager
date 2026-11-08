import { createPins } from './pins';
import { createMemoryKv } from './testing/memoryKv';

test('pins toggle adds and removes and are kept per project', async () => {
  const kv = createMemoryKv();
  const pins = createPins(kv);

  await expect(pins.toggle('p-1', 'instances:fr-par-1:a')).resolves.toEqual(['instances:fr-par-1:a']);
  await expect(pins.toggle('p-1', 'kubernetes:fr-par:b')).resolves.toEqual([
    'instances:fr-par-1:a',
    'kubernetes:fr-par:b',
  ]);
  await expect(pins.toggle('p-2', 'instances:nl-ams-1:c')).resolves.toEqual(['instances:nl-ams-1:c']);
  await expect(pins.toggle('p-1', 'instances:fr-par-1:a')).resolves.toEqual(['kubernetes:fr-par:b']);

  await expect(pins.list('p-1')).resolves.toEqual(['kubernetes:fr-par:b']);
  await expect(pins.list('p-2')).resolves.toEqual(['instances:nl-ams-1:c']);
  await expect(pins.list('p-3')).resolves.toEqual([]);
  await expect(kv.getItem('sm.pins')).resolves.toBe(
    '{"p-1":["kubernetes:fr-par:b"],"p-2":["instances:nl-ams-1:c"]}',
  );
});

test('two quick toggles keep both pins', async () => {
  const pins = createPins(createMemoryKv());

  await Promise.all([pins.toggle('p-1', 'a'), pins.toggle('p-1', 'b')]);

  await expect(pins.list('p-1')).resolves.toEqual(['a', 'b']);
});

test('pins start empty when the saved list is unreadable', async () => {
  const pins = createPins(createMemoryKv({ 'sm.pins': 'not json' }));

  await expect(pins.list('p-1')).resolves.toEqual([]);
  await expect(pins.toggle('p-1', 'a')).resolves.toEqual(['a']);
});

test('pins start empty when the saved value is not a map', async () => {
  const pins = createPins(createMemoryKv({ 'sm.pins': '["a"]' }));

  await expect(pins.list('p-1')).resolves.toEqual([]);
});

test("clear removes every project's pins", async () => {
  const kv = createMemoryKv();
  const pins = createPins(kv);
  await pins.toggle('p-1', 'a');
  await pins.toggle('p-2', 'b');

  await pins.clear();

  await expect(pins.list('p-1')).resolves.toEqual([]);
  await expect(pins.list('p-2')).resolves.toEqual([]);
  await expect(kv.getItem('sm.pins')).resolves.toBeNull();
});

test('clear waits for a toggle that is running', async () => {
  const pins = createPins(createMemoryKv());

  await Promise.all([pins.toggle('p-1', 'a'), pins.clear()]);

  await expect(pins.list('p-1')).resolves.toEqual([]);
});

test('remove takes one pin off, and changes nothing when it is not pinned', async () => {
  const kv = createMemoryKv();
  const pins = createPins(kv);
  await pins.toggle('p-1', 'a');
  await pins.toggle('p-1', 'b');
  await pins.toggle('p-2', 'a');

  await expect(pins.remove('p-1', 'a')).resolves.toEqual(['b']);
  // Not pinned: it stays off (toggle would pin it)
  await expect(pins.remove('p-1', 'a')).resolves.toEqual(['b']);

  await expect(pins.list('p-1')).resolves.toEqual(['b']);
  await expect(pins.list('p-2')).resolves.toEqual(['a']);
});

test('remove waits for a toggle that is running', async () => {
  const pins = createPins(createMemoryKv());

  await Promise.all([pins.toggle('p-1', 'a'), pins.remove('p-1', 'a')]);

  await expect(pins.list('p-1')).resolves.toEqual([]);
});
