package com.mailmind.gmail.controller;

import com.mailmind.gmail.model.User;
import com.mailmind.gmail.repository.UserRepository;
import com.mailmind.gmail.security.JwtUtil;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    /**
     * Returns the Google OAuth2 authorization URL.
     * Frontend opens this URL to begin the Gmail login flow.
     */
    @GetMapping("/google/url")
    public ResponseEntity<Map<String, String>> googleAuthUrl() {
        // Spring Security handles /auth/oauth2/authorize/google automatically.
        // We expose this so the frontend can redirect to it.
        return ResponseEntity.ok(Map.of(
            "url", "/api/auth/oauth2/authorize/google"
        ));
    }

    /**
     * Returns the currently authenticated user's profile.
     * The userId comes from the JWT via the JwtAuthFilter.
     */
    @GetMapping("/me")
    public ResponseEntity<?> currentUser(@RequestHeader("X-User-Id") String userId) {
        return userRepository.findById(userId)
            .map(u -> ResponseEntity.ok(Map.of(
                "id",      u.getId(),
                "email",   u.getEmail(),
                "name",    u.getName() != null ? u.getName() : "",
                "picture", u.getPicture() != null ? u.getPicture() : ""
            )))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Refresh access token using a valid refresh token.
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody RefreshRequest req) {
        if (!jwtUtil.validate(req.getRefreshToken())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid refresh token"));
        }
        String userId = jwtUtil.userId(req.getRefreshToken());
        return userRepository.findById(userId)
            .map(u -> {
                String newAccess  = jwtUtil.generateAccessToken(u.getId(), u.getEmail());
                String newRefresh = jwtUtil.generateRefreshToken(u.getId());
                return ResponseEntity.ok(Map.of(
                    "accessToken",  newAccess,
                    "refreshToken", newRefresh,
                    "expiresIn",    jwtUtil.getExpirationMs() / 1000
                ));
            })
            .orElse(ResponseEntity.status(401).build());
    }

    @Data
    static class RefreshRequest {
        @NotBlank private String refreshToken;
    }
}
