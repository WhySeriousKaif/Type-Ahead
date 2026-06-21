package com.searchiq.controller;

import com.searchiq.service.SuggestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * SuggestionController — handles GET /api/suggest?q=<prefix>
 *
 * Called by the React frontend 300ms after the user stops typing.
 * Returns up to 10 suggestions ranked by score = count + recentCount * 10.
 */
@RestController
@RequestMapping("/api")
public class SuggestionController {

    private final SuggestionService suggestionService;

    public SuggestionController(SuggestionService suggestionService) {
        this.suggestionService = suggestionService;
    }

    /**
     * GET /api/suggest?q=iph
     * Returns: { "suggestions": [...], "prefix": "iph" }
     */
    @GetMapping("/suggest")
    public ResponseEntity<Map<String, Object>> suggest(
            @RequestParam(value = "q", defaultValue = "") String q) {

        if (q.isBlank()) {
            return ResponseEntity.ok(Map.of(
                    "suggestions", List.of(),
                    "source",      "empty-input"
            ));
        }

        List<Map<String, Object>> suggestions = suggestionService.getSuggestions(q.trim());
        return ResponseEntity.ok(Map.of(
                "suggestions", suggestions,
                "prefix",      q.trim()
        ));
    }
}
