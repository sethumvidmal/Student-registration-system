package edu.icet.entity;

import edu.icet.util.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;

/**
 * Login credentials and the current refresh-token session for a user.
 * Only a SHA-256 hash of the refresh token is stored.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "auth_identities")
@Where(clause = BaseEntity.NOT_DELETED)
public class AuthIdentityEntity extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    private String password;

    @Column(length = 64)
    private String refreshTokenHash;

    private LocalDateTime refreshTokenCreatedAt;

    private LocalDateTime refreshTokenExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    public void clearSession() {
        refreshTokenHash = null;
        refreshTokenCreatedAt = null;
        refreshTokenExpiresAt = null;
    }
}
