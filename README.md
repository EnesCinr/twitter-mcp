[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/enescinr-twitter-mcp-badge.png)](https://mseep.ai/app/enescinr-twitter-mcp)

# Twitter MCP Server

[![smithery badge](https://smithery.ai/badge/@enescinar/twitter-mcp)](https://smithery.ai/server/@enescinar/twitter-mcp)

This MCP server allows Clients to interact with Twitter, enabling posting tweets and searching Twitter.

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

- `post_tweet`: Post a new tweet
- `post_tweet_with_image`: Post a tweet with an image (supports JPG, JPEG, PNG, GIF, WEBP)
- `search_tweets`: Search for tweets

## Example Usage

Try asking Claude:
- "Can you post a tweet saying 'Hello from Claude!'"
- "Post a tweet with the image at /path/to/image.png saying 'Check this out!'"
- "Can you search for tweets about Claude AI?"

### Posting a Tweet with an Image

The `post_tweet_with_image` tool accepts:
- `text` (required): The tweet content (max 280 characters)
- `image_path` (required): Local file path to the image
- `reply_to_tweet_id` (optional): Tweet ID to reply to

Supported image formats: **JPG, JPEG, PNG, GIF, WEBP**


**Important:** If you want to provide an image using a file path, the **File System MCP server** must be added to your MCP client, and the image must be in a folder that the server has access to. For example, if you have granted the Filesystem MCP Server access to your Desktop folder, you can say: *"Take the image myimage.png from my desktop and post it with the caption 'Hello world!'"*

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
