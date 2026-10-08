package edu.icet.repository;

import edu.icet.entity.StudentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StudentRepository extends JpaRepository<StudentEntity, Integer>, JpaSpecificationExecutor<StudentEntity> {
    boolean existsByNicIgnoreCase(String nic);

    boolean existsByNicIgnoreCaseAndIdNot(String nic, int id);
}
