package edu.icet.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import edu.icet.util.YesNoConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Audit and soft-delete columns shared by every entity. Audit values are filled automatically by
 * Spring Data auditing (see JpaAuditingConfig); created/modified by holds the logged-in user's id,
 * or 0 for system actions such as seeding.
 * <p>
 * Rows are never removed: deleting sets is_deleted to 'Y'. Every entity is annotated with
 * {@code @Where(clause = BaseEntity.NOT_DELETED)} so all queries only see rows where it is 'N'.
 */
@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {
    public static final String NOT_DELETED = "is_deleted = 'N'";

    @JsonIgnore
    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Integer createdBy;

    @CreatedDate
    @Column(name = "created_datetime", updatable = false)
    private LocalDateTime createdDatetime;

    @JsonIgnore
    @LastModifiedBy
    @Column(name = "modified_by")
    private Integer modifiedBy;

    @LastModifiedDate
    @Column(name = "modified_datetime")
    private LocalDateTime modifiedDatetime;

    @JsonIgnore
    @Version
    @Column(name = "version", nullable = false)
    private Integer version;

    // Stored as 'Y'/'N'; the default fills existing rows when Hibernate adds the column
    @JsonIgnore
    @Convert(converter = YesNoConverter.class)
    @Column(name = "is_deleted", nullable = false, columnDefinition = "char(1) default 'N'")
    private boolean deleted = false;
}
