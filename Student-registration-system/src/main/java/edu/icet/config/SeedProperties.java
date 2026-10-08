package edu.icet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "seed.super-admin")
public record SeedProperties(
        String firstName,
        String lastName,
        String email,
        String phone,
        String password) {
}
