import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import { access } from 'fs/promises';
import { extname } from 'path';
import { Config, TwitterError, Tweet, TwitterUser, PostedTweet } from './types.js';

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
};

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

  async postTweet(text: string, replyToTweetId?: string, mediaPaths: string[] = []): Promise<PostedTweet> {
    try {
      const endpoint = 'tweets/create';
      await this.checkRateLimit(endpoint);

      const tweetOptions: any = { text };
      if (replyToTweetId) {
        tweetOptions.reply = { in_reply_to_tweet_id: replyToTweetId };
      }
      if (mediaPaths.length > 0) {
        tweetOptions.media = { media_ids: await this.uploadImages(mediaPaths) };
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

      const tweets = response.tweets.map(tweet => this.mapTweet(tweet));
      const users = response.includes.users.map(user => this.mapUser(user));

      return { tweets, users };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async getHomeTimeline(count?: number, startTime?: string): Promise<{ tweets: Tweet[], users: TwitterUser[] }> {
    try {
      const endpoint = 'tweets/home_timeline';
      await this.checkRateLimit(endpoint);

      const response = await this.client.v2.homeTimeline({
        ...(count !== undefined && { max_results: count }),
        ...(startTime !== undefined && { start_time: startTime }),
        expansions: ['author_id'],
        'tweet.fields': ['public_metrics', 'created_at'],
        'user.fields': ['username', 'name', 'verified']
      });

      console.error(`Fetched ${response.tweets.length} tweets from home timeline${startTime ? ` since ${startTime}` : ''}`);

      const tweets = response.tweets.map(tweet => this.mapTweet(tweet));
      const users = response.includes.users.map(user => this.mapUser(user));

      return { tweets, users };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  private mapTweet(tweet: TweetV2) {
    return {
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
    };
  }

  private mapUser(user: UserV2) {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      verified: user.verified ?? false
    };
  }

  private async uploadImages(paths: string[]): Promise<string[]> {
    // Validate every file before uploading so a bad path doesn't leave orphaned uploads
    const files = await Promise.all(paths.map(async (path) => {
      const mimeType = IMAGE_MIME_TYPES[extname(path).toLowerCase()];
      if (!mimeType) {
        throw new TwitterError(
          `Unsupported image type: ${path}. Supported types are JPG, PNG, GIF and WEBP`,
          'invalid_media',
          400
        );
      }
      try {
        await access(path);
      } catch {
        throw new TwitterError(`Image file not found: ${path}`, 'invalid_media', 400);
      }
      return { path, mimeType };
    }));

    const mediaIds: string[] = [];
    for (const { path, mimeType } of files) {
      mediaIds.push(await this.client.v1.uploadMedia(path, { mimeType }));
    }
    console.error(`Uploaded ${mediaIds.length} image(s): ${mediaIds.join(', ')}`);
    return mediaIds;
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
    const apiError = error as any;
    if (apiError.code) {
      throw new TwitterError(
        apiError.message || 'Twitter API error',
        apiError.code,
        apiError.status
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