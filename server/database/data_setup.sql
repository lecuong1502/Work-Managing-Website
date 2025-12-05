INSERT INTO users (username, email, password_hash, avatar_url, role) VALUES 
("admin","a@admin.com","$2b$10$wKQuZsVqnRyg5X6HHZUBp.HITifdt8DDZSZ0kJfaVUo1KQReHg4t6","https://placehold.co/400x400/EEE/31343C?text=a",'admin');
-- admin password Cuong@1234

INSERT INTO boards (user_id, title, description, color, visibility) VALUES 
(1, "Công việc nhóm", "Các công việc cần hoàn thành theo nhóm.", "linear-gradient(135deg, #667eea, #764ba2)", "Workspace"),
(1, "Dự án React", "Làm project web quản lý công việc bằng React.", "linear-gradient(135deg, #fddb92, #d1fdff)", "Workplace");

INSERT INTO board_members (board_id, user_id) VALUES 
(1, 1);

INSERT INTO lists (board_id, title, position) VALUES 
(1, "To do", 0),
(1, "In Progress", 1),
(1, "Done", 2);

INSERT INTO cards (list_id, title, description, position, due_date, status) VALUES 
(1, "Thiết kế giao diện", "Dùng Figma để tạo layout cơ bản.", 0, "2025-11-10", 'in progress'),
(1, "Phân công nhiệm vụ", "Chia việc cho từng thành viên", 1, "2025-11-10", 'in progress');

INSERT INTO labels (label_id, name, color) VALUES 
( 1, "design", "blue"),
( 2, "management", "blue");

INSERT INTO card_labels (card_id, label_id) VALUES 
( 1, 1),
( 2, 2);