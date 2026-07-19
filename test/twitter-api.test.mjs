import assert from 'node:assert/strict';
import test from 'node:test';
import { mapIncludedUsers } from '../build/twitter-api.js';

test('handles search responses without expanded users', () => {
  assert.deepEqual(mapIncludedUsers(undefined), []);
});

test('maps expanded users without requiring verified metadata', () => {
  assert.deepEqual(
    mapIncludedUsers([{
      id: '123',
      username: 'example',
      name: 'Example',
    }]),
    [{
      id: '123',
      username: 'example',
      name: 'Example',
      verified: false,
    }],
  );
});
