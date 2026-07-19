[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/enescinr-twitter-mcp-badge.png)](https://mseep.ai/app/enescinr-twitter-mcp)

# Twitter MCP Server

[![smithery badge](https://smithery.ai/badge/@enescinar/twitter-mcp)](https://smithery.ai/server/@enescinar/twitter-mcp)

This MCP server lets clients search, read, and post on X.

<a href="https://glama.ai/mcp/servers/dhsudtc7cd">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/dhsudtc7cd/badge" alt="Twitter Server MCP server" />
</a>

## Quick Start

Choose the credentials that match the tools you need:

- For search and read tools, create an API key at [Xquik](https://xquik.com).
- For posting and search, create credentials in the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard).
- Configure both to use Xquik for reads and Twitter API v2 for posts.

Add the server to your Claude Desktop configuration:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Xquik read tools

This integration uses Xquik only for read operations.
Xquik is an independent third-party service. Not affiliated with X Corp.

```json
{
  "mcpServers": {
    "twitter-mcp": {
      "command": "npx",
      "args": ["-y", "@enescinar/twitter-mcp"],
      "env": {
        "XQUIK_API_KEY": "xq_your_key"
      }
    }
  }
}
```

### Twitter API v2 posting

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

Restart Claude Desktop after saving the configuration.

Available tools depend on the configured credentials:

- `search_tweets`: Search for posts with either backend
- `get_tweet`: Read a post with Xquik
- `get_user`: Read a user profile with Xquik
- `get_trends`: Read regional trends with Xquik
- `post_tweet`: Post with Twitter API v2 credentials

## Example Usage

Try asking Claude:
- "Can you post a tweet saying 'Hello from Claude!'"
- "Can you search for tweets about Claude AI?"
- "What is trending globally?"

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
