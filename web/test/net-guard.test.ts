// Address checks that need no browser. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { BlockedError, isPublicAddress, parseTarget, resolvePublic } from '../lib/net-guard.ts';

test('private, loopback, link-local and metadata addresses are not public', () => {
  for (const ip of ['127.0.0.1', '127.1.2.3', '10.0.0.1', '10.255.255.255', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::ffff:127.0.0.1', '::ffff:169.254.169.254', 'fd00::1', 'fe80::1', '64:ff9b::a9fe:a9fe', '224.0.0.1', '255.255.255.255']) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPublicAddress(ip), true, ip);
});

test('loopback is only allowed when the test flag is passed, and never private space', () => {
  assert.equal(isPublicAddress('127.0.0.1', true), true);
  assert.equal(isPublicAddress('10.0.0.1', true), false);
  assert.equal(isPublicAddress('169.254.169.254', true), false);
});

test('URLs that point inside are refused before any DNS lookup', () => {
  const blocked = [
    'http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.5/',
    'http://2130706433/',
    'http://0x7f.0.0.1/',
    'http://017700000001/',
    'http://[::1]/',
    'http://[::ffff:7f00:1]/',
    'http://localhost/',
    'http://app.localhost/',
    'file:///etc/passwd',
    'ftp://example.com/',
    'gopher://example.com/',
    'javascript:alert(1)',
    'http://user:pw@example.com/',
    'http://example.com:22/',
  ];
  for (const u of blocked) assert.throws(() => parseTarget(u), BlockedError, u);
  assert.throws(() => parseTarget('localhost:3000'), BlockedError);
  assert.throws(() => parseTarget('127.0.0.1:8080'), BlockedError);
  assert.equal(parseTarget('example.com').href, 'https://example.com/');
  assert.equal(parseTarget('example.com:8443/x').href, 'https://example.com:8443/x');
  assert.equal(parseTarget('http://example.com:8080/a?b=1').href, 'http://example.com:8080/a?b=1');
});

test('names that resolve to private space are refused after DNS', async () => {
  await assert.rejects(resolvePublic('localhost'), BlockedError);
  // Public wildcard DNS that answers with the embedded address.
  for (const name of ['127.0.0.1.nip.io', '169.254.169.254.nip.io', '10.0.0.1.nip.io']) {
    await assert.rejects(resolvePublic(name), BlockedError, name);
  }
});
