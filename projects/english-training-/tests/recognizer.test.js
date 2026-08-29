import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { recognizer, SpeechRecognizer } from '../src/recognizer.js';

describe('SpeechRecognizer (Node stub)', () => {
  test('initialize returns false when no DOM available', async () => {
    const r = new SpeechRecognizer();
    const ok = await r.initialize();
    assert.equal(ok, false);
    assert.equal(r.available(), false);
  });

  test('listen rejects when SpeechRecognition unavailable', async () => {
    const r = new SpeechRecognizer();
    await assert.rejects(
      () => r.listen(),
      /Speech recognition not supported/
    );
  });

  test('stop is safe when not listening', () => {
    const r = new SpeechRecognizer();
    r.stop();
    assert.equal(r.isListening, false);
  });

  test('singleton recognizer is exported', () => {
    assert.ok(recognizer instanceof SpeechRecognizer);
  });

  test('available returns current support state', async () => {
    const r = new SpeechRecognizer();
    await r.initialize();
    assert.equal(r.available(), false);
  });
});
