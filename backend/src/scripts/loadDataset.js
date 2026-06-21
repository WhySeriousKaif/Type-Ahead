/**
 * loadDataset.js
 *
 * Reads queries.csv and bulk-inserts into MongoDB.
 *
 * Features:
 * - Streams the CSV (memory efficient for large files)
 * - Batches inserts (1000 at a time) using insertMany with ordered: false
 * - Skips duplicate queries (upsert by query key)
 * - Logs progress every 10,000 rows
 *
 * Run: node src/scripts/loadDataset.js
 * (Run AFTER: node src/scripts/generateDataset.js)
 */

import 'dotenv/config';
import fs       from 'fs';
import path     from 'path';
import { fileURLToPath } from 'url';
import csv      from 'csv-parser';
import mongoose from 'mongoose';
import Query    from '../models/Query.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/typeahead';
const CSV_PATH  = path.join(__dirname, '../../dataset/queries.csv');
const BATCH_SIZE = 1000;

async function loadDataset() {
  console.log('[LOADER] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('[LOADER] ✅ Connected to MongoDB');

  // Clear existing data for fresh load
  const existing = await Query.countDocuments();
  if (existing > 0) {
    console.log(`[LOADER] Found ${existing} existing documents. Clearing for fresh load...`);
    await Query.deleteMany({});
    console.log('[LOADER] Cleared.');
  }

  let batch        = [];
  let totalLoaded  = 0;
  let totalSkipped = 0;
  let batchNumber  = 0;

  const stream = fs.createReadStream(CSV_PATH).pipe(csv());

  for await (const row of stream) {
    const query = (row.query || '').trim().toLowerCase();
    const count = parseInt(row.count) || 1;

    if (!query) { totalSkipped++; continue; }

    batch.push({ query, count, recentCount: 0, lastSearched: new Date() });

    if (batch.length >= BATCH_SIZE) {
      batchNumber++;
      try {
        await Query.insertMany(batch, { ordered: false });
        totalLoaded += batch.length;
      } catch (err) {
        if (err.code !== 11000) {
          console.error(`[LOADER] Batch ${batchNumber} error:`, err.message);
        }
      }
      batch = [];

      if (totalLoaded % 10000 === 0) {
        console.log(`[LOADER] Progress: ${totalLoaded} documents loaded...`);
      }
    }
  }

  // Flush remaining batch
  if (batch.length > 0) {
    try {
      await Query.insertMany(batch, { ordered: false });
      totalLoaded += batch.length;
    } catch (err) {
      if (err.code !== 11000) {
        console.error('[LOADER] Final batch error:', err.message);
      }
    }
  }

  console.log(`[LOADER] ✅ Dataset load complete!`);
  console.log(`         Total loaded: ${totalLoaded}`);
  console.log(`         Total skipped: ${totalSkipped}`);
  console.log(`         DB count: ${await Query.countDocuments()}`);

  await mongoose.disconnect();
  process.exit(0);
}

loadDataset().catch(err => {
  console.error('[LOADER] Fatal error:', err);
  process.exit(1);
});
