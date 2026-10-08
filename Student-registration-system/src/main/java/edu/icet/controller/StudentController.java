package edu.icet.controller;

import edu.icet.dto.ApiResponse;
import edu.icet.dto.PageResponse;
import edu.icet.dto.StudentDTO;
import edu.icet.dto.StudentSearchRequest;
import edu.icet.service.StudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Students")
@RestController
@RequestMapping("/student")
@RequiredArgsConstructor
public class StudentController {
    private final StudentService studentService;

    @Operation(summary = "Search students",
            description = "All filters are optional. Use id to fetch a single student.")
    @GetMapping("/list")
    public ApiResponse<PageResponse<StudentDTO>> listStudents(@ParameterObject @Valid StudentSearchRequest request) {
        return ApiResponse.success("Students retrieved successfully", studentService.searchStudents(request));
    }

    @Operation(summary = "Create or update a student",
            description = "Without an id a new student is created (201). With an id that student is updated (200).")
    @PostMapping("/create")
    public ResponseEntity<ApiResponse<StudentDTO>> saveStudent(@Valid @RequestBody StudentDTO studentDTO) {
        boolean isNew = studentDTO.getId() == null;
        StudentDTO saved = studentService.saveStudent(studentDTO);
        return ResponseEntity.status(isNew ? HttpStatus.CREATED : HttpStatus.OK)
                .body(ApiResponse.success(isNew ? "Student created successfully" : "Student updated successfully", saved));
    }

    @Operation(summary = "Delete a student")
    @DeleteMapping("/delete/{id}")
    public ApiResponse<Void> deleteStudent(@PathVariable Integer id) {
        studentService.deleteStudent(id);
        return ApiResponse.success("Student deleted successfully", null);
    }
}
