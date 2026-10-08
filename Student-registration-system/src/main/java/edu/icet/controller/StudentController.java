package edu.icet.controller;

import edu.icet.dto.ApiResponse;
import edu.icet.dto.StudentDTO;
import edu.icet.service.StudentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Students")
@RestController
@RequestMapping("/student")
@RequiredArgsConstructor
public class StudentController {
    private final StudentService studentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<StudentDTO> saveStudent(@Valid @RequestBody StudentDTO studentDTO) {
        return ApiResponse.of(HttpStatus.CREATED, "Student registered successfully",
                studentService.saveStudent(studentDTO));
    }

    @GetMapping
    public ApiResponse<List<StudentDTO>> getAllStudents() {
        return ApiResponse.ok("Students retrieved successfully", studentService.getAllStudents());
    }

    @GetMapping("/{id}")
    public ApiResponse<StudentDTO> getStudentById(@PathVariable Integer id) {
        return ApiResponse.ok("Student retrieved successfully", studentService.getStudentById(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<StudentDTO> updateStudent(@PathVariable Integer id, @Valid @RequestBody StudentDTO studentDTO) {
        return ApiResponse.ok("Student updated successfully", studentService.updateStudent(id, studentDTO));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteStudent(@PathVariable Integer id) {
        studentService.deleteStudent(id);
        return ApiResponse.ok("Student deleted successfully", null);
    }
}
