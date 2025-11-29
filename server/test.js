import express from 'express';
import cors from 'cors';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise'; // Sử dụng phiên bản promise của mysql2
import dotenv from 'dotenv';

dotenv.config(); // Nếu bạn dùng file .env

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
process.env.JWT_SECRET = '4_ong_deu_ten_Cuong'; // Tốt nhất nên để trong file .env

app.use(cors({
    origin: 'http://localhost:5173',
}));

// --- CẤU HÌNH KẾT NỐI DATABASE ---
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,           // Thay bằng user MySQL của bạn
    password: process.env.MYSQL_PASSWORD,           // Thay bằng mật khẩu MySQL của bạn
    database: 'work_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Kiểm tra kết nối
pool.getConnection()
    .then(conn => {
        console.log("Đã kết nối thành công đến MySQL database 'work_manager'");
        conn.release();
    })
    .catch(err => {
        console.error("Lỗi kết nối database:", err);
    });

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

// --- ROUTE (API ENDPOINTS) ---

app.get('/', (req, res) => {
    res.send(`
        <h1>Backend Quản lý Công việc (MySQL Version)</h1>
        <p>Server đang chạy với Database.</p>
    `);
});

// --- AUTHENTICATION ---

// Register
app.post('/register', async (req, res) => {
    const { name, email, password, avatar_url } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đủ name, email, và password.' });
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: 'Email không hợp lệ.' });
    }

    // Password strength check (giữ nguyên logic cũ)
    const passwordOptions = { minLength: 8, minNumbers: 1, minUppercase: 1, minSymbols: 1, minLowercase: 0 };
    if (!validator.isStrongPassword(password, passwordOptions)) {
        return res.status(400).json({ message: 'Mật khẩu yếu (Cần 8 ký tự, 1 số, 1 hoa, 1 ký tự đặc biệt).' });
    }

    try {
        // Kiểm tra email tồn tại
        const [existingUsers] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email đã được đăng ký.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        // Mặc định avatar nếu không có
        const finalAvatar = avatar_url || `https://placehold.co/400x400/EEE/31343C?text=${name.charAt(0)}`;

        // Insert vào DB
        // Lưu ý: DB dùng 'username', API dùng 'name'. Ta map name -> username
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password_hash, avatar_url, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, passwordHash, finalAvatar, 'member']
        );

        res.status(201).json({
            message: 'Đăng ký thành công!',
            user: {
                id: result.insertId,
                name: name,
                email: email,
                role: 'member',
                avatar_url: finalAvatar
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập email và password.' });
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng.' });
        }

        const payload = {
            id: user.user_id,
            email: user.email,
            name: user.username,
            avatar_url: user.avatar_url,
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Đăng nhập thành công!',
            token: token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
});

// --- MIDDLEWARES ---

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Không tìm thấy token.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedPayload;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn.' });
    }
};

// --- BOARDS API ---

// Get All Boards
app.get('/api/boards', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        // Select và đổi tên cột để khớp với Frontend (title -> name)
        const [boards] = await pool.query(`
            SELECT 
                board_id as id, 
                user_id as userId, 
                title as name, 
                description, 
                color, 
                visibility 
            FROM boards 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);

        // Cần gán lists rỗng mặc định để frontend không lỗi map()
        const boardsWithLists = boards.map(b => ({ ...b, lists: [] }));
        
        res.status(200).json(boardsWithLists);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách board' });
    }
});

// Get Single Board (Kèm Lists và Cards)
app.get('/api/boards/:boardID', authMiddleware, async (req, res) => {
    const { boardID } = req.params;
    const userId = req.user.id;

    try {
        // 1. Lấy thông tin Board
        const [boards] = await pool.query(`
            SELECT board_id as id, user_id as userId, title as name, description, color, visibility 
            FROM boards WHERE board_id = ? AND user_id = ?
        `, [boardID, userId]);

        if (boards.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy board.' });
        }
        const board = boards[0];

        // 2. Lấy Lists của Board
        const [lists] = await pool.query(`
            SELECT list_id as id, title, position 
            FROM lists 
            WHERE board_id = ? 
            ORDER BY position ASC
        `, [boardID]);

        // 3. Lấy tất cả Cards thuộc các List trên
        const listIds = lists.map(l => l.id);
        let cards = [];
        if (listIds.length > 0) {
            const [cardsData] = await pool.query(`
                SELECT 
                    card_id as id, 
                    list_id, 
                    title, 
                    description, 
                    position, 
                    due_date as dueDate 
                FROM cards 
                WHERE list_id IN (?)
                ORDER BY position ASC
            `, [listIds]);
            cards = cardsData;
        }

        // 4. Ghép Cards vào Lists (Nested JSON)
        const listsWithCards = lists.map(list => {
            return {
                ...list,
                // Chuyển id về string để khớp với frontend cũ (nếu cần thiết)
                id: list.id.toString(), 
                cards: cards
                    .filter(c => c.list_id === list.id)
                    .map(c => ({...c, id: c.id.toString()}))
            };
        });

        // 5. Trả về kết quả
        board.lists = listsWithCards;
        board.id = board.id.toString(); // Frontend thường thích ID là string
        
        res.status(200).json(board);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server khi lấy chi tiết board' });
    }
});

// Create Board
app.post('/api/boards', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { name, description, color, visibility } = req.body; // Frontend gửi 'name', DB dùng 'title'

    if (!name) return res.status(400).json({ message: 'Tên board là bắt buộc' });

    try {
        const [result] = await pool.query(
            'INSERT INTO boards (user_id, title, description, color, visibility) VALUES (?, ?, ?, ?, ?)',
            [userId, name, description || '', color || '#667eea', visibility || 'Workspace']
        );

        const newBoard = {
            id: result.insertId,
            userId,
            name,
            description,
            color,
            visibility,
            lists: []
        };
        res.status(201).json(newBoard);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo board', error: err.message });
    }
});

// Update Board
app.put('/api/boards/:id', authMiddleware, async (req, res) => {
    const boardId = req.params.id;
    const userId = req.user.id;
    const { name, description, color, visibility } = req.body;

    try {
        // Kiểm tra quyền sở hữu
        const [check] = await pool.query('SELECT board_id FROM boards WHERE board_id = ? AND user_id = ?', [boardId, userId]);
        if (check.length === 0) return res.status(404).json({ message: 'Board không tồn tại hoặc không có quyền.' });

        await pool.query(
            'UPDATE boards SET title = ?, description = ?, color = ?, visibility = ? WHERE board_id = ?',
            [name, description, color, visibility, boardId]
        );
        
        // Trả về data đã update (Giả lập)
        res.json({ id: boardId, name, description, color, visibility });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật board' });
    }
});

// Delete Board
app.delete('/api/boards/:id', authMiddleware, async (req, res) => {
    const boardId = req.params.id;
    const userId = req.user.id;

    try {
        const [result] = await pool.query('DELETE FROM boards WHERE board_id = ? AND user_id = ?', [boardId, userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Board không tồn tại hoặc không có quyền.' });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa board' });
    }
});

// --- LISTS API ---

// Create List
app.post('/api/boards/:boardId/lists', authMiddleware, async (req, res) => {
    const { boardId } = req.params;
    const { title } = req.body;

    if (!title) return res.status(400).json({ message: 'Tiêu đề list trống.' });

    try {
        // Lấy vị trí lớn nhất hiện tại để gán cho list mới nằm cuối
        const [rows] = await pool.query('SELECT MAX(position) as maxPos FROM lists WHERE board_id = ?', [boardId]);
        const newPos = (rows[0].maxPos || 0) + 1000; // Tăng khoảng cách để dễ chèn

        const [result] = await pool.query(
            'INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)',
            [boardId, title, newPos]
        );

        res.status(201).json({
            id: result.insertId.toString(),
            title: title,
            cards: []
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo list' });
    }
});

// Update List
app.put('/api/boards/:boardId/lists/:listId', authMiddleware, async (req, res) => {
    const { listId } = req.params;
    const { title } = req.body;

    try {
        await pool.query('UPDATE lists SET title = ? WHERE list_id = ?', [title, listId]);
        res.status(200).json({ id: listId, title });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật list' });
    }
});

// Delete List
app.delete('/api/boards/:boardId/lists/:listId', authMiddleware, async (req, res) => {
    const { listId } = req.params;
    try {
        await pool.query('DELETE FROM lists WHERE list_id = ?', [listId]);
        res.status(200).json({ message: 'Đã xóa list' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa list' });
    }
});

// Move List (Kéo thả List)
app.put('/api/boards/lists/move', authMiddleware, async (req, res) => {
    const { sourceBoardId, destBoardId, listId, index } = req.body;

    try {
        // Trong thực tế, cần tính lại position dựa trên index.
        // Cách đơn giản nhất ở đây: Update board_id (nếu chuyển board) và gán position mới.
        // Để làm chuẩn tính năng Drag & Drop, frontend nên gửi lên 'newPosition' (float) thay vì index.
        // Ở đây mình tạm gán position = index * 10000 để demo logic cập nhật DB.
        
        const newPosition = (index + 1) * 10000; 

        await pool.query(
            'UPDATE lists SET board_id = ?, position = ? WHERE list_id = ?',
            [destBoardId, newPosition, listId]
        );

        res.status(200).json({ message: 'Di chuyển list thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi di chuyển list' });
    }
});

// --- CARDS API ---

// Move Card (Kéo thả Card)
app.put('/api/cards/move', authMiddleware, async (req, res) => {
    const { destListId, cardId, index } = req.body; // Chỉ cần biết list đích và vị trí

    try {
        // Tương tự Move List, cập nhật cha mới và vị trí mới
        const newPosition = (index + 1) * 10000;

        await pool.query(
            'UPDATE cards SET list_id = ?, position = ? WHERE card_id = ?',
            [destListId, newPosition, cardId]
        );

        res.status(200).json({ message: 'Di chuyển card thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi di chuyển card' });
    }
});

// Bạn cần thêm API Create Card và Edit/Delete Card nếu frontend có gọi (dựa trên code cũ thì hình như bạn chưa viết phần POST card trong code mẫu, nhưng database đã có).
// Ví dụ thêm card:
app.post('/api/lists/:listId/cards', authMiddleware, async (req, res) => {
    const { listId } = req.params;
    const { title } = req.body;

    try {
        const [rows] = await pool.query('SELECT MAX(position) as maxPos FROM cards WHERE list_id = ?', [listId]);
        const newPos = (rows[0].maxPos || 0) + 1000;

        const [result] = await pool.query(
            'INSERT INTO cards (list_id, title, position) VALUES (?, ?, ?)',
            [listId, title, newPos]
        );
        res.status(201).json({ id: result.insertId.toString(), title, listId });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo card' });
    }
});