package edu.icet.service;

import edu.icet.dto.PageResponse;
import edu.icet.dto.StudentDTO;
import edu.icet.dto.StudentSearchRequest;

public interface StudentService {
    /** Creates the student when {@code id} is null, otherwise updates the student with that id. */
    StudentDTO saveStudent(StudentDTO studentDTO);

    PageResponse<StudentDTO> searchStudents(StudentSearchRequest request);

    void deleteStudent(int id);
}
