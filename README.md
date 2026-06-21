# SearchIQ — Complete Project Guide
### How to Run + Project Structure + Viva Preparation

---

## HOW TO RUN THE PROJECT

### Step 1 — Start the Spring Boot Backend (Java)

> [!IMPORTANT]
> **Before running Spring Boot**, always kill whatever is already on port 3002 (old Node.js server, previous Spring Boot run, etc.):
> ```bash
> lsof -ti:3002 | xargs kill -9 2>/dev/null
> ```


### Option 1 (Recommended): Build & Run as a Single Unified JAR

We have configured Maven to copy the React frontend build directly into the Spring Boot package. Running this single JAR runs **both** the frontend and backend on port **3002**.

1. **Build the React Frontend:**
   ```bash
   cd /Users/mdkaif/Desktop/HLDPROJEcT/frontend
   npm run build
   ```

2. **Package the unified backend JAR:**
   ```bash
   cd /Users/mdkaif/Desktop/HLDPROJEcT/backend-java
   mvn clean package -DskipTests
   ```

3. **Run the JAR:**
   ```bash
   MONGO_URI="mongodb+srv://kaif00786001_db_user:8aZ7wzk7K8Fp9NT5@cluster0.ptejabv.mongodb.net/typeahead?retryWrites=true&w=majority" \
   java -jar target/searchiq-backend-1.0.0.jar
   ```

4. Open **[http://localhost:3002](http://localhost:3002)** in your browser. Serves both Frontend and Backend API endpoints automatically from a single port!

---

### Option 2: Running in Development Mode (Separate Ports)

If you are developing/making edits and want Hot Module Replacement (HMR):

1. **Start the Spring Boot Backend (Java):**
   Open Terminal 1 and run:

```bash
cd /Users/mdkaif/Desktop/HLDPROJEcT/backend-java

MONGO_URI="mongodb+srv://kaif00786001_db_user:8aZ7wzk7K8Fp9NT5@cluster0.ptejabv.mongodb.net/typeahead?retryWrites=true&w=majority" \
mvn spring-boot:run
```

You will see:
```
[HASH RING] Added node: CacheNodeA → total virtual nodes: 150
[HASH RING] Added node: CacheNodeB → total virtual nodes: 300
[HASH RING] Added node: CacheNodeC → total virtual nodes: 450
[CACHE MANAGER] Initialized 3 nodes with TTL=300000ms
[BATCH WRITER] Started — flush every 30s OR at 100 unique queries
✅ Server running on http://localhost:3002
```

Backend is ready on **http://localhost:3002**

---

### Step 2 — Start the React Frontend

Open Terminal 2 and run:

```bash
cd /Users/mdkaif/Desktop/HLDPROJEcT/frontend

npm run dev
```

You will see:
```
  VITE v5.x.x  ready in 500ms
  ➜  Local:   http://localhost:5175/
```

Open browser at **http://localhost:5175**

---

### Step 3 — Test Backend Endpoints Directly

Open Terminal 3 and run any of these:

```bash
# Check server is alive
curl http://localhost:3002/api/health

# Get suggestions for prefix "iphone"
curl "http://localhost:3002/api/suggest?q=iphone"

# Submit a search (goes to batch buffer)
curl -X POST http://localhost:3002/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "iphone 15"}'

# Get trending searches
curl http://localhost:3002/api/trending

# See consistent hash routing for prefix "iph"
curl "http://localhost:3002/api/cache/debug?prefix=iph"

# See live system metrics
curl http://localhost:3002/api/metrics
```

---

## PROJECT STRUCTURE — IN ORDER (Read This First)

Think of the project as a layered cake. Each layer only talks to the layer below it.

```
Browser (React)
    ↓
REST Controllers  (HTTP layer)
    ↓
Services          (Business logic)
    ↓
Cache / Repository (Data access)
    ↓
MongoDB Atlas     (Database)
```

---

### The 11 Java Files — In Order of Importance

```
backend-java/src/main/java/com/searchiq/
│
│  ① ENTRY POINT
├── SearchIQApplication.java        ← Start here. Boots the whole app.
│
│  ② CONFIGURATION
├── config/
│   └── CorsConfig.java             ← Allows React frontend to call our API
│
│  ③ CORE HLD CONCEPTS (The heart of the assignment)
├── hashing/
│   └── ConsistentHashRing.java     ← THE most important file. Explain this fully.
│
├── cache/
│   ├── CacheNode.java              ← One cache server (HashMap + TTL)
│   └── CacheManager.java          ← Uses the ring to route to correct node
│
├── worker/
│   └── BatchWriterService.java     ← Write buffer (saves 99% DB writes)
│
│  ④ DATABASE LAYER
├── model/
│   └── Query.java                  ← What one search record looks like in MongoDB
├── repository/
│   └── QueryRepository.java        ← Talks to MongoDB (Spring does it automatically)
│
│  ⑤ BUSINESS LOGIC
├── service/
│   ├── SuggestionService.java      ← Cache-first → DB fallback
│   └── TrendingService.java        ← Score formula + 1-hour sliding window
│
│  ⑥ MONITORING
├── metrics/
│   └── MetricsService.java         ← Counts hits, misses, writes, latency
│
│  ⑦ HTTP LAYER (Thin wrappers — just call the services)
└── controller/
    ├── SuggestionController.java   ← GET /api/suggest
    ├── SearchController.java       ← POST /api/search
    ├── CacheController.java        ← GET /api/cache/debug
    ├── TrendingController.java     ← GET /api/trending
    └── MetricsController.java      ← GET /api/metrics
```

---

## WHAT HAPPENS WHEN YOU TYPE "ip" IN THE SEARCH BOX

Follow this exact flow — this is your viva answer for "trace a request":

```
1. You type "ip" in the React search box

2. useDebounce (frontend) waits 300ms after you stop typing
   WHY: prevents an API call for every single keystroke
   "i" → "ip" → "iph" → only "iph" fires an API call

3. Frontend calls: GET /api/suggest?q=ip

4. SuggestionController.java receives the request
   → calls SuggestionService.getSuggestions("ip")

5. SuggestionService normalizes: "ip" → "ip" (lowercase, trimmed)

6. CacheManager.get("ip") is called
   → ConsistentHashRing.getNode("ip") runs:
      a. MD5 hash of "ip" = 1,234,567,890 (some number 0 to 4,294,967,295)
      b. TreeMap.ceilingEntry(1,234,567,890) — walks clockwise on ring
      c. Returns: nodeName = "CacheNodeA"
   → CacheNodeA.get("ip") checks HashMap

   CASE A — CACHE HIT (after warmup):
   → Entry found, not expired (within 5 minutes TTL)
   → Returns suggestions immediately (1-5ms response)
   → DONE ✅

   CASE B — CACHE MISS (first time):
   → Entry not found
   → Continue to step 7

7. QueryRepository asks MongoDB:
   db.queries.find({ query: /^ip/i }).sort({ count: -1 }).limit(50)
   → Returns up to 50 matching documents (takes ~50-100ms)

8. SuggestionService scores each result:
   score = count + recentCount * 10
   Sort by score desc → take top 10

9. CacheManager.set("ip", top10):
   → Hash "ip" → find CacheNodeA
   → Store top10 with TTL = 5 minutes
   → Next request for "ip" → Cache Hit ✅

10. Return top 10 suggestions to frontend
    Frontend shows them in the dropdown
```

---

## WHAT HAPPENS WHEN YOU PRESS ENTER / CLICK SEARCH

```
1. Frontend calls: POST /api/search { "query": "iphone 15" }

2. SearchController receives it
   → calls BatchWriterService.addToBuffer("iphone 15")

3. BatchWriterService — NO database call:
   buffer["iphone 15"] = { count: 1, timestamps: [now] }
   → Returns immediately (< 1ms)

4. Controller responds: { "message": "Searched", "query": "iphone 15" }

5. 30 seconds later (or when 100 unique queries buffered):
   BatchWriterService.flush() is triggered by @Scheduled

6. flush() does ONE MongoDB upsert:
   db.queries.updateOne(
     { query: "iphone 15" },
     { $inc: { count: 1 }, $push: { recentSearches: timestamp } },
     { upsert: true }
   )

7. After flush, cache prefixes are invalidated:
   "i", "ip", "iph", "ipho", "iphon" → deleted from cache
   WHY: the count changed, so old cached suggestions are now wrong
```

---

## WHAT HAPPENS ON GET /api/trending

```
1. TrendingService.getTrending() runs

2. Fetch top 200 documents from MongoDB sorted by count

3. For each document:
   - Filter recentSearches[] to only timestamps within last 1 hour
   - freshRecentCount = how many timestamps survived the filter
   - score = count + freshRecentCount * 10

4. Sort all 200 by score, return top 10

5. Result: queries that are both popular historically AND
   searched a lot in the last hour bubble to the top
```

---

## VIVA PREPARATION — Question by Question

---

### Q1: What is Consistent Hashing? Why did you use it?

**Simple answer:**

Normal approach: `server = hash(key) % 3`
Problem: If you add a 4th server, `% 3` becomes `% 4` and almost every key goes to a new server — your entire cache is wiped.

Consistent hashing fixes this:
- Imagine a clock face (a ring from 0 to 4,294,967,295)
- Each server is placed at some position on this clock
- Each key is hashed to a position, then you walk clockwise to find its server
- Remove one server → only the keys between it and its neighbour move
- For 3 servers, only ~33% of keys are affected instead of ~100%

**In your code:** `ConsistentHashRing.java`
- `TreeMap<Long, String>` = the ring (TreeMap keeps positions sorted automatically)
- `addNode()` = places 150 virtual copies of each node on the ring
- `getNode(key)` = hashes key, calls `treeMap.ceilingEntry(hash)` = clockwise walk

---

### Q2: What are Virtual Nodes? Why 150?

**Simple answer:**

If you only place 3 servers once each on a ring of 4 billion positions, they might cluster together and one server gets 60% of the keys while another gets 10%.

Virtual nodes = fake copies. Each physical server gets 150 fake positions spread all over the ring. Now the load is roughly equal (~33% each).

**In your code:**
```java
for (int i = 0; i < 150; i++) {
    long position = hash(nodeName + "#VN" + i);
    ring.put(position, nodeName);
}
```
`CacheNodeA#VN0`, `CacheNodeA#VN1`, ... `CacheNodeA#VN149` — each goes to a different position.

---

### Q3: What is TTL and Lazy Eviction?

**Simple answer:**

TTL (Time To Live) = expiry time for each cache entry. We set 5 minutes.

**Lazy Eviction** = we don't actively clean expired entries. We only check if something is expired when someone actually tries to read it. If expired → delete it right then and return null.

Why lazy? Running a background job to scan all keys every minute is wasteful. If no one is asking for a prefix, it doesn't matter if it's expired.

**In your code:** `CacheNode.java`
```java
if (Instant.now().isAfter(entry.expiresAt())) {
    store.remove(key);   // ← lazy eviction
    return null;
}
```

---

### Q4: What is Batch Writing? Why not write directly to MongoDB?

**Simple answer:**

If "iphone" is searched 10,000 times in 30 seconds and you write to DB every time:
→ 10,000 MongoDB round-trips → DB overloaded → server slow

Batch writing = collect all searches in memory, write once every 30 seconds:
→ 1 MongoDB round-trip with 10,000 bundled inside it
→ DB does way less work

**In your code:** `BatchWriterService.java`
```java
// In-memory: ConcurrentHashMap (thread-safe for concurrent requests)
buffer.put("iphone", entry.count++)   // no DB call

// @Scheduled runs every 30 seconds:
mongoTemplate.upsert(query, update, Query.class)  // ONE round-trip
```

**Tradeoff (professor WILL ask this):**
If the server crashes before the 30s flush → buffered data is lost.
Production fix: use Kafka (a durable message queue) before the in-memory buffer. Even if the server crashes, Kafka still has the messages.

---

### Q5: What is the Trending Score Formula?

**Simple answer:**

```
score = allTimeCount + recentCount × 10
```

Why not just sort by count?
→ "iphone" with 100,000 searches would always be #1, even when nobody is searching it
→ "IPL Final" with 300 searches but 800 searches in the last hour should trend

With the formula:
- iphone: 100,000 + (5 × 10) = 100,050
- IPL Final: 300 + (800 × 10) = 8,300 ← surfaces during the event

**The sliding window:**
`recentSearches` is an array of timestamps. We filter to only timestamps within the last 1 hour. Old timestamps fall out of the filter automatically as time passes. No cron job needed.

---

### Q6: What is the Cache Hit Rate and why does it improve over time?

**Simple answer:**

First request for "iph" → always a Cache Miss → goes to MongoDB
Second request for "iph" (within 5 minutes) → Cache Hit → returns instantly

After the system warms up (people search the same popular prefixes), 70–90% of requests are served from cache. No DB call needed. This is why search feels instant.

**Metric:**
```
hitRate = cacheHits / (cacheHits + cacheMisses) × 100
```

---

### Q7: Why store recentSearches as an array of timestamps?

**Simple answer:**

We need to know exactly how many searches happened in the last 1 hour, not roughly.

If we only stored `recentCount = 500`, we wouldn't know if those 500 searches happened 10 minutes ago or 55 minutes ago. With exact timestamps we can filter precisely.

**Tradeoff (professor may ask):**
A viral query gets hundreds of timestamps per minute — the array grows unbounded.
Production fix: cap the array at 1000 entries, or use a time-series database like InfluxDB.

---

### Q8: What does @Scheduled do? How is it different from setInterval?

**Simple answer:**

In Node.js:
```javascript
setInterval(flush, 30000)  // runs flush every 30 seconds
```

In Spring Boot Java:
```java
@Scheduled(fixedDelayString = "${searchiq.batch.flush-interval-ms:30000}")
public synchronized void flush() { ... }
```

`@Scheduled` is managed by Spring's thread pool. `fixedDelay` = wait 30s AFTER the previous flush FINISHES before starting the next one (not a fixed rate). `synchronized` ensures two flushes can never run at the same time.

---

### Q9: Why ConcurrentHashMap instead of regular HashMap?

**Simple answer:**

Multiple HTTP request threads call `addToBuffer()` at the same time (concurrent requests). A regular HashMap is not thread-safe — two threads writing at the same moment can corrupt the data.

`ConcurrentHashMap` is designed for concurrent access. It locks only the specific key being written, not the whole map. Much faster than `synchronized HashMap`.

---

### Q10: What does Spring Data MongoDB's QueryRepository do?

**Simple answer:**

Instead of writing MongoDB queries manually, Spring Data reads the method name and generates the query automatically:

```java
// You write just this method signature:
List<Query> findByQueryRegexOrderByCountDesc(Pattern regex);

// Spring generates this MongoDB query automatically:
// db.queries.find({ query: /^iph/i }).sort({ count: -1 })
```

No SQL, no boilerplate query code. Spring figures it out from the method name.

---

### Q11: What is p95 Latency?

**Simple answer:**

If you record the response time of 1000 requests, p95 is the response time that 95% of requests were faster than.

Example:
- Cache hits: p95 = 5ms (95% of cache-hit requests finish in under 5ms)
- Cache misses: p95 = 100ms (95% of DB-fallback requests finish in under 100ms)

This is more useful than average latency because it tells you the worst-case experience for most users (ignoring outliers).

---

## DRAW THIS IN YOUR VIVA (Architecture Diagram)

```
Browser (React)
     │
     │  GET /api/suggest?q=iph  (300ms debounce)
     ▼
┌─────────────────────────────────────────────┐
│           Spring Boot (port 3002)           │
│                                             │
│  SuggestionController                       │
│        ↓                                    │
│  SuggestionService                          │
│        ↓                                    │
│  CacheManager ──→ ConsistentHashRing        │
│        ↓         hash("iph") → CacheNodeB  │
│  CacheNodeB                                 │
│  [HashMap: "iph" → [10 suggestions]]        │
│        ↓ MISS                               │
│  QueryRepository ──→ MongoDB Atlas          │
│        ↓                                    │
│  Score & re-rank (count + recent*10)        │
│        ↓                                    │
│  CacheManager.set("iph", results)           │
└─────────────────────────────────────────────┘

POST /api/search ──→ BatchWriterService
                          ↓
                     ConcurrentHashMap
                     { "iphone": count++ }
                          ↓ (every 30s)
                     @Scheduled flush()
                          ↓
                     MongoTemplate.upsert()
                          ↓
                     MongoDB Atlas
```

---

## QUICK REFERENCE — Files and Their Purpose

| File | What it does in one line |
|------|--------------------------|
| `SearchIQApplication.java` | Boots Spring Boot, enables scheduling |
| `CorsConfig.java` | Allows React (port 5175) to call API (port 3002) |
| `ConsistentHashRing.java` | MD5 hash → TreeMap ring → clockwise lookup |
| `CacheNode.java` | HashMap + TTL expiry + hit/miss counter |
| `CacheManager.java` | Picks the right CacheNode for each prefix |
| `BatchWriterService.java` | Buffers writes in memory, flushes every 30s |
| `Query.java` | MongoDB document schema (one search query) |
| `QueryRepository.java` | Spring Data — talks to MongoDB |
| `SuggestionService.java` | Cache → DB → score → cache cycle |
| `TrendingService.java` | Filters 1-hour timestamps, applies score formula |
| `MetricsService.java` | AtomicLong counters for all system stats |
| `SuggestionController.java` | GET /api/suggest |
| `SearchController.java` | POST /api/search |
| `CacheController.java` | GET /api/cache/debug |
| `TrendingController.java` | GET /api/trending |
| `MetricsController.java` | GET /api/metrics + /api/health |

---

## HLD CONCEPT → FILE MAPPING

| HLD Concept | Java File |
|-------------|-----------|
| Consistent Hashing | `ConsistentHashRing.java` |
| Distributed Cache | `CacheNode.java` + `CacheManager.java` |
| TTL + Lazy Eviction | `CacheNode.java` |
| Write Buffer / Batch Processing | `BatchWriterService.java` |
| Trending / Sliding Window | `TrendingService.java` |
| Cache-first Pattern | `SuggestionService.java` |
| Metrics / p95 Latency | `MetricsService.java` |
| Debounce | `SearchBox.jsx` (frontend) |

---

*SearchIQ — Spring Boot + React + MongoDB Atlas + Consistent Hashing + Batch Writes + Trending*
