package edu.icet.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Envelope for every API response.
 * Success: { "success": true,  "message": "...", "data": {...} }
 * Failure: { "success": false, "message": "...", "error": { "code": "...", "fields": {...} } }
 * The HTTP status code carries the outcome; the body never repeats it.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private ApiError error;

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    public static ApiResponse<Void> failure(String message, ApiError error) {
        return new ApiResponse<>(false, message, null, error);
    }
}
