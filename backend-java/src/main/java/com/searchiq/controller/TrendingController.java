package com.searchiq.controller;

import com.searchiq.service.TrendingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * TrendingController — handles GET /api/trending
 *
 * Returns top 10 queries ranked by:
 *   score = allTimeCount + recentCount(last 1 hour) × 10
 *
 * Polled by the frontend every 30 seconds.
 */
@RestController
@RequestMapping("/api")
public class TrendingController {

    private final TrendingService trendingService;

    public TrendingController(TrendingService trendingService) {
        this.trendingService = trendingService;
    }

    /**
     * GET /api/trending
     * Returns: { "trending": [ { query, count, recentCount, score }, ... ] }
     */
    @GetMapping("/trending")
    public ResponseEntity<Map<String, Object>> trending() {
        List<Map<String, Object>> results = trendingService.getTrending();
        return ResponseEntity.ok(Map.of("trending", results));
    }
}
