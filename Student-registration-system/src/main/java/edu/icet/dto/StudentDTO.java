package edu.icet.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentDTO {

    private String firstName;
    private String lastName;
    private String gender;
    private int age;
    private String nic;
    private String address;

    public void setFirstName(String firstName) {
        if (firstName == null || firstName.isBlank()) {
            return;
        }
        this.firstName = firstName;
    }

    public void setLastName(String lastName) {
        if (lastName == null || lastName.isBlank()) {
            return;
        }
        this.lastName = lastName;
    }

    public void setGender(String gender) {
        if (gender == null || gender.isBlank()) {
            return;
        }
        this.gender = gender;
    }

    public void setAge(int age) {
        if (age == 0) {
            return;
        }
        this.age = age;
    }

    public void setNic(String nic) {
        if (nic == null || nic.isBlank()) {
            return;
        }
        this.nic = nic;
    }

    public void setAddress(String address) {
        if (address == null || address.isBlank()) {
            return;
        }
        this.address = address;
    }
}
