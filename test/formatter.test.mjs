import assert from 'node:assert/strict';
import test from 'node:test';
import { ResponseFormatter } from '../build/formatter.js';

test('keeps search results when expanded user metadata is absent', () => {
  const result = ResponseFormatter.formatSearchResponse(
    'example',
    [{
      id: '123',
      text: 'Hello',
      authorId: '456',
      metrics: { likes: 1, retweets: 2 },
      createdAt: '2026-07-19T00:00:00Z',
    }],
    [],
  );

  assert.equal(result.count, 1);
  assert.equal(result.tweets[0].author.username, 'unknown');
  assert.equal(result.tweets[0].url, 'https://twitter.com/i/web/status/123');
});
