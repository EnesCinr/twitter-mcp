[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/enescinr-twitter-mcp-badge.png)](https://mseep.ai/app/enescinr-twitter-mcp)

# Twitter MCP Server

[![smithery badge](https://smithery.ai/badge/@enescinar/twitter-mcp)](https://smithery.ai/server/@enescinar/twitter-mcp)

This MCP server allows Clients to interact with Twitter, enabling posting tweets, searching Twitter and reading your home timeline.

<a href="https://glama.ai/mcp/servers/dhsudtc7cd">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/dhsudtc7cd/badge" alt="Twitter Server MCP server" />
</a>

## Quick Start

1. Create a Twitter Developer account and get your API keys from [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)

2. Add this configuration to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "twitter-mcp": {
      "command": "npx",
      "args": ["-y", "@enescinar/twitter-mcp"],
      "env": {
        "API_KEY": "your_api_key_here",
        "API_SECRET_KEY": "your_api_secret_key_here",
        "ACCESS_TOKEN": "your_access_token_here",
        "ACCESS_TOKEN_SECRET": "your_access_token_secret_here"
      }
    }
  }
}
```

3. Restart Claude Desktop

That's it! Claude can now interact with Twitter through three tools:

- `post_tweet`: Post a new tweet, optionally as a reply (`reply_to_tweet_id`) or with up to 4 images (`media_paths`: local JPG, PNG, GIF or WEBP files)
- `search_tweets`: Search for tweets
- `get_home_timeline`: Get recent tweets from accounts you follow

### `get_home_timeline`

Returns your reverse-chronological home timeline (tweets from you and the accounts you follow), newest first. All parameters are optional:

- `count`: number of tweets to return (1-100)
- `since_days`: only return tweets from the last N days, e.g. `1`, `3` or `7` (max 30)
- `start_time`: only return tweets created after this ISO 8601 UTC timestamp, e.g. `2024-01-01T00:00:00Z`

Use either `since_days` or `start_time`, not both.

> **Note:** The home timeline endpoint (`GET /2/users/:id/timelines/reverse_chronological`) is not available on the Free X API tier. You need a paid tier (Basic or higher); on the Free tier this tool returns a Twitter API error.

## Example Usage

Try asking Claude:
- "Can you post a tweet saying 'Hello from Claude!'"
- "Can you post a tweet saying 'New logo!' with the image /Users/me/Pictures/logo.png"
- "Can you search for tweets about Claude AI?"
- "What have the accounts I follow posted in the last 3 days?"

## Troubleshooting

Logs can be found at:
- **Windows**: `%APPDATA%\Claude\logs\mcp-server-twitter.log`
- **macOS**: `~/Library/Logs/Claude/mcp-server-twitter.log`


## Development

If you want to contribute or run from source:

1. Clone the repository:
```bash
git clone https://github.com/EnesCinr/twitter-mcp.git
cd twitter-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build:
```bash
npm run build
```

4. Run:
```bash
npm start
```



## Running evals

The evals package loads an mcp client that then runs the index.ts file, so there is no need to rebuild between tests. You can load environment variables by prefixing the npx command. Full documentation can be found [here](https://www.mcpevals.io/docs).

```bash
OPENAI_API_KEY=your-key  npx mcp-eval src/evals/evals.ts src/index.ts
```
## License

MIT
