# Distributed API Rate Limiter 🚦

A production-ready, distributed rate limiter built with Node.js, Express, and Redis. This project implements the **Sliding Window algorithm** to handle high-volume API traffic gracefully, preventing server overloads and abuse.

## ✨ Key Features

* **Atomic Operations:** Uses Redis Lua scripts to eliminate race conditions during concurrent API requests.
* **Fail-Open Architecture:** If Redis crashes or times out (>10ms), the system seamlessly falls back to an in-memory local cache to keep your API online.
* **Sliding Window Algorithm:** Accurately drops old requests over time for smooth, rolling limits.
* **Standardized Headers:** Returns proper `429 Too Many Requests` status codes with `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.

## 🚀 Tech Stack

* **Backend:** Node.js, Express
* **Caching & Concurrency:** Redis (ioredis)
* **Configuration:** dotenv

## 🛠️ Quick Start

### 1. Prerequisites
You will need Node.js and Docker installed on your machine.

### 2. Install Dependencies
```bash
npm install express ioredis dotenv
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=5
```

### 4. Start the Application
Start your local Redis instance via Docker:
```bash
docker run -p 6379:6379 -d redis
```

Start the API Gateway:
```bash
node server.js
```

### 5. Run the Tests
We included a test script that fires 10 concurrent requests to prove the Lua script prevents race conditions. In a new terminal, run:
```bash
node test.js
```

> **To test the Fail-Open policy:** Stop your Redis docker container (`docker stop <container_id>`) while the Node server is running, and run `node test.js` again. The API will stay up using the local fallback cache!