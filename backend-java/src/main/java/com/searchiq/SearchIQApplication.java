package com.searchiq;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * SearchIQApplication — Spring Boot entry point.
 *
 * @EnableScheduling activates the @Scheduled annotation used by
 * BatchWriterService to flush the in-memory write buffer every 30 seconds.
 */
@SpringBootApplication
@EnableScheduling
public class SearchIQApplication {

    public static void main(String[] args) {
        SpringApplication.run(SearchIQApplication.class, args);
        System.out.println("""
                [STARTUP] ✅ SearchIQ Backend running
                [STARTUP] Available endpoints:
                  GET  /api/suggest?q=<prefix>
                  POST /api/search
                  GET  /api/trending
                  GET  /api/cache/debug?prefix=<prefix>
                  GET  /api/metrics
                  GET  /api/health
                """);
    }
}
