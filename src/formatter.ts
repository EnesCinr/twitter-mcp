import { FormattedTweet, Tweet, TwitterUser, SearchResponse } from './types.js';

export class ResponseFormatter {
  static formatTweet(tweet: Tweet, user: TwitterUser | undefined, position: number): FormattedTweet {
    const username = user?.username ?? 'unknown';
    return {
      position,
      author: {
        username
      },
      content: tweet.text,
      metrics: tweet.metrics,
      url: user
        ? `https://twitter.com/${username}/status/${tweet.id}`
        : `https://twitter.com/i/web/status/${tweet.id}`
    };
  }

  static formatSearchResponse(
    query: string,
    tweets: Tweet[],
    users: TwitterUser[]
  ): SearchResponse {
    const userMap = new Map(users.map(user => [user.id, user]));
    
    const formattedTweets = tweets
      .map((tweet, index) => this.formatTweet(
        tweet,
        userMap.get(tweet.authorId),
        index + 1
      ));

    return {
      query,
      count: formattedTweets.length,
      tweets: formattedTweets
    };
  }

  static toMcpResponse(response: SearchResponse): string {
    const header = [
      'TWITTER SEARCH RESULTS',
      `Query: "${response.query}"`,
      `Found ${response.count} tweets`,
      '='
    ].join('\n');

    if (response.count === 0) {
      return header + '\nNo tweets found matching your query.';
    }

    const tweetBlocks = response.tweets.map(tweet => [
      `Tweet #${tweet.position}`,
      `From: @${tweet.author.username}`,
      `Content: ${tweet.content}`,
      `Metrics: ${tweet.metrics.likes} likes, ${tweet.metrics.retweets} retweets`,
      `URL: ${tweet.url}`,
      '='
    ].join('\n'));

    return [header, ...tweetBlocks].join('\n\n');
  }
}
