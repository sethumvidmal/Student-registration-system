package edu.icet.repository;

import edu.icet.entity.AuthIdentityEntity;
import edu.icet.util.UserStatus;
import org.springframework.data.repository.CrudRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface AuthIdentityRepository extends CrudRepository<AuthIdentityEntity, Integer> {
    Optional<AuthIdentityEntity> findFirstByUserId(Integer userId);

    /** True while the user is active and holds an unexpired refresh-token session (i.e. has not logged out). */
    boolean existsByUserIdAndStatusAndRefreshTokenExpiresAtAfter(
            Integer userId, UserStatus status, LocalDateTime now);
}
