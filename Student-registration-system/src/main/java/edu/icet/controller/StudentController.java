package edu.icet.controller;

import edu.icet.dto.StudentDTO;
import edu.icet.entity.StudentEntity;
import edu.icet.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@CrossOrigin
@RequestMapping("/student")
public class StudentController {
    @Autowired
    public StudentService studentService;

    @PostMapping
    public void saveStudent(@RequestBody StudentDTO studentDTO) {
        studentService.saveStudent(studentDTO);
    }

    @GetMapping
    public List<StudentEntity> getAllStudents() {
        return studentService.getAllStudents();
    }
    @GetMapping("/{id}")
    public List<StudentEntity> getStudentById(@PathVariable String id){
        return studentService.getStudentById(Integer.valueOf(id));
    }
}
