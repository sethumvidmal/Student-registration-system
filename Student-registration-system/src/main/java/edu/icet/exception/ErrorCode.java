package edu.icet.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Error codes returned in {@code error.code}, each tied to the HTTP status it is sent with. */
@Getter
public enum ErrorCode {
    // 400
    BAD_REQUEST(HttpStatus.BAD_REQUEST),
    MALFORMED_REQUEST(HttpStatus.BAD_REQUEST),
    // 401
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED),
    // 403
    ACCESS_DENIED(HttpStatus.FORBIDDEN),
    ACCOUNT_INACTIVE(HttpStatus.FORBIDDEN),
    // 404
    ENDPOINT_NOT_FOUND(HttpStatus.NOT_FOUND),
    STUDENT_NOT_FOUND(HttpStatus.NOT_FOUND),
    // 409
    DATA_CONFLICT(HttpStatus.CONFLICT),
    STALE_DATA(HttpStatus.CONFLICT),
    NIC_ALREADY_EXISTS(HttpStatus.CONFLICT),
    // 422
    VALIDATION_ERROR(HttpStatus.UNPROCESSABLE_ENTITY),
    // 500
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus status;

    ErrorCode(HttpStatus status) {
        this.status = status;
    }
}
