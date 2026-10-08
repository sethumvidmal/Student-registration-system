package edu.icet.repository;

import edu.icet.entity.UserEntity;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface UserRepository extends CrudRepository<UserEntity, Integer> {
    Optional<UserEntity> findByEmailIgnoreCaseOrPhone(String email, String phone);

    boolean existsByEmailIgnoreCaseOrPhone(String email, String phone);
}
