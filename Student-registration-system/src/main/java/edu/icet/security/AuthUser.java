package edu.icet.security;

import edu.icet.util.Role;

/** Authenticated principal built from the access token; inject with {@code @AuthenticationPrincipal}. */
public record AuthUser(Integer id, String email, Role role) {
}
