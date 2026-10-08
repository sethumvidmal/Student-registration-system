package edu.icet.service;

import edu.icet.dto.AuthResponse;
import edu.icet.dto.LoginRequest;
import edu.icet.dto.RefreshTokenRequest;
import edu.icet.dto.UserDTO;
import edu.icet.entity.AuthIdentityEntity;
import edu.icet.entity.UserEntity;
import edu.icet.exception.ApiException;
import edu.icet.exception.ErrorCode;
import edu.icet.repository.AuthIdentityRepository;
import edu.icet.repository.UserRepository;
import edu.icet.security.AuthUser;
import edu.icet.security.JwtService;
import edu.icet.util.UserStatus;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private static final String TOKEN_TYPE = "Bearer";
    private static final String INVALID_CREDENTIALS = "Invalid email/phone or password";

    private final UserRepository userRepository;
    private final AuthIdentityRepository authIdentityRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getEmailOrPhone().trim();
        UserEntity user = userRepository.findByEmailIgnoreCaseOrPhone(identifier, identifier)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_CREDENTIALS, INVALID_CREDENTIALS));

        AuthIdentityEntity auth = authIdentityRepository.findFirstByUserId(user.getId())
                .filter(identity -> identity.getPassword() != null
                        && passwordEncoder.matches(request.getPassword(), identity.getPassword()))
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_CREDENTIALS, INVALID_CREDENTIALS));

        // Checked after the password so account state is not revealed to anyone guessing
        if (auth.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(ErrorCode.ACCOUNT_INACTIVE,
                    "Account is " + auth.getStatus().name().toLowerCase() + ". Please contact an administrator.");
        }
        return startSession(user, auth);
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();
        Integer userId;
        try {
            userId = Integer.valueOf(jwtService.parseRefreshToken(refreshToken).getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            throw new ApiException(ErrorCode.INVALID_REFRESH_TOKEN, "Invalid or expired refresh token");
        }

        // Only the latest refresh token is stored, so a rotated or logged-out token is rejected
        AuthIdentityEntity auth = authIdentityRepository.findFirstByUserId(userId)
                .filter(identity -> identity.getStatus() == UserStatus.ACTIVE)
                .filter(identity -> matchesStoredHash(refreshToken, identity.getRefreshTokenHash()))
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_REFRESH_TOKEN,
                        "Refresh token is no longer valid, please log in again"));
        return startSession(auth.getUser(), auth);
    }

    @Override
    @Transactional
    public void logout(AuthUser authUser) {
        authIdentityRepository.findFirstByUserId(authUser.id()).ifPresent(auth -> {
            auth.clearSession();
            authIdentityRepository.save(auth);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public UserDTO getCurrentUser(AuthUser authUser) {
        return userRepository.findById(authUser.id())
                .map(AuthServiceImpl::toUserDTO)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED, "User not found"));
    }

    private AuthResponse startSession(UserEntity user, AuthIdentityEntity auth) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        LocalDateTime now = LocalDateTime.now();
        auth.setRefreshTokenHash(hash(refreshToken));
        auth.setRefreshTokenCreatedAt(now);
        auth.setRefreshTokenExpiresAt(now.plus(jwtService.getRefreshExpiration()));
        authIdentityRepository.save(auth);

        return new AuthResponse(accessToken, refreshToken, TOKEN_TYPE,
                jwtService.getAccessExpiration().toSeconds(), toUserDTO(user));
    }

    private static UserDTO toUserDTO(UserEntity user) {
        return new UserDTO(user.getId(), user.getFirstName(), user.getLastName(),
                user.getEmail(), user.getPhone(), user.getRole());
    }

    private static boolean matchesStoredHash(String token, String storedHash) {
        return storedHash != null && MessageDigest.isEqual(
                hash(token).getBytes(StandardCharsets.UTF_8), storedHash.getBytes(StandardCharsets.UTF_8));
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
