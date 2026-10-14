require('dotenv').config();
const express = require('express');
const redis = require('./redisClient');

const app = express();
const port = process.env.PORT || 3000;

// Configuration: 5 requests per 60 seconds
const WINDOW_MS = parseInt(process.env.WINDOW_MS,10); 
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);

// Simple in-memory fallback cache for when Redis fails
const localCache = new Map();

async function rateLimiter(req, res, next) {
  // Use IP address as the unique identifier for the user
  const ip = req.ip || req.connection.remoteAddress;
  const key = `ratelimit:${ip}`;
  const now = Date.now();

  try {
    // 1. Attempt the atomic Lua script in Redis
    const result = await redis.checkRateLimit(key, now, WINDOW_MS, MAX_REQUESTS);
    const [allowed, currentCount] = result;

    // Set standard informational headers
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - currentCount));

    if (allowed === 1) {
      return next();
    } else {
      // 2. Throttling Response: Block request and send Retry-After
      const retryAfterSeconds = Math.ceil(WINDOW_MS / 1000); 
      res.setHeader('Retry-After', retryAfterSeconds);
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Limit exceeded. Try again in ${retryAfterSeconds} seconds.`
      });
    }
    
  } catch (error) {
    // 3. Fail-Open Policy: Redis timed out (>10ms) or crashed
    console.warn(`Redis failed, using local cache for ${ip}:`, error.message);

    // Fetch or initialize local memory record
    const userRecord = localCache.get(ip) || { count: 0, startTime: now };

    // Reset local count if the window has passed
    if (now - userRecord.startTime > WINDOW_MS) {
      userRecord.count = 0;
      userRecord.startTime = now;
    }

    userRecord.count += 1;
    localCache.set(ip, userRecord);

    if (userRecord.count > MAX_REQUESTS) {
      const retryAfter = Math.ceil((WINDOW_MS - (now - userRecord.startTime)) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: 'Too Many Requests (Local Limit)' });
    }

    return next();
  }
}

// Apply the rate limiter to all routes
app.use(rateLimiter);

// A simple protected endpoint
app.get('/api/data', (req, res) => {
  res.json({ message: 'Success! Request processed successfully.' });
});

app.listen(port, () => {
  console.log(`API Gateway running on http://localhost:${port}`);
});