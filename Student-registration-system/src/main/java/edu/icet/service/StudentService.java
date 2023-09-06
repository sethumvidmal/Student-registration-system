package edu.icet.service;

import edu.icet.dto.StudentDTO;
import edu.icet.entity.StudentEntity;

import java.util.List;

public interface StudentService {
    public void saveStudent(StudentDTO studentDTO);
    public List<StudentEntity> getAllStudents();
    public List<StudentEntity> getStudentById(int id);
}
