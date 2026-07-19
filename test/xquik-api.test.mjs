import assert from 'node:assert/strict';
import test from 'node:test';
import { XquikClient } from '../build/xquik-api.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });
}

test('maps Xquik search results into the existing Twitter response shape', async () => {
  const requests = [];
  const client = new XquikClient('test-key', async (url, options) => {
    requests.push({ url: String(url), options });
    return jsonResponse({
      tweets: [{
        id: '123',
        text: 'Hello',
        author: {
          id: '456',
          username: 'example',
          name: 'Example',
          verified: true,
        },
        likeCount: 5,
        retweetCount: 4,
        replyCount: 3,
        quoteCount: 2,
        createdAt: '2026-07-19T00:00:00Z',
      }],
    });
  });

  const result = await client.searchTweets('hello world', 10);

  assert.deepEqual(result, {
    tweets: [{
      id: '123',
      text: 'Hello',
      authorId: '456',
      metrics: { likes: 5, retweets: 4, replies: 3, quotes: 2 },
      createdAt: '2026-07-19T00:00:00Z',
    }],
    users: [{
      id: '456',
      username: 'example',
      name: 'Example',
      verified: true,
    }],
  });
  assert.equal(
    requests[0].url,
    'https://xquik.com/api/v1/x/tweets/search?q=hello+world&limit=10&queryType=Top',
  );
  assert.equal(requests[0].options.headers['X-API-Key'], 'test-key');
});

test('reads the tweet and author envelope returned by the Xquik API', async () => {
  const client = new XquikClient('test-key', async () => jsonResponse({
    tweet: {
      id: '123',
      text: 'Hello',
      likeCount: 5,
      retweetCount: 4,
      replyCount: 3,
      quoteCount: 2,
      createdAt: '2026-07-19T00:00:00Z',
    },
    author: {
      id: '456',
      username: 'example',
      name: 'Example',
      verified: true,
    },
  }));

  const result = await client.getTweet('123');

  assert.equal(result.tweet.id, '123');
  assert.equal(result.tweet.authorId, '456');
  assert.equal(result.user.username, 'example');
});

test('uses the current user and trends routes', async () => {
  const urls = [];
  const client = new XquikClient('test-key', async (url) => {
    urls.push(String(url));
    if (String(url).includes('/x/users/')) {
      return jsonResponse({
        id: '456',
        username: 'example/name',
        name: 'Example',
      });
    }
    return jsonResponse({
      trends: [{ name: '#MCP', rank: 1 }],
      count: 1,
      woeid: 1,
    });
  });

  await client.getUser('@example/name');
  const trends = await client.getTrends(1, 20);

  assert.deepEqual(urls, [
    'https://xquik.com/api/v1/x/users/example%2Fname',
    'https://xquik.com/api/v1/x/trends?woeid=1&count=20',
  ]);
  assert.deepEqual(trends, [{ name: '#MCP', description: '', rank: 1 }]);
});

test('does not expose an upstream response body in errors', async () => {
  const client = new XquikClient(
    'test-key',
    async () => new Response('secret upstream detail', { status: 401 }),
  );

  await assert.rejects(
    client.searchTweets('hello', 10),
    (error) => {
      assert.equal(error.message, 'Xquik API request failed with status 401');
      assert.equal(error.message.includes('secret upstream detail'), false);
      return true;
    },
  );
});
