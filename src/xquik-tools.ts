import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Tweet, TwitterUser } from './types.js';
import type { XquikTrend, XquikUser } from './xquik-api.js';

export const XQUIK_TOOLS: Tool[] = [
  {
    name: 'get_tweet',
    description: 'Get a single tweet by ID with full engagement metrics',
    inputSchema: {
      type: 'object',
      properties: {
        tweet_id: {
          type: 'string',
          description: 'The tweet ID to look up'
        }
      },
      required: ['tweet_id']
    }
  },
  {
    name: 'get_user',
    description: 'Get a Twitter user profile by username',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username (without @)'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'get_trends',
    description: 'Get trending topics on Twitter',
    inputSchema: {
      type: 'object',
      properties: {
        woeid: {
          type: 'number',
          description: 'WOEID for region (1=Global, 23424977=US, 23424975=UK)',
          default: 1
        },
        count: {
          type: 'number',
          description: 'Number of trends to return (1-50)',
          default: 20
        }
      }
    }
  }
];

export function formatXquikTweet(tweet: Tweet, user: TwitterUser): string {
  return [
    `Tweet by @${user.username}`,
    `Content: ${tweet.text}`,
    `Metrics: ${tweet.metrics.likes} likes, ${tweet.metrics.retweets} retweets, ${tweet.metrics.replies ?? 0} replies, ${tweet.metrics.quotes ?? 0} quotes`,
    `URL: https://twitter.com/${user.username}/status/${tweet.id}`,
    `Posted: ${tweet.createdAt}`
  ].join('\n');
}

export function formatXquikUser(user: XquikUser): string {
  return [
    `@${user.username} (${user.name})${user.verified ? ' ✓' : ''}`,
    user.description ? `Bio: ${user.description}` : '',
    `Followers: ${user.followers} | Following: ${user.following}`,
    `Tweets: ${user.statusesCount}`,
    `Joined: ${user.createdAt || 'unknown'}`,
    `URL: https://x.com/${user.username}`
  ].filter(Boolean).join('\n');
}

export function formatXquikTrends(trends: XquikTrend[]): string {
  const lines = trends.map((trend, index) => {
    const rank = trend.rank ?? index + 1;
    return `${rank}. ${trend.name}${trend.description ? `: ${trend.description}` : ''}`;
  });

  return `TRENDING TOPICS\n${'='.repeat(30)}\n${lines.join('\n')}`;
}
