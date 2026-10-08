package edu.icet.config;

import edu.icet.entity.AuthIdentityEntity;
import edu.icet.entity.UserEntity;
import edu.icet.repository.UserRepository;
import edu.icet.util.Role;
import edu.icet.util.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Creates the default super admin account on startup if it does not exist yet. */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SeedProperties seedProperties;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedSuperAdmin();
    }

    private void seedSuperAdmin() {
        if (userRepository.existsByEmailIgnoreCaseOrPhone(seedProperties.email(), seedProperties.phone())) {
            log.info("Super admin already exists. Skipping creation.");
            return;
        }

        UserEntity user = new UserEntity();
        user.setFirstName(seedProperties.firstName());
        user.setLastName(seedProperties.lastName());
        user.setEmail(seedProperties.email());
        user.setPhone(seedProperties.phone());
        user.setRole(Role.SUPER_ADMIN);

        AuthIdentityEntity authIdentity = new AuthIdentityEntity();
        authIdentity.setPassword(passwordEncoder.encode(seedProperties.password()));
        authIdentity.setStatus(UserStatus.ACTIVE);
        user.addAuthIdentity(authIdentity);

        userRepository.save(user);
        log.info("Super admin created: {}", seedProperties.email());
    }
}
