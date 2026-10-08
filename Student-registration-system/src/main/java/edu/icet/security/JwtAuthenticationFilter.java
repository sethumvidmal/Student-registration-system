package edu.icet.security;

import edu.icet.repository.AuthIdentityRepository;
import edu.icet.util.Role;
import edu.icet.util.UserStatus;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Authenticates requests carrying a valid Bearer access token. The user must
 * still be active and logged in, so logout or blocking a user takes effect
 * immediately instead of when the access token expires.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final AuthIdentityRepository authIdentityRepository;

    public JwtAuthenticationFilter(JwtService jwtService, AuthIdentityRepository authIdentityRepository) {
        this.jwtService = jwtService;
        this.authIdentityRepository = authIdentityRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            authenticate(header.substring(BEARER_PREFIX.length()), request);
        }
        filterChain.doFilter(request, response);
    }

    private void authenticate(String token, HttpServletRequest request) {
        AuthUser authUser;
        try {
            Claims claims = jwtService.parseAccessToken(token);
            authUser = new AuthUser(
                    Integer.valueOf(claims.getSubject()),
                    claims.get(JwtService.CLAIM_EMAIL, String.class),
                    Role.valueOf(claims.get(JwtService.CLAIM_ROLE, String.class)));
        } catch (JwtException | IllegalArgumentException e) {
            // Leave the request unauthenticated; protected endpoints answer 401
            return;
        }

        boolean sessionActive = authIdentityRepository.existsByUserIdAndDeletedFalseAndStatusAndRefreshTokenExpiresAtAfter(
                authUser.id(), UserStatus.ACTIVE, LocalDateTime.now());
        if (!sessionActive) {
            return;
        }

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                authUser, null, List.of(new SimpleGrantedAuthority("ROLE_" + authUser.role().name())));
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
