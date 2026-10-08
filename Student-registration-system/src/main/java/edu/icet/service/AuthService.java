package edu.icet.service;

import edu.icet.dto.AuthResponse;
import edu.icet.dto.LoginRequest;
import edu.icet.dto.RefreshTokenRequest;
import edu.icet.dto.UserDTO;
import edu.icet.security.AuthUser;

public interface AuthService {
    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(AuthUser authUser);

    UserDTO getCurrentUser(AuthUser authUser);
}
