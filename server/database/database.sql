-- Note: 
-- SHOULD: Add/Edit
-- SHOULDN'T: Delete
CREATE DATABASE work_manager;
USE work_manager;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),    
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ADD
-- INSERT INTO users (username, email, password_hash, avatar_url, role)
-- VALUES (admin,admin@admin.com,"abcxyz","",'admin');


CREATE TABLE boards (
    board_id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(255),
    visibility VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ADD
-- INSERT INTO boards (user_id, title, description, color, visibility)
-- VALUES (1, "title", "description", "#000", "Workspace");


CREATE TABLE board_members (
    board_id VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    add_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (board_id, user_id),
    FOREIGN KEY (board_id) REFERENCES boards(board_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ADD
-- INSERT INTO board_members (board_id, user_id)
-- VALUES (1, 1);


CREATE TABLE lists (
    list_id VARCHAR(255) PRIMARY KEY,
    board_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    position INT NOT NULL DEFAULT 0,

    FOREIGN KEY (board_id) REFERENCES boards(board_id) ON DELETE CASCADE
);

-- ADD
-- INSERT INTO lists (list_id, board_id, title, position)
-- VALUES ("list_1", 1, "title", 0);

CREATE TABLE cards (
    card_id VARCHAR(255) PRIMARY KEY,
    list_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INT NOT NULL DEFAULT 0,
    due_date DATETIME,
    state enum("Inprogress","Done","Archived") DEFAULT "Inprogress",
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (list_id) REFERENCES lists(list_id) ON DELETE CASCADE
);

-- ADD
-- INSERT INTO cards (card_id, list_id, title, description, position, due_date, state)
-- VALUES (card_1, 1, "title", "description", 0, "2025-11-22");

CREATE TABLE card_members (
    card_id VARCHAR(255) NOT NULL,
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
    card_id VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ADD
-- INSERT INTO card_comments (card_id, user_id, comment)
-- VALUES ( 1, 1, "comment");

CREATE TABLE card_attachments (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    card_id VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    file_url VARCHAR(255),
    file_type VARCHAR(50),

    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ADD
-- INSERT INTO card_attachments (card_id, user_id, file_url, file_type)
-- VALUES ( 1, 1, "", "");

CREATE TABLE labels (
    label_id INT AUTO_INCREMENT PRIMARY KEY,
    card_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),          
    color VARCHAR(7) NOT NULL,           -- Hex color code (e.g., "#FF5733")

    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE
);

-- ADD
-- INSERT INTO labels (card_id, name, color)
-- VALUES ( 1, "name", "#000");

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,           -- Người nhận thông báo
    actor_id INT NOT NULL,          -- Người tạo ra hành động
    card_id VARCHAR(255),  -- Thẻ liên quan đến thông báo
    board_id VARCHAR(255), -- Board liên quan đến thông báo
    type VARCHAR(50) NOT NULL,      -- Loại thông báo: 'assigned', 'comment', 'due_date'
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,  -- false = chưa đọc, true = đã đọc
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE
);

-- ADD (Dữ liệu mẫu để test)
-- INSERT INTO notifications (user_id, actor_id, card_id, board_id, type, message)
-- VALUES (1, 2, 1, 'assigned', 'Nguyễn Văn A đã thêm bạn vào thẻ "Thiết kế giao diện"');

CREATE TABLE calendar_events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    board_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    description TEXT,

    FOREIGN KEY (board_id) REFERENCES boards(board_id) ON DELETE CASCADE
);

-- INSERT INTO calendar_events (board_id, title, start_time, end_time, description)
-- VALUES (1, "Sample Event", "2024-12-01 10:00:00", "2024-12-01 12:00:00", "This is a sample calendar event.");

CREATE TABLE checklists (
    checklist_id INT AUTO_INCREMENT PRIMARY KEY,
    card_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,

    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE
);

-- INSERT INTO checklists (card_id, title)
-- VALUES (1, "Sample Checklist");

CREATE TABLE checklist_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    checklist_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT false,

    FOREIGN KEY (checklist_id) REFERENCES checklists(checklist_id) ON DELETE CASCADE
);

-- INSERT INTO checklist_items (checklist_id, description, is_finished)
-- VALUES (1, "Sample Item", false);

CREATE TABLE card_activities (
    activity_id VARCHAR(255) PRIMARY KEY,
    actor_id INT NOT NULL,
    card_id VARCHAR(255),
    board_id VARCHAR(255),
    message TEXT,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE
);

-- INSERT INTO card_activities (activity_id, actor_id, card_id, board_id, message, type)
-- VALUE ("act_1", 1, 1, 1, "Change", "Change");