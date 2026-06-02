import RedisModule from 'ioredis';

// ioredis default export handling for ESM
const Redis = RedisModule.default ?? RedisModule;

// Reuse connection across Lambda invocations (connection stays warm outside handler)
let redisClient: InstanceType<typeof Redis> | null = null;

export function getRedisClient(): InstanceType<typeof Redis> {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
  }
  return redisClient;
}
