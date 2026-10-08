package edu.icet.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Stores a boolean as 'Y'/'N'. Used instead of Hibernate's own YesNoConverter, which
 * makes MySQL columns enum('N','Y') and ignores the column definition (and its default).
 */
@Converter
public class YesNoConverter implements AttributeConverter<Boolean, String> {
    @Override
    public String convertToDatabaseColumn(Boolean value) {
        return Boolean.TRUE.equals(value) ? "Y" : "N";
    }

    @Override
    public Boolean convertToEntityAttribute(String value) {
        return "Y".equalsIgnoreCase(value);
    }
}
