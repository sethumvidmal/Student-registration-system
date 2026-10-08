package edu.icet.controller;

import edu.icet.dto.ApiResponse;
import edu.icet.dto.AuthResponse;
import edu.icet.dto.LoginRequest;
import edu.icet.dto.RefreshTokenRequest;
import edu.icet.dto.UserDTO;
import edu.icet.security.AuthUser;
import edu.icet.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return new ApiResponse<>(HttpStatus.OK.value(), "User logged in successfully", authService.login(request));
    }

    @PostMapping("/refresh-token")
    public ApiResponse<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return new ApiResponse<>(HttpStatus.OK.value(), "Generated new access token", authService.refreshToken(request));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@AuthenticationPrincipal AuthUser authUser) {
        authService.logout(authUser);
        return new ApiResponse<>(HttpStatus.OK.value(), "User logged out successfully", null);
    }

    @GetMapping("/me")
    public ApiResponse<UserDTO> me(@AuthenticationPrincipal AuthUser authUser) {
        return new ApiResponse<>(HttpStatus.OK.value(), "Current user", authService.getCurrentUser(authUser));
    }
}
