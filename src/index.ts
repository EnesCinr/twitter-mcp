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
import { ResponseFormatter } from './formatter.js';
import {
  Config, ConfigSchema,
  PostTweetSchema, PostTweetWithImageSchema, SearchTweetsSchema,
  TwitterError
} from './types.js';
import dotenv from 'dotenv';

export class TwitterServer {
  private server: Server;
  private client: TwitterClient;

  constructor(config: Config) {
    // Validate config
    const result = ConfigSchema.safeParse(config);
    if (!result.success) {
      throw new Error(`Invalid configuration: ${result.error.message}`);
    }

    this.client = new TwitterClient(config);
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
          name: 'post_tweet_with_image',
          description: 'Post a tweet with an image to Twitter',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The content of your tweet',
                maxLength: 280
              },
              image_path: {
                type: 'string',
                description: 'Local file path to the image (supports JPG, JPEG, PNG, GIF, WEBP)'
              },
              reply_to_tweet_id: {
                type: 'string',
                description: 'Optional: ID of the tweet to reply to'
              }
            },
            required: ['text', 'image_path']
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
                description: 'Search query'
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
        } as Tool
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
          case 'post_tweet_with_image':
            return await this.handlePostTweetWithImage(args);
          case 'search_tweets':
            return await this.handleSearchTweets(args);
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

  private async handlePostTweetWithImage(args: unknown) {
    const result = PostTweetWithImageSchema.safeParse(args);
    if (!result.success) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${result.error.message}`
      );
    }

    const tweet = await this.client.postTweetWithImage(
      result.data.text,
      result.data.image_path,
      result.data.reply_to_tweet_id
    );
    return {
      content: [{
        type: 'text',
        text: `Tweet with image posted successfully!\nURL: https://twitter.com/status/${tweet.id}`
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

    const { tweets, users } = await this.client.searchTweets(
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

  private handleError(error: unknown) {
    if (error instanceof McpError) {
      throw error;
    }

    if (error instanceof TwitterError) {
      if (TwitterError.isRateLimit(error)) {
        return {
          content: [{
            type: 'text',
            text: 'Rate limit exceeded. Please wait a moment before trying again.',
            isError: true
          }] as TextContent[]
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Twitter API error: ${(error as TwitterError).message}`,
          isError: true
        }] as TextContent[]
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
  apiKey: process.env.API_KEY!,
  apiSecretKey: process.env.API_SECRET_KEY!,
  accessToken: process.env.ACCESS_TOKEN!,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!
};

const server = new TwitterServer(config);
server.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});