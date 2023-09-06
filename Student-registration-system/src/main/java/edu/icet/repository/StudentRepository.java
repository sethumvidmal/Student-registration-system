package edu.icet.repository;

import edu.icet.entity.StudentEntity;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface StudentRepository extends CrudRepository<StudentEntity,Integer> {
    List<StudentEntity> findById(int id);

}
