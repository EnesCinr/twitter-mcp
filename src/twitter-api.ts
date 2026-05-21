import { TwitterApi } from 'twitter-api-v2';
import { Config, TwitterError, Tweet, TwitterUser, PostedTweet } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export class TwitterClient {
  private client: TwitterApi;
  private rateLimitMap = new Map<string, number>();

  private config: Config;

  constructor(config: Config) {
    this.config = config;
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

      const tweetOptions: any = { text };
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

  async postTweetWithImage(text: string, imagePath: string, replyToTweetId?: string): Promise<PostedTweet> {
    try {
      const endpoint = 'tweets/create';
      await this.checkRateLimit(endpoint);

      if (!fs.existsSync(imagePath)) {
        throw new TwitterError(
          `Image file not found: ${imagePath}`,
          'file_not_found',
          404
        );
      }

      const mediaId = await this.uploadMedia(imagePath);

      const tweetOptions: any = { text };
      tweetOptions.media = { media_ids: [mediaId] };
      if (replyToTweetId) {
        tweetOptions.reply = { in_reply_to_tweet_id: replyToTweetId };
      }

      const response = await this.client.v2.tweet(tweetOptions);

      console.error(`Tweet with image posted successfully with ID: ${response.data.id}`);

      return {
        id: response.data.id,
        text: response.data.text
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  private async uploadMedia(filePath: string): Promise<string> {
    const data = fs.readFileSync(filePath);
    const mimeType = this.getMimeType(filePath);
    const mediaId = await this.client.v1.uploadMedia(data, { mimeType });
    return mediaId;
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const mimeType = mimeTypes[ext];
    if (!mimeType) {
      throw new TwitterError(
        `Unsupported image format: ${ext}. Supported formats: JPG, JPEG, PNG, GIF, WEBP`,
        'unsupported_format',
        400
      );
    }
    return mimeType;
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

      const users = response.includes.users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        verified: user.verified ?? false
      }));

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