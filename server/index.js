import express, { json } from 'express'
import cors from 'cors';
import validator from 'validator';
// import session from 'express-session'
// import passport from 'passport';
// import { Strategy as LocalStrategy } from 'passport-local';
// import { Strategy as GoogleStrategy } from 'passport-google-oauth20';   // Google Acc
// import { Strategy as GitHubStrategy } from 'passport-github2';          // GitHub Acc
// import { Strategy as MicrosoftStrategy } from 'passport-microsoft';     // Microsoft Acc
import bcrypt from 'bcryptjs'       // hash password
import jwt from 'jsonwebtoken'      // transfer client and server: header + payload + signature (JSON File)

const app = express();
app.use(express.json())     // Server reads body of request in JSON

// PORT = 3000
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://localhost:5173', // Cho phép frontend truy cập từ port 5173
}));

app.listen(PORT, () => {
    console.log(`Server đang chạy (listening) tại http://localhost:${PORT}`);
});

process.env.JWT_SECRET = '4_ong_deu_ten_Cuong';

// Create simple database
const users = [];
let userIdCounter = 1;

const DEFAULT_BOARDS_TEMPLATE = [
    {
      "id": 1,
      "userId": 101,
      "name": "Công việc nhóm",
      "description": "Các công việc cần hoàn thành theo nhóm.",
      "color": "linear-gradient(135deg, #667eea, #764ba2)",
      "visibility":"Workspace",
      "lists": [
        {
          "id": "list_1",
          "title": "To Do",
          "cards": [
            {
              "id": "card_1",
              "title": "Thiết kế giao diện trang chủ",
              "description": "Dùng Figma để tạo layout cơ bản.",
              "labels": ["design"],
              "dueDate": "2025-11-10"
            },
            {
              "id": "card_2",
              "title": "Phân công nhiệm vụ",
              "description": "Chia việc cho từng thành viên.",
              "labels": ["management"]
            }
          ]
        },
        {
          "id": "list_2",
          "title": "In Progress",
          "cards": []
        },
        {
          "id": "list_3",
          "title": "Done",
          "cards": []
        }
      ]
    },
    {
      "id": 2,
      "userId": 101,
      "name": "Dự án React",
      "description": "Làm project web quản lý công việc bằng React.",
      "color": "linear-gradient(135deg, #fddb92, #d1fdff)",
      "visibility":"Workspace",
      "lists": [
        {
          "id": "list_4",
          "title": "To Do",
          "cards": [
            {
              "id": "card_3",
              "title": "Tạo component Login",
              "description": "Form đăng nhập với validation.",
              "labels": ["frontend"]
            }
          ]
        }
      ]
    },
    {
      "id": 3,
       "userId": 102,
      "name": "Việc cá nhân",
      "description": "Danh sách việc riêng trong tuần.",
      "color": "#722ed1",
      "visibility":"Workspace",
      "lists": []
    }
];

// let userBoards = {};
let userBoards = DEFAULT_BOARDS_TEMPLATE.map(board => ({ ...board }));

// Route (API ENDPOINTS)
app.get('/', (req, res) => {
    res.send(`
        <h1>Backend Quản lý Công việc</h1>
        <p>Server đang chạy. Các endpoint có sẵn:</p>
        <ul>
            <li><b>POST /register</b>: { name, email, password, avatar_url? }</li>
            <li><b>POST /login</b>: { email, password }</li>
            <li><b>GET /api/profile</b>: (Yêu cầu token xác thực)</li>
            <li><b>GET /api/admin/data</b>: (Yêu cầu token xác thực của ADMIN)</li>
        </ul>
        <p><b>Database (Users):</b></p>
        <pre>${JSON.stringify(users, null, 2)}</pre>
        <pre>${JSON.stringify(userBoards, null, 2)}</pre>
    `);
});

// Register new account
app.post('/register', async (req, res) => {
    const { name, email, password, avatar_url } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đủ name, email, và password.' });
    }

    // Check format of email
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: 'Định dạng email không hợp lệ. Vui lòng kiểm tra lại.' });
    }

    // How strong is the password
    const passwordOptions = {
        minLength: 8,
        maxLength: 20,
        minNumbers: 1,
        minUppercase: 1,
        minSymbols: 1,
        minLowercase: 0,
        returnScore: false
    };

    if (!validator.isStrongPassword(password, passwordOptions)) {
        const errorMessage = `Mật khẩu không đủ mạnh. Yêu cầu: Dài từ 8 đến 20 ký tự, có ít nhất 1 chữ số (0-9), có ít nhất 1 chữ cái viết hoa (A-Z), có ít nhất 1 ký tự đặc biệt (ví dụ: !@#$%^&*).`;
        return res.status(400).json({ message: errorMessage });
    }

    try {
        // Email existed ?
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email đã được đăng ký.' });
        }

        // Hashing password
        // Salting: add random strings into password
        const salt = await bcrypt.genSalt(10); // Create Salt
        const passwordHash = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = {
            id: (userIdCounter++).toString(),
            name: name,
            email: email,
            passwordHash: passwordHash,
            role: 'member',         // Default role
            avatar_url: avatar_url || `https://placehold.co/400x400/EEE/31343C?text=${name.charAt(0)}`,
            createdAt: new Date()
        };

        // Save to database
        users.push(newUser);
        userBoards[newUser.id] = JSON.parse(JSON.stringify(DEFAULT_BOARDS_TEMPLATE));

        console.log('Users database sau khi đăng ký:', users);
        console.log('UserBoards database sau khi đăng ký:', userBoards);

        // Successful
        res.status(201).json({
            message: 'Đăng ký thành công!',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                avatar_url: newUser.avatar_url
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
})

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Vui lòng cung cấp email và password.' });
    }

    try {
        const user = users.find(user => user.email === email);
        if (!user) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng.' });
        }

        console.log(users)

        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            role: user.role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Đăng nhập thành công!',
            token: token
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
});

// Middleware: confirm token, only for one user, each user have a different token
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Truy cập bị từ chối. Không tìm thấy token.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedPayload;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
};

// Middleware to check admin
const adminOnlyMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Truy cập bị cấm. Yêu cầu quyền Admin.' });
    }
};

// Route for all users (not change)
app.get('/api/profile', authMiddleware, (req, res) => {
    const userInfo = req.user;
    res.status(200).json({
        message: 'Đây là thông tin profile của bạn',
        user: userInfo
    });
});

// Route for admin (not change)
app.get('/api/admin/data', authMiddleware, adminOnlyMiddleware, (req, res) => {
    res.status(200).json({
        message: `Chào mừng Admin ${req.user.name}! Đây là dữ liệu bí mật của admin.`,
        sensitiveData: [
            { id: 1, info: "Dữ liệu chỉ admin thấy" },
            { id: 2, info: "Toàn bộ danh sách người dùng" }
        ]
    });
});

/**
 * @route   GET /api/boards
 * @desc    Lấy tất cả các board của user đã đăng nhập
 * @access  Private
 */
app.get('/api/boards', authMiddleware, (req, res) => {
    const userID = req.user.id;
    const boards = userBoards[userID] || [];

    res.status(200).json(boards);
})

/**
 * @route   GET /api/boards/:boardId
 * @desc    Lấy một board cụ thể bằng ID, 
 * @access  Private
 */

app.get('/api/boards/:boardID', authMiddleware, (req, res) => {
    const userID = req.user.id;
    const { boardID } = req.params;

    const boardsOfUser = userBoards[userID] || [];
    console.log("boardsOfUser", boardsOfUser)

    const board = boardsOfUser.find(b => b.id.toString() === boardID);

    if (!board) {
        return res.status(404).json({ message: 'Không tìm thấy board hoặc bạn không có quyền truy cập.' });
    }

    res.status(200).json(board);
})

// Add, edit, delete boards in database
// let userBoardsCopy = DEFAULT_BOARDS_TEMPLATE.map(board => ({ ...board }));

// Auto-increasingly Id for board
// let nextBoardId = userBoards.reduce((maxId, board) => Math.max(maxId, board.id), 0) + 1;

// Post new boards
app.post('/api/boards', authMiddleware,(req, res) => {
    const userId = req.user.id;

    const { name, description, color, visibility } = req.body;
    
    if (!userId) {
        return res.status(401).json({ message: "Chưa xác thực" });
    }

    if (!name) {
        return res.status(400).json({ message: 'Tên board là bắt buộc' });
    }

    const boardsOfThisUser = userBoards[userId];

    if (!boardsOfThisUser) {
        return res.status(404).json({ message: 'Không tìm thấy dữ liệu board cho user này' });
    }

    const newBoardId = boardsOfThisUser.length
        ? Math.max(...boardsOfThisUser.map(b => b.id)) + 1
        : 1;

    const newBoard = {
        id: newBoardId,
        userId: userId,
        name: name,
        description: description || '',
        color: color || 'linear-gradient(135deg, #667eea, #764ba2)',
        visibility: visibility || 'Workspace',
        lists: [] // Board mới mặc định không có list
    };

    boardsOfThisUser.push(newBoard);
    console.log(`UserBoards của user ${userId} sau khi thêm:`, userBoards[userId]);

    res.status(201).json(newBoard);
})

// Edit new boards
app.put('/api/boards/:id', authMiddleware,(req, res) => {
    const userId = req.user.id; 

    if (!userId) {
        return res.status(401).json({ message: "Chưa xác thực" });
    }

    // Lấy boardId từ URL params
    const boardId = parseInt(req.params.id, 10);
    if (isNaN(boardId)) {
        return res.status(400).json({ message: 'Board ID không hợp lệ' });
    }
    
    // Lấy dữ liệu mới từ body
    const { name, description, color, visibility } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Tên board là bắt buộc' });
    }

    // Lấy mảng board của user
    const boardsOfThisUser = userBoards[userId];
    if (!boardsOfThisUser) {
        return res.status(404).json({ message: 'Không tìm thấy dữ liệu board cho user này' });
    }

    // Tìm index của board cần cập nhật
    const boardIndex = boardsOfThisUser.findIndex(b => b.id === boardId);

    if (boardIndex === -1) {
        // Board ID này không tồn tại trong mảng của user
        return res.status(404).json({ message: 'Không tìm thấy board' });
    }

    // Cập nhật board tại index đó
    const originalBoard = boardsOfThisUser[boardIndex];
    const updatedBoard = {
        ...originalBoard, // Giữ lại ID và lists cũ
        name: name,
        description: description !== undefined ? description : originalBoard.description,
        color: color || originalBoard.color,
        visibility: visibility || originalBoard.visibility
    };

    boardsOfThisUser[boardIndex] = updatedBoard;
    
    console.log(`UserBoards của user ${userId} sau khi SỬA:`, userBoards[userId]);
    res.json(updatedBoard);
});

// Delete boards
app.delete('/api/boards/:id', authMiddleware,(req, res) => {
    const userId = req.user.id;
    if (!userId) {
        return res.status(401).json({ message: "Chưa xác thực" });
    }

    const boardId = parseInt(req.params.id, 10);
    if (isNaN(boardId)) {
        return res.status(400).json({ message: 'Board ID không hợp lệ' });
    }

    const boardsOfThisUser = userBoards[userId];
    if (!boardsOfThisUser) {
        return res.status(404).json({ message: 'Không tìm thấy dữ liệu board cho user này' });
    }

    const boardIndex = boardsOfThisUser.findIndex(b => b.id === boardId);

    if (boardIndex === -1) {
        // Board ID này không tồn tại trong mảng của user
        return res.status(404).json({ message: 'Không tìm thấy board' });
    }

    boardsOfThisUser.splice(boardIndex, 1);
    
    console.log(`UserBoards của user ${userId} sau khi XOÁ:`, userBoards[userId]);
    res.status(204).send();
});


// Lưu ý, phải lưu token bằng localStorage trong frontend thì mới chạy đúng được
// Quy trình: 
// Đăng nhập và Lưu token (Login) -> Gửi token đi (khi gọi API lấy data) -> Đăng xuất (xóa token khoit localStorage)