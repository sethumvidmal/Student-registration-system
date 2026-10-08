package edu.icet.service;

import edu.icet.dto.StudentDTO;

import java.util.List;

public interface StudentService {
    StudentDTO saveStudent(StudentDTO studentDTO);

    List<StudentDTO> getAllStudents();

    StudentDTO getStudentById(int id);

    StudentDTO updateStudent(int id, StudentDTO studentDTO);

    void deleteStudent(int id);
}
