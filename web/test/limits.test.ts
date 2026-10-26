import test from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, takeToken, withGate } from '../lib/limits.ts';

test('one IP gets six diagnoses per ten minutes, then waits', () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 6; i++) assert.equal(takeToken('203.0.113.7', t0 + i).ok, true);
  const seventh = takeToken('203.0.113.7', t0 + 10);
  assert.equal(seventh.ok, false);
  assert.ok(seventh.retryAfter > 0);
  assert.equal(takeToken('203.0.113.8', t0 + 10).ok, true);
  assert.equal(takeToken('203.0.113.7', t0 + 10 * 60 * 1000 + 1).ok, true);
});

test('client IP comes from the platform headers', () => {
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })), '198.51.100.1');
  assert.equal(clientIp(new Headers({ 'x-real-ip': '198.51.100.2', 'x-forwarded-for': '1.2.3.4' })), '198.51.100.2');
});

test('the gate runs one diagnosis at a time and turns away a long queue', async () => {
  let release: () => void = () => {};
  const first = withGate(() => new Promise<string>((r) => (release = () => r('a'))));
  const second = withGate(async () => 'b');
  const third = withGate(async () => 'c');
  assert.equal(await withGate(async () => 'd'), null);
  release();
  assert.deepEqual(await Promise.all([first, second, third]), ['a', 'b', 'c']);
});
