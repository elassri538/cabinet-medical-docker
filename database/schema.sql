-- ============================================================
-- Cabinet Médical — MySQL Database Schema (Simplified)
-- Flat structure matching frontend TypeScript types exactly
-- ============================================================

CREATE DATABASE IF NOT EXISTS cabinet_medical CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cabinet_medical;

-- Users (all roles in one table)
CREATE TABLE users (
    id              VARCHAR(36)     NOT NULL    PRIMARY KEY,
    email           VARCHAR(255)    NOT NULL    UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            ENUM('admin','patient','secretary','doctor') NOT NULL,
    first_name      VARCHAR(100)    NOT NULL,
    last_name       VARCHAR(100)    NOT NULL,
    phone           VARCHAR(20)     DEFAULT '',
    date_of_birth   DATE            DEFAULT NULL,
    address         TEXT,
    blood_type      VARCHAR(5)      DEFAULT NULL,
    allergies       JSON            DEFAULT NULL,
    specialization  VARCHAR(200)    DEFAULT NULL,
    created_at      DATETIME        NOT NULL    DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_name (last_name, first_name)
) ENGINE=InnoDB;

-- Appointments
CREATE TABLE appointments (
    id              VARCHAR(36)     NOT NULL    PRIMARY KEY,
    patient_id      VARCHAR(36)     NOT NULL,
    doctor_id       VARCHAR(36)     NOT NULL,
    date            DATE            NOT NULL,
    start_time      VARCHAR(5)      NOT NULL,
    end_time        VARCHAR(5)      NOT NULL,
    status          VARCHAR(20)     NOT NULL    DEFAULT 'pending',
    reason          VARCHAR(500)    DEFAULT '',
    consultation_id VARCHAR(36)     DEFAULT NULL,
    created_at      DATETIME        NOT NULL    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (doctor_id)  REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_date (date),
    INDEX idx_doctor_date (doctor_id, date),
    INDEX idx_patient (patient_id)
) ENGINE=InnoDB;

-- Consultations
CREATE TABLE consultations (
    id              VARCHAR(36)     NOT NULL    PRIMARY KEY,
    appointment_id  VARCHAR(36)     NOT NULL,
    patient_id      VARCHAR(36)     NOT NULL,
    doctor_id       VARCHAR(36)     NOT NULL,
    date            DATE            NOT NULL,
    is_present      TINYINT(1)      NOT NULL    DEFAULT 1,
    report          TEXT,
    diagnosis       VARCHAR(500),
    prescription    JSON            DEFAULT NULL,
    notes           TEXT,
    created_at      DATETIME        NOT NULL    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id)     REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (doctor_id)      REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_patient (patient_id),
    INDEX idx_doctor (doctor_id)
) ENGINE=InnoDB;
