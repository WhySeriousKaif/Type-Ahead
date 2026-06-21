package com.searchiq.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Query — MongoDB document model.
 *
 * Each document stores one unique search query with:
 * - count:          all-time search count (baseline for suggestions)
 * - recentCount:    searches in last 1 hour (for trending boost)
 * - recentSearches: list of timestamps for the sliding 1-hour window
 * - lastSearched:   most recent search timestamp
 *
 * TRENDING FORMULA: score = count + recentCount * 10
 */
@Document(collection = "queries")
@CompoundIndex(name = "count_recent_idx", def = "{'count': -1, 'recentCount': -1}")
public class Query {

    @Id
    private String id;

    @Indexed
    private String query;

    @Indexed
    private long count = 1;

    private long recentCount = 0;

    private Instant lastSearched = Instant.now();

    private List<Instant> recentSearches = new ArrayList<>();

    // --- Constructors ---
    public Query() {}

    // --- Getters ---
    public String        getId()             { return id; }
    public String        getQuery()          { return query; }
    public long          getCount()          { return count; }
    public long          getRecentCount()    { return recentCount; }
    public Instant       getLastSearched()   { return lastSearched; }
    public List<Instant> getRecentSearches() { return recentSearches; }

    // --- Setters ---
    public void setId(String id)                        { this.id = id; }
    public void setQuery(String query)                  { this.query = query; }
    public void setCount(long count)                    { this.count = count; }
    public void setRecentCount(long recentCount)        { this.recentCount = recentCount; }
    public void setLastSearched(Instant lastSearched)   { this.lastSearched = lastSearched; }
    public void setRecentSearches(List<Instant> recent) { this.recentSearches = recent; }

    /** Computed trending score — not stored in DB */
    public long getScore() { return count + recentCount * 10; }
}
