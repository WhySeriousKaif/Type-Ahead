package com.searchiq.controller;

import com.searchiq.worker.BatchWriterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * SearchController — handles POST /api/search
 *
 * DESIGN DECISION — Why not write directly to MongoDB here?
 * Under high load (thousands of concurrent searches), synchronous DB writes
 * create a write bottleneck. Instead, we push to the in-memory batch buffer.
 * The buffer aggregates and flushes to MongoDB in bulk every 30 seconds.
 *
 * This endpoint returns immediately — O(1) time, no DB call.
 */
@RestController
@RequestMapping("/api")
public class SearchController {

    private final BatchWriterService batchWriter;

    public SearchController(BatchWriterService batchWriter) {
        this.batchWriter = batchWriter;
    }

    /**
     * POST /api/search
     * Body: { "query": "iphone 15" }
     * Returns: { "message": "Searched", "query": "iphone 15" }
     */
    @PostMapping("/search")
    public ResponseEntity<Map<String, Object>> search(
            @RequestBody Map<String, String> body) {

        String query = body.get("query");

        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "query field is required"));
        }

        String normalized = query.trim().toLowerCase();

        // Add to in-memory buffer — non-blocking, returns immediately
        batchWriter.addToBuffer(normalized);

        return ResponseEntity.ok(Map.of(
                "message", "Searched",
                "query",   normalized
        ));
    }
}
