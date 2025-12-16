INSERT INTO users (username, email, password_hash, avatar_url, role) VALUES 
("admin","a@admin.com","$2b$10$wKQuZsVqnRyg5X6HHZUBp.HITifdt8DDZSZ0kJfaVUo1KQReHg4t6","https://placehold.co/400x400/EEE/31343C?text=a",'admin'),
("cuong","c@sample.com","$10$s44WOOfetSdJfnP1R6Om2u/twAS9cjFZjhrC6Hk/iBCm7VqJWofCy","https://placehold.co/400x400/EEE/31343C?text=c",'member');
-- admin password Cuong@1234
-- INSERT INTO users (username, email, password_hash, avatar_url, role)

INSERT INTO boards (user_id, title, description, color, visibility)
VALUES
(1, 'Công việc nhóm', 'Các công việc cần hoàn thành theo nhóm.', 'linear-gradient(135deg, #667eea, #764ba2)', 'Workspace'),
(1, 'Dự án React', 'Làm project web quản lý công việc bằng React.', 'linear-gradient(135deg, #fddb92, #d1fdff)', 'Workspace'),
(2, 'Việc cá nhân', 'Danh sách việc riêng trong tuần.', '#722ed1', 'Workspace');

INSERT INTO board_members (board_id, user_id)
VALUES
(1, 1),
(2, 1),
(3, 2);

INSERT INTO lists (list_id, board_id, title, position)
VALUES
('list_1', 1, 'To Do', 0),
('list_2', 1, 'In Progress', 1),
('list_3', 1, 'Done', 2),
('list_4', 2, 'To Do', 0);

INSERT INTO cards (card_id, list_id, title, description, position, due_date)
VALUES
('card_1', 'list_1', 'Thiết kế giao diện trang chủ', 'Dùng Figma để tạo layout cơ bản.', 0, '2025-11-10'),
('card_2', 'list_1', 'Phân công nhiệm vụ', 'Chia việc cho từng thành viên.', 1, NULL),
('card_3', 'list_4', 'Tạo component Login', 'Form đăng nhập với validation.', 0, NULL);

INSERT INTO labels (card_id, name, color)
VALUES
('card_1', 'design', '#ff5733'),
('card_2', 'management', '#33c1ff'),
('card_3', 'frontend', '#22cc88');