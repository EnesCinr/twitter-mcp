import { z } from 'zod';

// Configuration schema with validation
// Twitter API v2 keys are optional when using Xquik for read operations
export const ConfigSchema = z.object({
    apiKey: z.string().default(''),
    apiSecretKey: z.string().default(''),
    accessToken: z.string().default(''),
    accessTokenSecret: z.string().default(''),
    xquikApiKey: z.string().default('')
});

export type Config = z.infer<typeof ConfigSchema>;

// Tool input schemas
export const PostTweetSchema = z.object({
    text: z.string()
        .min(1, 'Tweet text cannot be empty')
        .max(280, 'Tweet cannot exceed 280 characters'),
    reply_to_tweet_id: z.string().optional()
});

export const SearchTweetsSchema = z.object({
    query: z.string().min(1, 'Search query cannot be empty'),
    count: z.number()
        .int('Count must be an integer')
        .min(10, 'Minimum count is 10')
        .max(100, 'Maximum count is 100')
});

export const GetTweetSchema = z.object({
    tweet_id: z.string().min(1, 'Tweet ID cannot be empty')
});

export const GetUserSchema = z.object({
    username: z.string().min(1, 'Username cannot be empty')
});

export const GetTrendsSchema = z.object({
    woeid: z.number().int().default(1),
    count: z.number().int().min(1).max(50).default(20)
});

export type PostTweetArgs = z.infer<typeof PostTweetSchema>;
export type SearchTweetsArgs = z.infer<typeof SearchTweetsSchema>;

// API Response types
export interface TweetMetrics {
    likes: number;
    retweets: number;
    replies?: number;
    quotes?: number;
}

export interface PostedTweet {
    id: string;
    text: string;
}

export interface Tweet {
    id: string;
    text: string;
    authorId: string;
    metrics: TweetMetrics;
    createdAt: string;
}

export interface TwitterUser {
    id: string;
    username: string;
    name?: string;
    verified?: boolean;
}

// Error types
export class TwitterError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly status?: number
    ) {
        super(message);
        this.name = 'TwitterError';
    }

    static isRateLimit(error: unknown): boolean {
        return error instanceof TwitterError && error.code === 'rate_limit_exceeded';
    }
}

// Response formatter types
export interface FormattedTweet {
    position: number;
    author: {
        username: string;
    };
    content: string;
    metrics: TweetMetrics;
    url: string;
}

export interface SearchResponse {
    query: string;
    count: number;
    tweets: FormattedTweet[];
}
