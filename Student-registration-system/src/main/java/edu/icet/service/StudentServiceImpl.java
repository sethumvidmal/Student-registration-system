package edu.icet.service;

import edu.icet.dto.StudentDTO;
import edu.icet.entity.StudentEntity;
import edu.icet.repository.StudentRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class StudentServiceImpl implements StudentService{
    @Autowired
    public StudentRepository studentRepository;
    @Autowired
    ModelMapper modelMapper;
    @Override
    public void saveStudent(StudentDTO studentDTO) {
        studentRepository.save(modelMapper.map(studentDTO, StudentEntity.class));
    }
}
