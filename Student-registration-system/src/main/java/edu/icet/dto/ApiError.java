package edu.icet.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/**
 * Error details of a failed {@link ApiResponse}. {@code code} is a stable, machine-readable
 * identifier (see ErrorCode); {@code fields} maps each invalid field to its message on 422.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(String code, Map<String, String> fields) {
    public ApiError(String code) {
        this(code, null);
    }
}
