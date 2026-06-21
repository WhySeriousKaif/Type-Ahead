/**
 * Query.js — Mongoose Schema
 *
 * Stores each unique search query with:
 * - count:          all-time search count
 * - recentCount:    searches in the last 1 hour (for trending boost)
 * - lastSearched:   timestamp of most recent search
 * - recentSearches: array of recent timestamps for the sliding 1-hour window
 *
 * INDEXING STRATEGY:
 * - query: index for prefix search (regex queries)
 * - count: descending index for fast "top N by count" queries
 * - Compound index on [count, recentCount] for trending sort
 */

import mongoose from 'mongoose';

const querySchema = new mongoose.Schema(
  {
    query: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    count: {
      type: Number,
      default: 1,
      index: true,
    },
    recentCount: {
      type: Number,
      default: 0,
    },
    lastSearched: {
      type: Date,
      default: Date.now,
    },
    recentSearches: {
      type: [Date],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for trending score computation: score = count + recentCount * 10
querySchema.index({ count: -1, recentCount: -1 });

/**
 * Virtual field: computed trending score
 * score = allTimeCount + recentCount * 10
 */
querySchema.virtual('score').get(function () {
  return this.count + this.recentCount * 10;
});

/**
 * Method to prune recentSearches and recompute recentCount.
 */
querySchema.methods.pruneRecentSearches = function () {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  this.recentSearches = this.recentSearches.filter(ts => ts > oneHourAgo);
  this.recentCount = this.recentSearches.length;
};

const Query = mongoose.model('Query', querySchema);

export default Query;
