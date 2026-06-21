package com.searchiq.controller;

import com.searchiq.cache.CacheManager;
import com.searchiq.metrics.MetricsService;
import com.searchiq.worker.BatchWriterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * MetricsController — handles GET /api/metrics and GET /api/health
 *
 * Frontend polls /api/metrics every 5 seconds to update the live dashboard.
 * Returns:
 *   - Cache hits, misses, hit rate, miss rate
 *   - DB reads, DB writes
 *   - Batch writes saved (writes absorbed by the buffer)
 *   - p95 latency
 *   - Write buffer status (current queue size)
 *   - Per-node cache stats (hits, misses, entries for each CacheNode)
 */
@RestController
@RequestMapping("/api")
public class MetricsController {

    private final MetricsService     metrics;
    private final BatchWriterService batchWriter;
    private final CacheManager       cacheManager;

    public MetricsController(MetricsService metrics,
                             BatchWriterService batchWriter,
                             CacheManager cacheManager) {
        this.metrics      = metrics;
        this.batchWriter  = batchWriter;
        this.cacheManager = cacheManager;
    }

    /**
     * GET /api/metrics
     */
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        Map<String, Object> snapshot = metrics.getSnapshot();
        Map<String, Object> response = new LinkedHashMap<>(snapshot);
        response.put("batchBuffer", batchWriter.getBufferStatus());
        response.put("cacheNodes",  cacheManager.getAllNodeStats());
        response.put("timestamp",   Instant.now().toString());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "uptime", ProcessHandle.current().info().totalCpuDuration()
                        .map(d -> d.toSeconds() + "s")
                        .orElse("unknown")
        ));
    }
}
