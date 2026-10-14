const Redis = require('ioredis');

// Configure Redis with a strict 10ms timeout for the fail-open requirement
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  commandTimeout: 10, // Fails fast if Redis is unresponsive
  maxRetriesPerRequest: 1
});

// Define the Sliding Window Lua Script
// We use a Sorted Set (ZSET) where both the value and the score are the timestamp.
const slidingWindowScript = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local clearBefore = now - window

  -- 1. Remove requests outside the current time window
  redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

  -- 2. Count how many requests are currently in the window
  local currentRequests = redis.call('ZCARD', key)

  -- 3. If under the limit, add the new request and update expiry
  if currentRequests < limit then
    redis.call('ZADD', key, now, now)
    -- Set TTL on the key to prevent memory leaks if the user stops sending requests
    redis.call('PEXPIRE', key, window)
    return { 1, currentRequests + 1 } -- 1 means allowed
  else
    return { 0, currentRequests }     -- 0 means blocked
  end
`;

// Register the script so we can call it cleanly later
redis.defineCommand('checkRateLimit', {
  numberOfKeys: 1,
  lua: slidingWindowScript,
});

module.exports = redis;