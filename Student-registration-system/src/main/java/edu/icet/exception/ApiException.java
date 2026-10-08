package edu.icet.exception;

import lombok.Getter;

/** Thrown by services to end a request with the given error code, its HTTP status and a message. */
@Getter
public class ApiException extends RuntimeException {
    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
