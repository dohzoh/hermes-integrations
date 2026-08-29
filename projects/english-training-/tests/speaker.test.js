import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { speaker, Speaker } from '../src/speaker.js';

describe('Speaker (Node stub)', () => {
  test('initialize returns false when no DOM available', async () => {
    const s = new Speaker();
    const ok = await s.initialize();
    assert.equal(ok, false);
    assert.equal(s.isReady(), false);
  });

  test('speak records lastUtterance and resolves false without DOM', async () => {
    const s = new Speaker();
    const queued = await s.speak('Hello world');
    assert.equal(queued, false);
    assert.equal(s.lastUtterance, 'Hello world');
  });

  test('speak with empty text resolves false', async () => {
    const s = new Speaker();
    const queued = await s.speak('');
    assert.equal(queued, false);
    assert.equal(s.lastUtterance, null);
  });

  test('singleton speaker is exported', () => {
    assert.ok(speaker instanceof Speaker);
  });

  test('stop is safe when not initialized', () => {
    const s = new Speaker();
    // Should not throw
    s.stop();
    assert.equal(s.isReady(), false);
  });
});
