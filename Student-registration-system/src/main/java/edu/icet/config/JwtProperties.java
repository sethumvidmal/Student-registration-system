package edu.icet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        String secret,
        String refreshSecret,
        Duration accessExpiration,
        Duration refreshExpiration) {
}
