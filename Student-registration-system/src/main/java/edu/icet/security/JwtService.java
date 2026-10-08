package edu.icet.security;

import edu.icet.config.JwtProperties;
import edu.icet.entity.UserEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.UUID;

/**
 * Issues and verifies access and refresh tokens. They are signed with
 * different secrets, so one can never be used in place of the other.
 */
@Service
public class JwtService {
    public static final String CLAIM_EMAIL = "email";
    public static final String CLAIM_ROLE = "role";

    private final JwtProperties jwtProperties;
    private final SecretKey accessKey;
    private final SecretKey refreshKey;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        // hmacShaKeyFor rejects secrets shorter than 256 bits, failing fast on weak config
        this.accessKey = Keys.hmacShaKeyFor(jwtProperties.secret().getBytes(StandardCharsets.UTF_8));
        this.refreshKey = Keys.hmacShaKeyFor(jwtProperties.refreshSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(UserEntity user) {
        return buildToken(user, accessKey, jwtProperties.accessExpiration());
    }

    public String generateRefreshToken(UserEntity user) {
        return buildToken(user, refreshKey, jwtProperties.refreshExpiration());
    }

    /** @throws JwtException if the token is malformed, tampered with or expired */
    public Claims parseAccessToken(String token) {
        return parse(token, accessKey);
    }

    /** @throws JwtException if the token is malformed, tampered with or expired */
    public Claims parseRefreshToken(String token) {
        return parse(token, refreshKey);
    }

    public Duration getAccessExpiration() {
        return jwtProperties.accessExpiration();
    }

    public Duration getRefreshExpiration() {
        return jwtProperties.refreshExpiration();
    }

    private String buildToken(UserEntity user, SecretKey key, Duration expiration) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(String.valueOf(user.getId()))
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim(CLAIM_ROLE, user.getRole().name())
                .issuedAt(new Date(now))
                .expiration(new Date(now + expiration.toMillis()))
                .signWith(key)
                .compact();
    }

    private Claims parse(String token, SecretKey key) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
