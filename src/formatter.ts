import { FormattedTweet, Tweet, TwitterUser, SearchResponse, TimelineResponse } from './types.js';

export class ResponseFormatter {
  static formatTweet(tweet: Tweet, user: TwitterUser, position: number): FormattedTweet {
    return {
      position,
      author: {
        username: user.username
      },
      content: tweet.text,
      metrics: tweet.metrics,
      createdAt: tweet.createdAt,
      url: `https://twitter.com/${user.username}/status/${tweet.id}`
    };
  }

  static formatSearchResponse(
    query: string,
    tweets: Tweet[],
    users: TwitterUser[]
  ): SearchResponse {
    const formattedTweets = this.formatTweets(tweets, users);

    return {
      query,
      count: formattedTweets.length,
      tweets: formattedTweets
    };
  }

  static formatTimelineResponse(
    tweets: Tweet[],
    users: TwitterUser[],
    startTime?: string
  ): TimelineResponse {
    const formattedTweets = this.formatTweets(tweets, users);

    return {
      startTime,
      count: formattedTweets.length,
      tweets: formattedTweets
    };
  }

  private static formatTweets(tweets: Tweet[], users: TwitterUser[]): FormattedTweet[] {
    const userMap = new Map(users.map(user => [user.id, user]));

    return tweets
      .map((tweet, index) => {
        const user = userMap.get(tweet.authorId);
        if (!user) return null;

        return this.formatTweet(tweet, user, index + 1);
      })
      .filter((tweet): tweet is FormattedTweet => tweet !== null);
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

  static timelineToMcpResponse(response: TimelineResponse): string {
    const header = [
      'TWITTER HOME TIMELINE',
      `Since: ${response.startTime ?? 'most recent'}`,
      `Found ${response.count} tweets`,
      '='
    ].join('\n');

    if (response.count === 0) {
      return header + '\nNo tweets found in your home timeline for this period.';
    }

    const tweetBlocks = response.tweets.map(tweet => [
      `Tweet #${tweet.position}`,
      `From: @${tweet.author.username}`,
      `Posted: ${tweet.createdAt}`,
      `Content: ${tweet.content}`,
      `Metrics: ${tweet.metrics.likes} likes, ${tweet.metrics.retweets} retweets`,
      `URL: ${tweet.url}`,
      '='
    ].join('\n'));

    return [header, ...tweetBlocks].join('\n\n');
  }
}
