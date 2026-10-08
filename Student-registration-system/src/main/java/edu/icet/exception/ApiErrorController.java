package edu.icet.exception;

import edu.icet.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Replaces Spring Boot's default /error page so errors raised outside controllers
 * (unknown URLs, filter failures) still use the { status, message, data } wrapper.
 */
@Hidden
@RestController
public class ApiErrorController implements ErrorController {

    @RequestMapping("/error")
    public ResponseEntity<ApiResponse<Void>> error(HttpServletRequest request) {
        Object code = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        HttpStatus status = code instanceof Integer statusCode ? HttpStatus.resolve(statusCode) : null;
        if (status == null) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        String message = status == HttpStatus.NOT_FOUND
                ? "No endpoint found for " + request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI)
                : status.getReasonPhrase();
        return ResponseEntity.status(status).body(ApiResponse.of(status, message, null));
    }
}
