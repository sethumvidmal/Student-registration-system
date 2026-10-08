package edu.icet.service;

import edu.icet.dto.PageResponse;
import edu.icet.dto.StudentDTO;
import edu.icet.dto.StudentSearchRequest;
import edu.icet.entity.StudentEntity;
import edu.icet.exception.ApiException;
import edu.icet.exception.ErrorCode;
import edu.icet.repository.StudentRepository;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentServiceImpl implements StudentService {
    private static final char LIKE_ESCAPE = '\\';

    private final StudentRepository studentRepository;

    @Override
    @Transactional
    public StudentDTO saveStudent(StudentDTO studentDTO) {
        String nic = studentDTO.getNic().trim();
        StudentEntity student;
        if (studentDTO.getId() == null) {
            if (studentRepository.existsByNicIgnoreCase(nic)) {
                throw nicTaken(nic);
            }
            student = new StudentEntity();
        } else {
            // Update the loaded entity so audit columns and version are preserved
            student = findStudent(studentDTO.getId());
            if (studentRepository.existsByNicIgnoreCaseAndIdNot(nic, student.getId())) {
                throw nicTaken(nic);
            }
        }
        copyToEntity(studentDTO, student);
        return toDTO(studentRepository.save(student));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StudentDTO> searchStudents(StudentSearchRequest request) {
        PageRequest pageRequest = PageRequest.of(request.getPage(), request.getSize(), Sort.by("id"));
        return PageResponse.from(studentRepository.findAll(toSpecification(request), pageRequest)
                .map(StudentServiceImpl::toDTO));
    }

    @Override
    @Transactional
    public void deleteStudent(int id) {
        // Soft delete: the row stays with is_deleted = 'Y' and is hidden from every query
        StudentEntity student = findStudent(id);
        student.setDeleted(true);
        studentRepository.save(student);
    }

    private StudentEntity findStudent(int id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.STUDENT_NOT_FOUND, "Student not found with id " + id));
    }

    private static ApiException nicTaken(String nic) {
        return new ApiException(ErrorCode.NIC_ALREADY_EXISTS, "A student with NIC " + nic + " already exists");
    }

    private static Specification<StudentEntity> toSpecification(StudentSearchRequest request) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (request.getId() != null) {
                predicates.add(cb.equal(root.get("id"), request.getId()));
            }
            if (StringUtils.hasText(request.getName())) {
                String pattern = containsPattern(request.getName());
                Expression<String> firstName = cb.lower(root.get("firstName"));
                Expression<String> lastName = cb.lower(root.get("lastName"));
                Expression<String> fullName = cb.concat(cb.concat(firstName, " "), lastName);
                predicates.add(cb.or(
                        cb.like(firstName, pattern, LIKE_ESCAPE),
                        cb.like(lastName, pattern, LIKE_ESCAPE),
                        cb.like(fullName, pattern, LIKE_ESCAPE)));
            }
            if (StringUtils.hasText(request.getNic())) {
                predicates.add(cb.like(cb.lower(root.get("nic")), containsPattern(request.getNic()), LIKE_ESCAPE));
            }
            if (request.getGender() != null) {
                predicates.add(cb.equal(root.get("gender"), request.getGender()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** Case-insensitive "contains" LIKE pattern, with the user's % and _ matched literally. */
    private static String containsPattern(String value) {
        String escaped = value.trim().toLowerCase()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
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
