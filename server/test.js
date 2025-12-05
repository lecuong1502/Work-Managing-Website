import express from 'express';
import cors from 'cors';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise'; 
import dotenv from 'dotenv';

dotenv.config(); 

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
process.env.JWT_SECRET = '4_ong_deu_ten_Cuong'; 

app.use(cors({
    origin: 'http://localhost:5173',
}));

// --- CẤU HÌNH KẾT NỐI DATABASE ---
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,           
    password: process.env.MYSQL_PASSWORD,
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

    // Password strength check
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
        
        const finalAvatar = avatar_url || `https://placehold.co/400x400/EEE/31343C?text=${name.charAt(0)}`;

        // Insert vào DB
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
            token: token,
            payload: payload
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

        const boardsWithLists = boards.map(b => ({ ...b, lists: [] }));

        // Lấy Lists của Board
        for (let board of boardsWithLists) {
            const [lists] = await pool.query(`
                SELECT  list_id as id, title, position 
                FROM lists 
                WHERE board_id = ? 
                ORDER BY position ASC
            `, [board.id]); 
            board.lists = lists;

            // Lấy Cards của từng List
            for (let list of board.lists) {
                list.id = list.id.toString(); 
                const [cards] = await pool.query(`
                    SELECT 
                        card_id as id, 
                        list_id, 
                        title, 
                        description, 
                        position, 
                        due_date as dueDate 
                    FROM cards
                    WHERE list_id = ?
                    ORDER BY position ASC
                `, [list.id]);

                // Lấy Labels của từng Card
                for (let card of cards) {
                    const [labels] = await pool.query(`
                        SELECT l.name
                        FROM labels l
                        JOIN card_labels cl ON l.label_id = cl.label_id
                        WHERE cl.card_id = ?
                    `, [card.id]);
                    card.labels = labels.map(label => label.name);
                }
                list.cards = cards;
            }
        }

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
        // Lấy thông tin Board
        const [boards] = await pool.query(`
            SELECT board_id as id, user_id as userId, title as name, description, color, visibility 
            FROM boards WHERE board_id = ? AND user_id = ?
            ORDER BY id ASC
        `, [boardID, userId]);

        if (boards.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy board.' });
        }
        const board = boards[0];

        // Lấy Lists của Board
        const [lists] = await pool.query(`
            SELECT list_id as id, title, position 
            FROM lists 
            WHERE board_id = ? 
            ORDER BY position ASC
        `, [boardID]);

        // Lấy tất cả Cards thuộc các List trên
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

        // Ghép Cards vào Lists (Nested JSON)
        const listsWithCards = lists.map(list => {
            return {
                ...list,
                id: list.id.toString(), 
                cards: cards
                    .filter(c => c.list_id === list.id)
                    .map(c => ({...c, id: c.id.toString()}))
            };
        });

        // Trả về kết quả
        board.lists = listsWithCards;
        board.id = board.id.toString();
        
        res.status(200).json(board);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server khi lấy chi tiết board' });
    }
});

// Create Board
app.post('/api/boards', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { name, description, color, visibility } = req.body;

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
        
        // Trả về data đã update
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

// Create Card
app.post('/api/boards/:boardId/lists/:listId/cards', authMiddleware, async (req, res) => {
    // const userId = req.user.id;
    const { listId } = req.params;
    const { title, description, dueDate, members } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Tiêu đề card là bắt buộc' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Tính toán vị trí (position) để card nằm cuối list
        const [rows] = await connection.query('SELECT MAX(position) as maxPos FROM cards WHERE list_id = ?', [listId]);
        const newPosition = (rows[0].maxPos || 0) + 1024; 

        // Insert vào bảng cards
        const [result] = await connection.query(
            'INSERT INTO cards (list_id, title, description, position, due_date, status) VALUES (?, ?, ?, ?, ?, ?)',
            [listId, title, description || '', newPosition, dueDate || null, 'in progress']
        );

        const newCardId = result.insertId;

        // Insert vào bảng card_members (nếu có members)
        if (members && Array.isArray(members) && members.length > 0) {
            const memberValues = members.map(uid => [newCardId, uid]);
            await connection.query('INSERT INTO card_members (card_id, user_id) VALUES ?', [memberValues]);
        }

        await connection.commit();

        // Trả về object card vừa tạo
        const newCard = {
            card_id: newCardId,
            list_id: Number(listId),
            title,
            description: description || '',
            position: newPosition,
            due_date: dueDate || null,
            status: 'in progress',
            members: members || []
        };

        res.status(201).json(newCard);

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Lỗi server khi tạo card', error: err.message });
    } finally {
        connection.release();
    }
});

// Update Card
app.put('/api/boards/:boardId/lists/:listId/cards/:cardId', authMiddleware, async (req, res) => {
    const { cardId } = req.params;
    const { title, description, dueDate, status, members } = req.body;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Cập nhật bảng cards (Chỉ cập nhật field nào được gửi lên)
        const updateFields = [];
        const updateValues = [];

        if (title !== undefined) { updateFields.push('title = ?'); updateValues.push(title); }
        if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
        if (dueDate !== undefined) { updateFields.push('due_date = ?'); updateValues.push(dueDate); }
        if (status !== undefined) { updateFields.push('status = ?'); updateValues.push(status); }

        if (updateFields.length > 0) {
            updateValues.push(cardId);
            const query = `UPDATE cards SET ${updateFields.join(', ')} WHERE card_id = ?`;
            await connection.query(query, updateValues);
        }

        // Cập nhật bảng card_members
        if (members && Array.isArray(members)) {
            await connection.query('DELETE FROM card_members WHERE card_id = ?', [cardId]);

            if (members.length > 0) {
                const memberValues = members.map(uid => [cardId, uid]);
                await connection.query('INSERT INTO card_members (card_id, user_id) VALUES ?', [memberValues]);
            }
        }

        await connection.commit();

        // Lấy lại card đã update để trả về frontend
        const [updatedRows] = await connection.query('SELECT * FROM cards WHERE card_id = ?', [cardId]);
        const updatedCard = updatedRows[0];
        
        // Lấy members mới để trả về luôn
        const [memberRows] = await connection.query('SELECT user_id FROM card_members WHERE card_id = ?', [cardId]);
        updatedCard.members = memberRows.map(row => row.user_id);

        res.json(updatedCard);

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Lỗi cập nhật card', error: err.message });
    } finally {
        connection.release();
    }
});

// Delete Card
app.delete('/api/boards/:boardId/lists/:listId/cards/:cardId', authMiddleware, async (req, res) => {
    const { cardId } = req.params;

    try {
        const [result] = await pool.query('DELETE FROM cards WHERE card_id = ?', [cardId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Card không tồn tại để xóa' });
        }

        res.status(204).send(); // 204 No Content
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi xóa card', error: err.message });
    }
});