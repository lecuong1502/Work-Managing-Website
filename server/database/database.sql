-- Note: 
-- SHOULD: Add/Edit
-- SHOULDN'T: Delete
CREATE DATABASE work_manager;
USE work_manager;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),    
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member'
);

-- ADD
-- INSERT INTO users (username, email, password_hash, avatar_url, role)
-- VALUES (admin,admin@admin.com,"abcxyz","",'admin');


CREATE TABLE boards (
    board_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(255),
    visibility VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ADD
-- INSERT INTO boards (user_id, title, description, color, visibility)
-- VALUES (1, "title", "description", "#000", "Workspace");


CREATE TABLE board_members (
    board_id INT NOT NULL,
    user_id INT NOT NULL,

    PRIMARY KEY (board_id, user_id),
    FOREIGN KEY (board_id) REFERENCES boards(board_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ADD
-- INSERT INTO board_members (board_id, user_id)
-- VALUES (1, 1);


CREATE TABLE lists (
    list_id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    position INT NOT NULL DEFAULT 0,

    FOREIGN KEY (board_id) REFERENCES boards(board_id)
);

-- ADD
-- INSERT INTO lists (board_id, title, position)
-- VALUES (1, "title", 0);

CREATE TABLE cards (
    card_id INT AUTO_INCREMENT PRIMARY KEY,
    list_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INT NOT NULL DEFAULT 0,
    due_date DATETIME,
    status ENUM('in progress', 'completed') NOT NULL DEFAULT 'in progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (list_id) REFERENCES lists(list_id)
);

-- ADD
-- INSERT INTO cards (list_id, title, description, position, due_date, status)
-- VALUES (1, "title", "description", 0, "2025-11-22", 'in progress');

CREATE TABLE card_members (
    card_id INT NOT NULL,
    user_id INT NOT NULL,

    PRIMARY KEY (card_id, user_id),
    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ADD
-- INSERT INTO card_members (card_id, user_id)
-- VALUES ( 1, 1);

CREATE TABLE card_comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (card_id) REFERENCES cards(card_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ADD
-- INSERT INTO card_comments (card_id, user_id, comment)
-- VALUES ( 1, 1, "comment");

CREATE TABLE card_attachments (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    user_id INT NOT NULL,
    file_url VARCHAR(255),
    file_type VARCHAR(50),

    FOREIGN KEY (card_id) REFERENCES cards(card_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ADD
-- INSERT INTO card_attachments (card_id, user_id, file_url, file_type)
-- VALUES ( 1, 1, "", "");

CREATE TABLE labels (
    label_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,          
    color VARCHAR(7) NOT NULL           -- Hex color code (e.g., "#FF5733")
);

-- ADD
-- INSERT INTO labels (label_id, name, color)
-- VALUES ( 1, "name", "#000");

CREATE TABLE card_labels (
    card_id INT NOT NULL,
    label_id INT NOT NULL,

    PRIMARY KEY (card_id, label_id),
    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(label_id) ON DELETE CASCADE
);

-- ADD
-- INSERT INTO card_labels (card_id, label_id)
-- VALUES ( 1, 1);

