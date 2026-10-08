package edu.icet.service;

import edu.icet.dto.StudentDTO;
import edu.icet.entity.StudentEntity;
import edu.icet.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentServiceImpl implements StudentService {
    private final StudentRepository studentRepository;

    @Override
    @Transactional
    public StudentDTO saveStudent(StudentDTO studentDTO) {
        StudentEntity student = new StudentEntity();
        copyToEntity(studentDTO, student);
        return toDTO(studentRepository.save(student));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentDTO> getAllStudents() {
        return studentRepository.findAll().stream().map(StudentServiceImpl::toDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StudentDTO getStudentById(int id) {
        return toDTO(findStudent(id));
    }

    @Override
    @Transactional
    public StudentDTO updateStudent(int id, StudentDTO studentDTO) {
        // Update the loaded entity so audit columns and version are preserved
        StudentEntity student = findStudent(id);
        copyToEntity(studentDTO, student);
        return toDTO(studentRepository.save(student));
    }

    @Override
    @Transactional
    public void deleteStudent(int id) {
        studentRepository.delete(findStudent(id));
    }

    private StudentEntity findStudent(int id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found with id " + id));
    }

    private static void copyToEntity(StudentDTO dto, StudentEntity entity) {
        entity.setFirstName(dto.getFirstName().trim());
        entity.setLastName(dto.getLastName().trim());
        entity.setGender(dto.getGender());
        entity.setAge(dto.getAge());
        entity.setNic(dto.getNic().trim());
        entity.setAddress(dto.getAddress().trim());
    }

    private static StudentDTO toDTO(StudentEntity entity) {
        return new StudentDTO(entity.getId(), entity.getFirstName(), entity.getLastName(),
                entity.getGender(), entity.getAge(), entity.getNic(), entity.getAddress());
    }
}
