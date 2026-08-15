import { greet } from '../src/main.js';

test('greet says hello', () => {
  expect(greet('World')).toBe('Hello, World!');
});
