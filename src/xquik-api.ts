import { z } from 'zod';
import { Tweet, TwitterUser, TwitterError } from './types.js';

const BASE = 'https://xquik.com/api/v1';

const AuthorSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().default(''),
  verified: z.boolean().default(false),
});

const TweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  author: AuthorSchema.optional(),
  likeCount: z.number().int().default(0),
  retweetCount: z.number().int().default(0),
  replyCount: z.number().int().default(0),
  quoteCount: z.number().int().default(0),
  createdAt: z.string().default(''),
});

const SearchResponseSchema = z.object({
  tweets: z.array(TweetSchema),
});

const TweetResponseSchema = z.object({
  tweet: TweetSchema.omit({ author: true }),
  author: AuthorSchema,
});

const UserSchema = AuthorSchema.extend({
  description: z.string().default(''),
  followers: z.number().int().default(0),
  following: z.number().int().default(0),
  statusesCount: z.number().int().default(0),
  createdAt: z.string().default(''),
});

const TrendSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  rank: z.number().int().optional(),
});

const TrendsResponseSchema = z.object({
  trends: z.array(TrendSchema),
});

export type XquikUser = z.infer<typeof UserSchema>;
export type XquikTrend = z.infer<typeof TrendSchema>;

export class XquikClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  private async request(
    path: string,
    params: Record<string, string | number> = {},
  ): Promise<unknown> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      qs.set(key, String(value));
    }
    const url = qs.toString() ? `${BASE}${path}?${qs}` : `${BASE}${path}`;

    const res = await this.fetchImplementation(url, {
      headers: {
        'X-API-Key': this.apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new TwitterError(
        `Xquik API request failed with status ${res.status}`,
        'xquik_api_error',
        res.status
      );
    }

    return res.json() as Promise<unknown>;
  }

  async searchTweets(query: string, count: number): Promise<{ tweets: Tweet[], users: TwitterUser[] }> {
    const data = SearchResponseSchema.parse(
      await this.request('/x/tweets/search', {
        q: query,
        limit: Math.min(count, 200),
        queryType: 'Top',
      }),
    );
    const userMap = new Map<string, TwitterUser>();

    const tweets = data.tweets.map((tweet): Tweet => {
      if (tweet.author) {
        userMap.set(tweet.author.id, {
          id: tweet.author.id,
          username: tweet.author.username,
          name: tweet.author.name,
          verified: tweet.author.verified,
        });
      }
      return {
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author?.id ?? '',
        metrics: {
          likes: tweet.likeCount,
          retweets: tweet.retweetCount,
          replies: tweet.replyCount,
          quotes: tweet.quoteCount,
        },
        createdAt: tweet.createdAt,
      };
    });

    return { tweets, users: Array.from(userMap.values()) };
  }

  async getTweet(tweetId: string): Promise<{ tweet: Tweet, user: TwitterUser }> {
    const data = TweetResponseSchema.parse(
      await this.request(`/x/tweets/${encodeURIComponent(tweetId)}`),
    );

    return {
      tweet: {
        id: data.tweet.id,
        text: data.tweet.text,
        authorId: data.author.id,
        metrics: {
          likes: data.tweet.likeCount,
          retweets: data.tweet.retweetCount,
          replies: data.tweet.replyCount,
          quotes: data.tweet.quoteCount,
        },
        createdAt: data.tweet.createdAt,
      },
      user: {
        id: data.author.id,
        username: data.author.username,
        name: data.author.name,
        verified: data.author.verified,
      },
    };
  }

  async getUser(username: string): Promise<XquikUser> {
    const normalizedUsername = username.replace(/^@/, '');
    return UserSchema.parse(
      await this.request(`/x/users/${encodeURIComponent(normalizedUsername)}`),
    );
  }

  async getTrends(woeid: number = 1, count: number = 20): Promise<XquikTrend[]> {
    const data = TrendsResponseSchema.parse(
      await this.request('/x/trends', { woeid, count: Math.min(count, 50) }),
    );
    return data.trends;
  }
}
