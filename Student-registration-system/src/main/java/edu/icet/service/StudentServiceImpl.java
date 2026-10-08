package edu.icet.service;

import edu.icet.dto.StudentDTO;
import edu.icet.entity.StudentEntity;
import edu.icet.repository.StudentRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentServiceImpl implements StudentService {
    @Value("instituteName")
    String instituteName;
    @Autowired
    public StudentRepository studentRepository;
    @Autowired
    ModelMapper modelMapper;

    @Override
    public void saveStudent(StudentDTO studentDTO) {
        if (studentDTO.getFirstName() == null || studentDTO.getLastName() == null || studentDTO.getGender() == null || studentDTO.getAge() == 0 || studentDTO.getNic() == null || studentDTO.getAddress() == null) {
            return;
        }
        studentRepository.save(modelMapper.map(studentDTO, StudentEntity.class));
    }

    @Override
    public List<StudentEntity> getAllStudents() {
        return (List<StudentEntity>) studentRepository.findAll();
    }

    @Override
    public List<StudentEntity> getStudentById(int id) {
        return studentRepository.findById(id);
    }

    @Override
    public boolean deleteStudent(int id) {
        if (studentRepository.existsById(id)) {
            studentRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    public void updateStudent(StudentDTO studentDTO) {
        if (studentDTO.getId() == 0) {
            return;
        }
        // Map onto the loaded entity so audit columns and version are preserved
        studentRepository.findById(studentDTO.getId()).stream().findFirst().ifPresent(student -> {
            modelMapper.map(studentDTO, student);
            studentRepository.save(student);
        });
    }
}

