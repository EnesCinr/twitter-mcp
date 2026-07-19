#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
  ErrorCode,
  McpError,
  TextContent
} from '@modelcontextprotocol/sdk/types.js';
import { TwitterClient } from './twitter-api.js';
import { XquikClient } from './xquik-api.js';
import {
  formatXquikTrends,
  formatXquikTweet,
  formatXquikUser,
  XQUIK_TOOLS
} from './xquik-tools.js';
import { ResponseFormatter } from './formatter.js';
import {
  Config, ConfigSchema,
  PostTweetSchema, SearchTweetsSchema,
  GetTweetSchema, GetUserSchema, GetTrendsSchema,
  TwitterError
} from './types.js';
import dotenv from 'dotenv';

export class TwitterServer {
  private server: Server;
  private client: TwitterClient | null;
  private xquik: XquikClient | null;

  constructor(config: Config) {
    // Validate config
    const result = ConfigSchema.safeParse(config);
    if (!result.success) {
      throw new Error(`Invalid configuration: ${result.error.message}`);
    }

    // Initialize Xquik client if API key is available
    this.xquik = config.xquikApiKey
      ? new XquikClient(config.xquikApiKey)
      : null;

    // Initialize Twitter API v2 client if credentials are available
    this.client = (config.apiKey && config.apiSecretKey && config.accessToken && config.accessTokenSecret)
      ? new TwitterClient(config)
      : null;

    if (!this.xquik && !this.client) {
      throw new Error(
        'Either XQUIK_API_KEY or all four Twitter API credentials are required. '
        + 'Get an Xquik key at https://xquik.com or '
        + 'set API_KEY, API_SECRET_KEY, ACCESS_TOKEN, ACCESS_TOKEN_SECRET from the Twitter Developer Portal.'
      );
    }

    this.server = new Server({
      name: 'twitter-mcp',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Error handler
    this.server.onerror = (error) => {
      console.error('[MCP Error]:', error);
    };

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.error('Shutting down server...');
      await this.server.close();
      process.exit(0);
    });

    // Register tool handlers
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'post_tweet',
          description: 'Post a new tweet to Twitter',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The content of your tweet',
                maxLength: 280
              },
              reply_to_tweet_id: {
                type: 'string',
                description: 'Optional: ID of the tweet to reply to'
              }
            },
            required: ['text']
          }
        } as Tool,
        {
          name: 'search_tweets',
          description: 'Search for tweets on Twitter',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (supports from:user, #hashtag, "exact phrase")'
              },
              count: {
                type: 'number',
                description: 'Number of tweets to return (10-100)',
                minimum: 10,
                maximum: 100
              }
            },
            required: ['query', 'count']
          }
        } as Tool,
        ...(this.xquik ? XQUIK_TOOLS : [])
      ]
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      console.error(`Tool called: ${name}`, args);

      try {
        switch (name) {
          case 'post_tweet':
            return await this.handlePostTweet(args);
          case 'search_tweets':
            return await this.handleSearchTweets(args);
          case 'get_tweet':
            return await this.handleGetTweet(args);
          case 'get_user':
            return await this.handleGetUser(args);
          case 'get_trends':
            return await this.handleGetTrends(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        return this.handleError(error);
      }
    });
  }

  private async handlePostTweet(args: unknown) {
    if (!this.client) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Posting requires Twitter API v2 credentials (API_KEY, API_SECRET_KEY, ACCESS_TOKEN, ACCESS_TOKEN_SECRET). This server uses Xquik only for read operations.'
      );
    }

    const result = PostTweetSchema.safeParse(args);
    if (!result.success) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${result.error.message}`
      );
    }

    const tweet = await this.client.postTweet(result.data.text, result.data.reply_to_tweet_id);
    return {
      content: [{
        type: 'text',
        text: `Tweet posted successfully!\nURL: https://twitter.com/status/${tweet.id}`
      }] as TextContent[]
    };
  }

  private async handleSearchTweets(args: unknown) {
    const result = SearchTweetsSchema.safeParse(args);
    if (!result.success) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${result.error.message}`
      );
    }

    // Prefer the configured Xquik read backend when available
    const searchClient = this.xquik || this.client!;
    const { tweets, users } = await searchClient.searchTweets(
      result.data.query,
      result.data.count
    );

    const formattedResponse = ResponseFormatter.formatSearchResponse(
      result.data.query,
      tweets,
      users
    );

    return {
      content: [{
        type: 'text',
        text: ResponseFormatter.toMcpResponse(formattedResponse)
      }] as TextContent[]
    };
  }

  private async handleGetTweet(args: unknown) {
    if (!this.xquik) {
      throw new McpError(ErrorCode.InvalidParams, 'get_tweet requires XQUIK_API_KEY');
    }
    const result = GetTweetSchema.safeParse(args);
    if (!result.success) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${result.error.message}`);
    }

    const { tweet, user } = await this.xquik.getTweet(result.data.tweet_id);
    return {
      content: [{
        type: 'text',
        text: formatXquikTweet(tweet, user)
      }] as TextContent[]
    };
  }

  private async handleGetUser(args: unknown) {
    if (!this.xquik) {
      throw new McpError(ErrorCode.InvalidParams, 'get_user requires XQUIK_API_KEY');
    }
    const result = GetUserSchema.safeParse(args);
    if (!result.success) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${result.error.message}`);
    }

    const user = await this.xquik.getUser(result.data.username);
    return {
      content: [{
        type: 'text',
        text: formatXquikUser(user)
      }] as TextContent[]
    };
  }

  private async handleGetTrends(args: unknown) {
    if (!this.xquik) {
      throw new McpError(ErrorCode.InvalidParams, 'get_trends requires XQUIK_API_KEY');
    }
    const result = GetTrendsSchema.safeParse(args);
    if (!result.success) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${result.error.message}`);
    }

    const trends = await this.xquik.getTrends(result.data.woeid, result.data.count);

    return {
      content: [{
        type: 'text',
        text: formatXquikTrends(trends)
      }] as TextContent[]
    };
  }

  private handleError(error: unknown) {
    if (error instanceof McpError) {
      throw error;
    }

    if (error instanceof TwitterError) {
      if (TwitterError.isRateLimit(error)) {
        return {
          content: [{
            type: 'text',
            text: 'Rate limit exceeded. Please wait a moment before trying again.'
          }] as TextContent[],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Twitter API error: ${error.message}`
        }] as TextContent[],
        isError: true
      };
    }

    console.error('Unexpected error:', error);
    throw new McpError(
      ErrorCode.InternalError,
      'An unexpected error occurred'
    );
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Twitter MCP server running on stdio');
  }
}

// Start the server
dotenv.config();

const config = {
  apiKey: process.env.API_KEY || '',
  apiSecretKey: process.env.API_SECRET_KEY || '',
  accessToken: process.env.ACCESS_TOKEN || '',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || '',
  xquikApiKey: process.env.XQUIK_API_KEY || ''
};

const server = new TwitterServer(config);
server.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
