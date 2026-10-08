# Student Management System

This application provides the basic functions of a student management system. Administrators can log in to the system, add students to the database, view student information, and delete student records. Administrators can also create their accounts.

## Technologies Used

- Java
- Spring Boot
- MySQL
- Bootstrap
- HTML
- CSS

## Features

- **User Authentication**: Administrators can log in securely to access the system.
- **Student Management**: Administrators can perform CRUD (Create, Read, Update, Delete) operations on student records.
- **Account Creation**: Administrators can create their own accounts for system access.

## Getting Started

1. **Prerequisites**: Make sure you have the following installed on your system:

   - Java
   - Spring Boot
   - MySQL
   - A web browser for the HTML/CSS-based frontend.

2. **Clone the Repository**:

   ```bash
   git clone https://github.com/sethumvidmal/Student-registration-system.git
   ```

3. **Run the backend** from `Student-registration-system/` (MySQL database `institute_crm` must exist; credentials are in `application-dev.yml`).
4. **Open the frontend** at `Web/login.html` and sign in.

## Authentication

The API uses JWT access tokens (15 min) and refresh tokens (7 days). Every endpoint except login and refresh requires an `Authorization: Bearer <accessToken>` header.

| Method | Endpoint              | Body                              | Description                              |
|--------|-----------------------|-----------------------------------|------------------------------------------|
| POST   | `/auth/login`         | `{ "emailOrPhone", "password" }`  | Returns access token, refresh token, user |
| POST   | `/auth/refresh-token` | `{ "refreshToken" }`              | Rotates both tokens                      |
| POST   | `/auth/logout`        | -                                 | Ends the session; tokens stop working    |
| GET    | `/auth/me`            | -                                 | Current user                             |

### Default account

A super admin is created on first startup:

- **Email:** `superadmin@icet.lk` (or phone `94712345678`)
- **Password:** `Admin@1234`

Change it before deploying. Seed values, token lifetimes and secrets can be overridden with the environment variables
`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PHONE`, `SEED_ADMIN_PASSWORD`, `JWT_SECRET`, `REFRESH_JWT_SECRET`,
`JWT_ACCESS_EXPIRATION` and `JWT_REFRESH_EXPIRATION` (see `application.yml`). Secrets must be at least 32 characters.
