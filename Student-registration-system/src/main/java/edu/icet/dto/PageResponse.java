package edu.icet.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/** One page of a list endpoint's results, so list data is always an object rather than a bare array. */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
