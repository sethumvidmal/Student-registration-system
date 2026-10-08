package edu.icet.config;

import edu.icet.security.AuthUser;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {
    /** Recorded as created_by / modified_by when no user is logged in (seeding, login). */
    public static final int SYSTEM_USER_ID = 0;

    @Bean
    public AuditorAware<Integer> auditorAware() {
        return () -> {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof AuthUser authUser) {
                return Optional.of(authUser.id());
            }
            return Optional.of(SYSTEM_USER_ID);
        };
    }
}
