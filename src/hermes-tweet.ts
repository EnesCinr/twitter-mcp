import { Tweet, TwitterUser } from './types.js';

interface HermesTweetConfig {
  apiKey?: string;
  baseUrl?: string;
}

interface HermesTweetRecord {
  id?: unknown;
  tweet_id?: unknown;
  text?: unknown;
  full_text?: unknown;
  author_id?: unknown;
  authorId?: unknown;
  created_at?: unknown;
  createdAt?: unknown;
  url?: unknown;
  author?: {
    id?: unknown;
    username?: unknown;
    screen_name?: unknown;
    name?: unknown;
  };
  user?: {
    id?: unknown;
    username?: unknown;
    screen_name?: unknown;
    name?: unknown;
  };
  public_metrics?: {
    like_count?: unknown;
    retweet_count?: unknown;
  };
  metrics?: {
    likes?: unknown;
    retweets?: unknown;
  };
}

const DEFAULT_BASE_URL = 'https://api.xquik.com';
const SEARCH_PATH = '/api/v1/x/tweets/search';

export class HermesTweetClient {
  private readonly apiKey?: string;
  private readonly baseUrl: string;

  constructor(config: HermesTweetConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async searchTweets(query: string, count: number): Promise<{ tweets: Tweet[], users: TwitterUser[] }> {
    if (!this.apiKey) {
      throw new Error('Hermes Tweet API key is required for Hermes Tweet search.');
    }

    const url = new URL(`${this.baseUrl}${SEARCH_PATH}`);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(count));

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.apiKey}`,
        'x-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Hermes Tweet search failed with status ${response.status}`);
    }

    const payload = await response.json();
    return this.normalizeSearchResponse(payload);
  }

  private normalizeSearchResponse(payload: unknown): { tweets: Tweet[], users: TwitterUser[] } {
    const records = this.extractRecords(payload);
    const users = new Map<string, TwitterUser>();

    const tweets = records.map((record, index) => {
      const author = record.author || record.user || {};
      const tweetId = this.toString(record.id || record.tweet_id) || `hermes-tweet-${index + 1}`;
      const authorId = this.toString(record.author_id || record.authorId || author.id) || `author-${index + 1}`;
      const username = this.toString(author.username || author.screen_name) || 'unknown';

      users.set(authorId, {
        id: authorId,
        username
      });

      return {
        id: tweetId,
        text: this.toString(record.text || record.full_text) || '',
        authorId,
        metrics: {
          likes: this.toNumber(record.metrics?.likes || record.public_metrics?.like_count),
          retweets: this.toNumber(record.metrics?.retweets || record.public_metrics?.retweet_count)
        },
        createdAt: this.toString(record.created_at || record.createdAt) || ''
      };
    });

    return { tweets, users: [...users.values()] };
  }

  private extractRecords(payload: unknown): HermesTweetRecord[] {
    if (Array.isArray(payload)) {
      return payload.filter((item): item is HermesTweetRecord => this.isRecord(item));
    }

    if (!this.isObject(payload)) {
      return [];
    }

    for (const key of ['tweets', 'data', 'results', 'items']) {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is HermesTweetRecord => this.isRecord(item));
      }
    }

    const result = payload.result;
    if (this.isObject(result)) {
      return this.extractRecords(result);
    }

    return [];
  }

  private isRecord(value: unknown): value is HermesTweetRecord {
    return this.isObject(value);
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return String(value);
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return 0;
  }
}
