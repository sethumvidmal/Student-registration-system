package edu.icet.controller;

import edu.icet.dto.ApiResponse;
import edu.icet.dto.AuthResponse;
import edu.icet.dto.LoginRequest;
import edu.icet.dto.RefreshTokenRequest;
import edu.icet.dto.UserDTO;
import edu.icet.security.AuthUser;
import edu.icet.service.AuthService;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Authentication")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @SecurityRequirements // public: no bearer token needed
    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success("User logged in successfully", authService.login(request));
    }

    @SecurityRequirements // public: no bearer token needed
    @PostMapping("/refresh-token")
    public ApiResponse<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.success("Generated new access token", authService.refreshToken(request));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@AuthenticationPrincipal AuthUser authUser) {
        authService.logout(authUser);
        return ApiResponse.success("User logged out successfully", null);
    }

    @GetMapping("/me")
    public ApiResponse<UserDTO> me(@AuthenticationPrincipal AuthUser authUser) {
        return ApiResponse.success("Current user", authService.getCurrentUser(authUser));
    }
}
