import { config } from './index';

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    db: parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) || 0 : 0,
    maxRetriesPerRequest: null,
  };
}

export const redisConnectionOptions = config.REDIS_URL
  ? parseRedisUrl(config.REDIS_URL)
  : null;
