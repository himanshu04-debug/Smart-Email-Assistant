package com.mailmind.gmail.security;

import com.mailmind.gmail.model.User;
import com.mailmind.gmail.repository.UserRepository;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final OAuth2AuthorizedClientService authorizedClientService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauthUser = oauthToken.getPrincipal();

        // Extract profile fields from Google
        String googleId = oauthUser.getAttribute("sub");
        String email    = oauthUser.getAttribute("email");
        String name     = oauthUser.getAttribute("name");
        String picture  = oauthUser.getAttribute("picture");

        // Get OAuth2 tokens to call Gmail API later
        OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
            oauthToken.getAuthorizedClientRegistrationId(),
            oauthToken.getName()
        );

        String accessToken  = client.getAccessToken().getTokenValue();
        String refreshToken = client.getRefreshToken() != null
            ? client.getRefreshToken().getTokenValue() : null;
        Instant expiresAt   = client.getAccessToken().getExpiresAt();

        // Upsert user in DB
        User user = userRepository.findByGoogleId(googleId).orElseGet(() ->
            userRepository.findByEmail(email).orElse(User.builder().build())
        );

        user.setGoogleId(googleId);
        user.setEmail(email);
        user.setName(name);
        user.setPicture(picture);
        user.setGmailAccessToken(accessToken);       // In prod: encrypt before storing
        if (refreshToken != null) user.setGmailRefreshToken(refreshToken);
        user.setTokenExpiresAt(expiresAt);

        user = userRepository.save(user);
        log.info("OAuth2 login success for user: {}", email);

        // Issue our own JWT
        String jwt         = jwtUtil.generateAccessToken(user.getId(), user.getEmail());
        String refreshJwt  = jwtUtil.generateRefreshToken(user.getId());

        // Redirect to frontend with tokens in query params
        // (Frontend reads them once and stores in memory / httpOnly cookie)
        String redirectUrl = UriComponentsBuilder
            .fromUriString(frontendUrl + "/auth/callback")
            .queryParam("token",        jwt)
            .queryParam("refreshToken", refreshJwt)
            .queryParam("expiresIn",    jwtUtil.getExpirationMs() / 1000)
            .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
