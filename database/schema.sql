CREATE DATABASE IF NOT EXISTS school_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE school_management;

CREATE TABLE students (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    uid VARCHAR(32) NOT NULL UNIQUE,
    birthdate DATE NOT NULL,
    age TINYINT UNSIGNED NULL,
    gender VARCHAR(40) NOT NULL,
    grade VARCHAR(10) NOT NULL,
    strand VARCHAR(30) NOT NULL DEFAULT '',
    section VARCHAR(60) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    email VARCHAR(190) NOT NULL,
    picture MEDIUMTEXT NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    registered TINYINT(1) NOT NULL DEFAULT 0,
    password_hash VARCHAR(255) NULL,
    security_answer VARCHAR(190) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grades (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    grade_id VARCHAR(64) NOT NULL UNIQUE,
    student_uid VARCHAR(32) NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    grade_level VARCHAR(10) NOT NULL,
    section VARCHAR(60) NOT NULL,
    strand VARCHAR(30) NOT NULL DEFAULT '',
    quiz VARCHAR(100) NOT NULL,
    score SMALLINT UNSIGNED NOT NULL,
    total SMALLINT UNSIGNED NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    type VARCHAR(30) NOT NULL,
    completed_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);