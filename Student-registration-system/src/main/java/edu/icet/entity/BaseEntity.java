package edu.icet.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
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
 * Audit columns shared by every entity. Values are filled automatically by
 * Spring Data auditing (see JpaAuditingConfig); created/modified by holds the
 * logged-in user's id, or 0 for system actions such as seeding.
 */
@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {
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
}
