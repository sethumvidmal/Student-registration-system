package edu.icet.controller;

import edu.icet.dto.StudentDTO;
import edu.icet.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin
@RequestMapping("/student")
public class StudentController {
    @Autowired
    public StudentService studentService;
    @PostMapping
    public StudentDTO saveStudent(@RequestBody StudentDTO studentDTO){
        studentService.saveStudent(studentDTO);
        return studentDTO;
    }
}
