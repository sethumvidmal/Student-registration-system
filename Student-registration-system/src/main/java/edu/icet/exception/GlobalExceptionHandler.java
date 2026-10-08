package edu.icet.exception;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import edu.icet.dto.ApiError;
import edu.icet.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Turns every exception thrown while handling a request into a failed {@link ApiResponse}
 * with a matching HTTP status and error code.
 * Errors raised outside controllers (e.g. unknown URLs) are wrapped by ApiErrorController.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Object> handleApiException(ApiException e) {
        return build(e.getErrorCode(), e.getMessage());
    }

    /** Invalid request body or query parameters: 422 with a message per field. */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException e, HttpHeaders headers,
                                                                  HttpStatusCode status, WebRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError fieldError : e.getBindingResult().getFieldErrors()) {
            String message = fieldError.isBindingFailure()
                    ? "Invalid value '" + fieldError.getRejectedValue() + "'"
                    : fieldError.getDefaultMessage();
            fields.putIfAbsent(fieldError.getField(), message);
        }
        return validationError(fields);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException e, HttpHeaders headers,
                                                                  HttpStatusCode status, WebRequest request) {
        // Well-formed JSON with an unknown enum value is a validation problem, not a malformed body
        if (e.getCause() instanceof InvalidFormatException invalid && invalid.getTargetType() != null
                && invalid.getTargetType().isEnum()) {
            String field = invalid.getPath().stream()
                    .map(JsonMappingException.Reference::getFieldName)
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining("."));
            return validationError(Map.of(field, "Invalid value '" + invalid.getValue() + "'. Allowed values: "
                    + Arrays.toString(invalid.getTargetType().getEnumConstants())));
        }
        return build(ErrorCode.MALFORMED_REQUEST, "Malformed request body");
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException e, HttpHeaders headers,
                                                        HttpStatusCode status, WebRequest request) {
        return build(ErrorCode.BAD_REQUEST, "Invalid value '" + e.getValue() + "' for " + e.getPropertyName());
    }

    /** Every other Spring MVC exception (405, 415, missing parameter, ...) ends up here. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception e, Object body, HttpHeaders headers,
                                                             HttpStatusCode status, WebRequest request) {
        String message = e instanceof ErrorResponse errorResponse && errorResponse.getBody().getDetail() != null
                ? errorResponse.getBody().getDetail()
                : e.getMessage();
        return ResponseEntity.status(status)
                .headers(headers)
                .body(ApiResponse.failure(message, new ApiError(codeFor(status))));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Object> handleAuthentication(AuthenticationException e) {
        return build(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> handleAccessDenied(AccessDeniedException e) {
        return build(ErrorCode.ACCESS_DENIED, "Access denied");
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<Object> handleOptimisticLock(ObjectOptimisticLockingFailureException e) {
        return build(ErrorCode.STALE_DATA, "The record was changed by someone else. Reload it and try again.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Object> handleDataIntegrity(DataIntegrityViolationException e) {
        log.warn("Data integrity violation: {}", e.getMostSpecificCause().getMessage());
        return build(ErrorCode.DATA_CONFLICT, "The request conflicts with existing data");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpected(Exception e) {
        log.error("Unhandled exception", e);
        return build(ErrorCode.INTERNAL_ERROR, "Something went wrong. Please try again later.");
    }

    /** Error code for a status that has no dedicated ErrorCode, e.g. METHOD_NOT_ALLOWED. */
    static String codeFor(HttpStatusCode status) {
        HttpStatus resolved = HttpStatus.resolve(status.value());
        return resolved != null ? resolved.name() : ErrorCode.INTERNAL_ERROR.name();
    }

    private static ResponseEntity<Object> validationError(Map<String, String> fields) {
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.getStatus())
                .body(ApiResponse.failure("Validation failed",
                        new ApiError(ErrorCode.VALIDATION_ERROR.name(), fields)));
    }

    private static ResponseEntity<Object> build(ErrorCode errorCode, String message) {
        return ResponseEntity.status(errorCode.getStatus())
                .body(ApiResponse.failure(message, new ApiError(errorCode.name())));
    }
}
