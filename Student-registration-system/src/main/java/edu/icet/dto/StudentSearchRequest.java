package edu.icet.dto;

import edu.icet.util.Gender;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/** Query parameters of GET /student/list. Every filter is optional; filters that are set are combined with AND. */
@Data
public class StudentSearchRequest {
    @Schema(description = "Exact student id")
    @Positive(message = "Id must be a positive number")
    private Integer id;

    @Schema(description = "Part of the first name, last name or full name (case-insensitive)")
    private String name;

    @Schema(description = "Part of the NIC (case-insensitive)")
    private String nic;

    @Schema(description = "M or F")
    private Gender gender;

    @Schema(description = "Zero-based page number", defaultValue = "0")
    @Min(value = 0, message = "Page must be 0 or more")
    private int page = 0;

    @Schema(description = "Page size, 1 to 100", defaultValue = "20")
    @Min(value = 1, message = "Size must be at least 1")
    @Max(value = 100, message = "Size must be at most 100")
    private int size = 20;
}
