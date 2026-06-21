package com.searchiq.controller;

import com.searchiq.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * CacheController — handles GET /api/cache/debug?prefix=<prefix>
 *
 * This endpoint is for VIVA DEMONSTRATION — it shows how the consistent
 * hash ring routes any given prefix to a specific cache node.
 *
 * Returns:
 *   - prefix:            the input prefix
 *   - assignedNode:      which CacheNode owns it (A, B, or C)
 *   - hashValue:         the MD5 hash position on the ring (0 to 2^32)
 *   - hit:               true if currently cached, false if not
 *   - cachedResultCount: how many suggestions are cached for this prefix
 *   - ring:              virtual node distribution across all 3 nodes
 */
@RestController
@RequestMapping("/api")
public class CacheController {

    private final CacheManager cacheManager;

    public CacheController(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    /**
     * GET /api/cache/debug?prefix=iph
     */
    @GetMapping("/cache/debug")
    public ResponseEntity<Map<String, Object>> cacheDebug(
            @RequestParam(value = "prefix", defaultValue = "") String prefix) {

        if (prefix.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "prefix query param is required"));
        }

        Map<String, Object> debugInfo    = cacheManager.debug(prefix.trim());
        Map<String, Object> ringStats    = cacheManager.getRingStats();

        Map<String, Object> response = new LinkedHashMap<>(debugInfo);
        response.put("allNodes", cacheManager.getAllNodeStats());
        response.put("ring",     ringStats);

        return ResponseEntity.ok(response);
    }
}
