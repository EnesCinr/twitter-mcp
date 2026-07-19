import { TwitterApi } from 'twitter-api-v2';
import type { SendTweetV2Params } from 'twitter-api-v2';
import { Config, TwitterError, Tweet, TwitterUser, PostedTweet } from './types.js';

interface IncludedUser {
  id: string;
  username: string;
  name: string;
  verified?: boolean;
}

export function mapIncludedUsers(users: IncludedUser[] | undefined): TwitterUser[] {
  return (users ?? []).map(user => ({
    id: user.id,
    username: user.username,
    name: user.name,
    verified: user.verified ?? false
  }));
}

export class TwitterClient {
  private client: TwitterApi;
  private rateLimitMap = new Map<string, number>();

  constructor(config: Config) {
    this.client = new TwitterApi({
      appKey: config.apiKey,
      appSecret: config.apiSecretKey,
      accessToken: config.accessToken,
      accessSecret: config.accessTokenSecret,
    });

    console.error('Twitter API client initialized');
  }

  async postTweet(text: string, replyToTweetId?: string): Promise<PostedTweet> {
    try {
      const endpoint = 'tweets/create';
      await this.checkRateLimit(endpoint);

      const tweetOptions: SendTweetV2Params = { text };
      if (replyToTweetId) {
        tweetOptions.reply = { in_reply_to_tweet_id: replyToTweetId };
      }

      const response = await this.client.v2.tweet(tweetOptions);
      
      console.error(`Tweet posted successfully with ID: ${response.data.id}${replyToTweetId ? ` (reply to ${replyToTweetId})` : ''}`);
      
      return {
        id: response.data.id,
        text: response.data.text
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async searchTweets(query: string, count: number): Promise<{ tweets: Tweet[], users: TwitterUser[] }> {
    try {
      const endpoint = 'tweets/search';
      await this.checkRateLimit(endpoint);

      const response = await this.client.v2.search(query, {
        max_results: count,
        expansions: ['author_id'],
        'tweet.fields': ['public_metrics', 'created_at'],
        'user.fields': ['username', 'name', 'verified']
      });

      console.error(`Fetched ${response.tweets.length} tweets for query: "${query}"`);

      const tweets = response.tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id ?? '',
        metrics: {
          likes: tweet.public_metrics?.like_count ?? 0,
          retweets: tweet.public_metrics?.retweet_count ?? 0,
          replies: tweet.public_metrics?.reply_count ?? 0,
          quotes: tweet.public_metrics?.quote_count ?? 0
        },
        createdAt: tweet.created_at ?? ''
      }));

      const users = mapIncludedUsers(response.includes?.users);

      return { tweets, users };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  private async checkRateLimit(endpoint: string): Promise<void> {
    const lastRequest = this.rateLimitMap.get(endpoint);
    if (lastRequest) {
      const timeSinceLastRequest = Date.now() - lastRequest;
      if (timeSinceLastRequest < 1000) { // Basic rate limiting
        throw new TwitterError(
          'Rate limit exceeded',
          'rate_limit_exceeded',
          429
        );
      }
    }
    this.rateLimitMap.set(endpoint, Date.now());
  }

  private handleApiError(error: unknown): never {
    if (error instanceof TwitterError) {
      throw error;
    }

    // Handle twitter-api-v2 errors
    if (
      typeof error === 'object'
      && error !== null
      && 'code' in error
    ) {
      const apiError = error as Record<string, unknown>;
      throw new TwitterError(
        typeof apiError.message === 'string'
          ? apiError.message
          : 'Twitter API error',
        String(apiError.code),
        typeof apiError.status === 'number' ? apiError.status : undefined
      );
    }

    // Handle unexpected errors
    console.error('Unexpected error in Twitter client:', error);
    throw new TwitterError(
      'An unexpected error occurred',
      'internal_error',
      500
    );
  }
}
