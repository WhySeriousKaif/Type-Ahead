package com.searchiq.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

/**
 * CorsConfig — allows the React frontend to call our Spring Boot API.
 *
 * Without this, browsers block cross-origin requests (different port = different origin).
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${searchiq.cors.allowed-origins:http://localhost:5175}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
