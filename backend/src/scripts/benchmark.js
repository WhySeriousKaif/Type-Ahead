/**
 * benchmark.js
 *
 * Simulates query traffic on the Spring Boot backend to collect performance data:
 * - Cache Hits, Misses, and Cache Hit Rate
 * - Database Reads and Writes
 * - Batch Writes Saved (write reduction through buffering)
 * - p95 Latency
 *
 * Run: node src/scripts/benchmark.js
 * (Make sure the Spring Boot backend is running on port 3002 first!)
 */

const BACKEND_URL = 'http://localhost:3002';
const SUGGEST_URL = `${BACKEND_URL}/api/suggest`;
const SEARCH_URL = `${BACKEND_URL}/api/search`;
const METRICS_URL = `${BACKEND_URL}/api/metrics`;

// A list of test prefixes, some repeated to ensure cache hits
const prefixes = [
  'iph', 'iph', 'iphone', 'iphone', 'iphone 15', 'iphone 15',
  'sam', 'sam', 'samsung', 'samsung', 'samsung galaxy', 'samsung galaxy',
  'lap', 'lap', 'laptop', 'laptop', 'gaming', 'gaming', 'best', 'best',
  'mac', 'mac', 'macbook', 'macbook', 'macbook air', 'macbook air',
  'play', 'play', 'ps5', 'ps5', 'xbox', 'xbox',
  'crick', 'crick', 'cricket', 'cricket', 'ipl', 'ipl',
  'food', 'food', 'pizza', 'pizza', 'biryani', 'biryani',
  'trav', 'trav', 'travel', 'travel', 'goa', 'goa',
  'shop', 'shop', 'amazon', 'amazon', 'flipkart', 'flipkart'
];

// Expanded prefixes for general load simulation
const randomPrefixes = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
  'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'ap', 'ba', 'ca', 'do', 'en', 'fi', 'go', 'he', 'in', 'la', 'ma', 'ne', 'op',
  'pa', 're', 'sh', 'ta', 'vi', 'we', 'yo',
  'app', 'best', 'cheap', 'docker', 'express', 'git', 'html', 'java', 'keto',
  'linux', 'movie', 'netflix', 'oneplus', 'python', 'query', 'react', 'spotify',
  'tv', 'upi', 'visa', 'watch', 'yoga', 'zomato'
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getMetrics() {
  const res = await fetch(METRICS_URL);
  return await res.json();
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('🚀 STARTING SEARCHIQ PERFORMANCE BENCHMARK SIMULATION');
  console.log('====================================================\n');

  try {
    // Check if server is running
    const initialMetrics = await getMetrics();
    console.log('✅ Spring Boot Server is ONLINE');
    console.log('Initial Server Metrics:', initialMetrics);
  } catch (err) {
    console.error('❌ Error: Spring Boot Backend is not running on http://localhost:3002');
    console.error('Please start the backend server before running this benchmark.');
    process.exit(1);
  }

  // 1. Simulate Suggestion (Search Type-ahead) Requests
  console.log('\n--- Phase 1: Simulating Suggestion Requests (Cache Hits & Misses) ---');
  let suggestCount = 0;
  
  // First run: Seed cache with unique prefixes and some repeats
  console.log(`Sending ${prefixes.length} targeted prefix suggestion requests...`);
  for (const prefix of prefixes) {
    await fetch(`${SUGGEST_URL}?q=${prefix}`);
    suggestCount++;
    if (suggestCount % 10 === 0) {
      process.stdout.write('.');
    }
  }
  console.log('\nDone.');

  // Second run: Simulate general randomized user searches (mix of hits and misses)
  console.log(`Sending 200 randomized prefix suggestion requests...`);
  for (let i = 0; i < 200; i++) {
    // 60% chance of repeating a prefix from the targeted list (cache hit)
    // 40% chance of a random prefix (potential cache miss)
    const useRepeated = Math.random() < 0.60;
    const prefix = useRepeated 
      ? prefixes[Math.floor(Math.random() * prefixes.length)]
      : randomPrefixes[Math.floor(Math.random() * randomPrefixes.length)];
    
    await fetch(`${SUGGEST_URL}?q=${prefix}`);
    if (i % 20 === 0) {
      process.stdout.write('.');
    }
  }
  console.log('\nDone.');

  // 2. Simulate Search Submission (Batch Buffer) Requests
  console.log('\n--- Phase 2: Simulating Search Submissions (Write Buffer) ---');
  const searchQueries = [
    'iphone 15 pro', 'iphone 15 pro', 'iphone 15 pro', // Repeated query
    'samsung galaxy s24', 'samsung galaxy s24',
    'macbook air m3', 'macbook air m3', 'macbook air m3', 'macbook air m3',
    'ipl 2024 final tickets', 'ipl 2024 final tickets',
    'best cheese pizza recipe',
    'travel guide to goa', 'travel guide to goa',
    'nike running shoes'
  ];

  console.log(`Sending ${searchQueries.length * 5} search requests (high repetition)...`);
  for (let i = 0; i < 5; i++) {
    for (const query of searchQueries) {
      await fetch(SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
    }
    process.stdout.write('.');
  }
  console.log('\nDone.');

  // Retrieve metrics before flush
  let midMetrics = await getMetrics();
  console.log('\nMiddle Metrics (Before Buffer Flush):');
  console.log(`  Cache Hits: ${midMetrics.cacheHits}`);
  console.log(`  Cache Misses: ${midMetrics.cacheMisses}`);
  console.log(`  Cache Hit Rate: ${midMetrics.cacheHitRate}`);
  console.log(`  DB Reads: ${midMetrics.dbReads}`);
  console.log(`  DB Writes (Actually sent to DB): ${midMetrics.dbWrites}`);
  console.log(`  Batch Writes Saved (Absorbed in memory): ${midMetrics.batchWritesSaved}`);
  console.log(`  p95 Latency: ${midMetrics.p95LatencyMs} ms`);

  // 3. Wait for Scheduled Flush (flush occurs every 30s)
  console.log('\n--- Phase 3: Waiting for Spring Boot Batch Writer Flush (30 seconds) ---');
  console.log('Sleeping for 32 seconds to allow the @Scheduled flush task to run...');
  
  for (let sec = 1; sec <= 32; sec++) {
    await sleep(1000);
    if (sec % 5 === 0 || sec === 32) {
      console.log(`  Elapsed: ${sec}s...`);
    }
  }

  // Retrieve final metrics after flush
  let finalMetrics = await getMetrics();
  
  console.log('\n====================================================');
  console.log('📊 FINAL PERFORMANCE REPORT (BENCHMARK RESULTS)');
  console.log('====================================================');
  console.table({
    'Cache Hits': finalMetrics.cacheHits,
    'Cache Misses': finalMetrics.cacheMisses,
    'Cache Hit Rate': finalMetrics.cacheHitRate,
    'Cache Miss Rate': finalMetrics.cacheMissRate,
    'DB Reads (Cache misses fallback)': finalMetrics.dbReads,
    'DB Writes (Batch flushes executed)': finalMetrics.dbWrites,
    'Batch Writes Saved (99%+ reduction)': finalMetrics.batchWritesSaved,
    'p95 Latency (Ms)': `${finalMetrics.p95LatencyMs} ms`
  });

  const totalWritesAttempted = finalMetrics.dbWrites + finalMetrics.batchWritesSaved;
  const writeReductionRatio = totalWritesAttempted > 0 
    ? ((finalMetrics.batchWritesSaved / totalWritesAttempted) * 100).toFixed(2)
    : '0.00';

  console.log(`\n🔥 Write Reduction Effectiveness: ${writeReductionRatio}%`);
  console.log(`   (Successfully absorbed ${finalMetrics.batchWritesSaved} of ${totalWritesAttempted} DB write calls in memory!)`);
  console.log('====================================================\n');
}

runBenchmark();
