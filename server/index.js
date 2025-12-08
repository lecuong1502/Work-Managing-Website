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
// import { authorize } from 'passport';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
app.use(express.json())     // Server reads body of request in JSON

// PORT = 3000
const PORT = process.env.PORT || 3000;
process.env.JWT_SECRET = '4_ong_deu_ten_Cuong';

const corsOptions = {
    origin: 'http://localhost:5173',
    methods: ["GET", "POST", "PUT", "DELETE"]
};
app.use(cors(corsOptions));

// app.listen(PORT, () => {
//     console.log(`Server đang chạy (listening) tại http://localhost:${PORT}`);
// });

httpServer.listen(PORT, () => {
    console.log(`Server Socket.io đang chạy tại http://localhost:${PORT}`);
});

const io = new Server(httpServer, {
    cors: corsOptions
});

// Create simple database
const users = [];
let userIdCounter = 1;
const userNotifications = {};

const DEFAULT_BOARDS_TEMPLATE = [
    {
      "id": 1,
      "userId": 1,
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
      "userId": 1,
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
       "userId": 2,
      "name": "Việc cá nhân",
      "description": "Danh sách việc riêng trong tuần.",
      "color": "#722ed1",
      "visibility":"Workspace",
      "lists": []
    }
];
 
// let userBoards = {};
let userBoards = JSON.parse(JSON.stringify(DEFAULT_BOARDS_TEMPLATE));

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error("Authentication error"));
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (ID: ${socket.user.id})`);
    socket.join(`user_${socket.user.id}`);

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const sendNotification = ({ userId, actor, card, boardId, type, message }) => {
    // Tạo object thông báo
    const newNotification = {
        id: `noti_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: type, // 'assigned'
        message: message,
        isRead: false,
        createdAt: new Date(),
        sender: {
            id: actor.id.toString(),
            name: actor.name,
            avatar: actor.avatar_url
        },
        target: {
            boardId: boardId.toString(),
            cardId: card.id.toString()
        }
    };

    // Lưu vào In-Memory Store (userNotifications)
    if (!userNotifications[userId]) {
        userNotifications[userId] = [];
    }
    // Thêm vào đầu mảng
    userNotifications[userId].unshift(newNotification);

    // Bắn Socket Real-time
    io.to(`user_${userId}`).emit('notification_received', newNotification);
    console.log(`[Socket] Đã gửi thông báo cho User ID ${userId}`);
};

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
            id: (userIdCounter++),
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
            id: Number(user.id),
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
            token: token,
            payload: payload
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
    const userID = Number(req.user.id);
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
        userId: Number(userId),
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

app.post('/api/boards/:boardId/lists', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const { boardId } = req.params;
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Tiêu đề list không được để trống.' });
    }

    const boardsOfUser = userBoards[userId] || [];
    const board = boardsOfUser.find(b => b.id == boardId);

    if (!board) {
        return res.status(404).json({ message: 'Board không tồn tại hoặc không có quyền truy cập.' });
    }

    const newList = {
        id: `list_${Date.now()}`,
        title: title,
        cards: []
    };

    board.lists.push(newList);
    console.log("List trong board", board)
    console.log("List trong board", board.lists)
    res.status(201).json(newList);
});

app.put('/api/boards/:boardId/lists/:listId', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const { boardId, listId } = req.params;
    console.log(boardId, listId)
    const { title } = req.body;

    const boardsOfUser = userBoards[userId] || [];
    const board = boardsOfUser.find(b => b.id == boardId);
    if (!board) {
        return res.status(404).json({ message: 'Board không tồn tại.' });
    }

    const list = board.lists.find(l => l.id === listId);
    if (!list) {
        return res.status(404).json({ message: 'List không tồn tại.' });
    }

    if (title) list.title = title;

    res.status(200).json(list);
});

app.delete('/api/boards/:boardId/lists/:listId', authMiddleware, (req, res) => {
    // const userId = req.user.id;
    const { boardId, listId } = req.params;

    const board = userBoards.find(b => b.id == boardId);
    if (!board) {
        return res.status(404).json({ message: 'Board không tồn tại.' });
    }

    const listIndex = board.lists.findIndex(l => l.id === listId);
    if (listIndex === -1) {
        return res.status(404).json({ message: 'List không tồn tại.' });
    }

    board.lists.splice(listIndex, 1);

    res.status(200).json({ message: 'Đã xóa list thành công.' });
});

// Drop lists
app.put('/api/boards/lists/move', authMiddleware, (req, res) => {
    const { sourceBoardId, destBoardId, listId, index } = req.body;

    // Validation
    if (!sourceBoardId || !destBoardId || !listId) {
        return res.status(400).json({ message: 'Thiếu thông tin: sourceBoardId, destBoardId hoặc listId.' });
    }

    // 2. Tìm Board Nguồn và Board Đích
    const sourceBoard = userBoards.find(b => b.id == sourceBoardId);
    const destBoard = userBoards.find(b => b.id == destBoardId);

    if (!sourceBoard) {
        return res.status(404).json({ message: 'Không tìm thấy Board nguồn hoặc không có quyền truy cập.' });
    }

    if (!destBoard) {
        return res.status(404).json({ message: 'Không tìm thấy Board đích hoặc không có quyền truy cập.' });
    }

    // List cần chuyển trong Board nguồn
    const listIndex = sourceBoard.lists.findIndex(l => l.id === listId);
    
    if (listIndex === -1) {
        return res.status(404).json({ message: 'Không tìm thấy List trong Board nguồn.' });
    }

    // CẮT List ra khỏi Board nguồn (Dùng splice)
    const [movedList] = sourceBoard.lists.splice(listIndex, 1);

    // THÊM List vào Board đích
    if (typeof index === 'number' && index >= 0 && index <= destBoard.lists.length) {
        destBoard.lists.splice(index, 0, movedList);
    } else {
        destBoard.lists.push(movedList);
    }

    console.log(`Đã chuyển list "${movedList.title}" từ Board ${sourceBoardId} sang Board ${destBoardId}`);

    res.status(200).json({
        message: 'Di chuyển List thành công',
        sourceBoardId,
        destBoardId,
        movedList
    });
});

// Drop cards
app.put('/api/cards/move', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const { 
        sourceBoardId, 
        sourceListId, 
        destBoardId, 
        destListId, 
        cardId, 
        index 
    } = req.body;

    if (!sourceBoardId || !destBoardId || !sourceListId || !destListId || !cardId) {
        return res.status(400).json({ message: 'Thiếu thông tin ID cần thiết để di chuyển card.' });
    }

    const boardsOfUser = userBoards[userId] || [];
    const sourceBoard = boardsOfUser.find(b => b.id == sourceBoardId);
    const destBoard = boardsOfUser.find(b => b.id == destBoardId);

    if (!sourceBoard || !destBoard) {
        return res.status(404).json({ message: 'Không tìm thấy Board hoặc không có quyền truy cập.' });
    }

    const sourceList = sourceBoard.lists.find(l => l.id === sourceListId);
    const destList = destBoard.lists.find(l => l.id === destListId);

    if (!sourceList || !destList) {
        return res.status(404).json({ message: 'Không tìm thấy List nguồn hoặc đích.' });
    }

    const cardIndex = sourceList.cards.findIndex(c => String(c.id) === String(cardId));
    if (cardIndex === -1) {
        return res.status(404).json({ message: `Card không tồn tại trong List nguồn.CardID là ${cardId}`});
    }

    const [movedCard] = sourceList.cards.splice(cardIndex, 1);

    if (typeof index === 'number' && index >= 0 && index <= destList.cards.length) {
        destList.cards.splice(index, 0, movedCard);
    } else {
        destList.cards.push(movedCard);
    }

    console.log(`Đã chuyển Card "${movedCard.title}" từ List "${sourceList.title}" sang List "${destList.title}"`);

    res.status(200).json({
        message: 'Di chuyển Card thành công',
        movedCard,
        sourceListId,
        destListId
    });
});

// Create new cards
app.post('/api/boards/:boardId/lists/:listId/cards', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const { boardId, listId } = req.params;
    const { title, description, labels, dueDate, members } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Tiêu đề card là bắt buộc' });
    }

    const boardsOfUser = userBoards[userId] || [];
    const board = boardsOfUser.find(b => b.id == boardId);

    if (!board) {
        return res.status(404).json({ message: 'Board không tồn tại hoặc không có quyền truy cập.' });
    }

    const list = board.lists.find(l => l.id === listId);
    if (!list) {
        return res.status(404).json({ message: 'List không tồn tại trong Board này.' });
    }

    const randomId = Math.random().toString(36).substr(2, 9);

    const newCard = {
        id: `card_${randomId}`,
        title: title,
        description: description || '',
        labels: labels || [],   
        dueDate: dueDate || null,
        members: members || []
    };

    list.cards.push(newCard);

    console.log(`User ${userId} đã thêm card "${title}" vào list "${list.title}"`);
    console.log("List sau khi thêm card:", list.cards);

    
    res.status(201).json(newCard);
});

// Edit cards
// Edit cards (Đã tích hợp Socket Notification)
app.put('/api/boards/:boardId/lists/:listId/cards/:cardId', authMiddleware, (req, res) => {
    const userId = req.user.id; // Người đang thực hiện hành động (Actor)
    const { boardId, listId, cardId } = req.params;
    const { title, description, labels, dueDate, members } = req.body;

    const boardsOfUser = userBoards[userId] || [];
    const board = boardsOfUser.find(b => b.id == boardId);

    if (!board) return res.status(404).json({ message: 'Board không tồn tại.' });

    const list = board.lists.find(l => l.id === listId);
    if (!list) return res.status(404).json({ message: 'List không tồn tại.' });

    const card = list.cards.find(c => c.id === cardId);
    if (!card) return res.status(404).json({ message: 'Card không tồn tại.' });

    // --- LOGIC XỬ LÝ THAY ĐỔI VÀ THÔNG BÁO ---
    if (members !== undefined) {
        const oldMembers = card.members || [];
        card.members = members; 

        const addedMembers = members.filter(mId => !oldMembers.includes(mId));

        if (addedMembers.length > 0) {
            const actor = {
                id: req.user.id,
                name: req.user.name,
                avatar_url: req.user.avatar_url
            };

            addedMembers.forEach(targetUserId => {
                if (Number(targetUserId) !== Number(userId)) {
                    sendNotification({
                        userId: Number(targetUserId), // User nhận
                        actor: actor,                 // User gửi
                        card: card,                   // Card liên quan
                        boardId: boardId,
                        type: 'assigned',
                        message: `đã thêm bạn vào thẻ "${card.title || 'Không tên'}"`
                    });
                }
            });
        }
    }

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (labels !== undefined) card.labels = labels;
    if (dueDate !== undefined) card.dueDate = dueDate;

    console.log(`Đã cập nhật card ${cardId}`);
    res.json(card);
});

// Delete cards
app.delete('/api/boards/:boardId/lists/:listId/cards/:cardId', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const { boardId, listId, cardId } = req.params;

    const boardsOfUser = userBoards[userId] || [];
    const board = boardsOfUser.find(b => b.id == boardId);

    if (!board) return res.status(404).json({ message: 'Board không tồn tại.' });

    const list = board.lists.find(l => l.id === listId);
    if (!list) return res.status(404).json({ message: 'List không tồn tại.' });

    const cardIndex = list.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return res.status(404).json({ message: 'Card không tồn tại.' });

    // Xóa card khỏi mảng
    list.cards.splice(cardIndex, 1);

    console.log(`Đã xóa card ${cardId}`);
    res.status(204).send();
});

// Lấy danh sách thông báo
app.get('/api/notifications', authMiddleware, (req, res) => {
    const userId = req.user.id;
    // Trả về mảng thông báo của user, nếu chưa có thì trả về mảng rỗng
    const notis = userNotifications[userId] || [];
    res.json(notis);
});

// Đánh dấu đã đọc
app.put('/api/notifications/:id/read', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const notiId = req.params.id;
    
    const notis = userNotifications[userId];
    if (notis) {
        const notification = notis.find(n => n.id === notiId);
        if (notification) {
            notification.isRead = true;
        }
    }
    res.json({ success: true });
});


// ---------------------------------------
// LIEN KET VOI DATABASE
// ---------------------------------------
// import express from 'express';
// import cors from 'cors';
// import validator from 'validator';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import mysql from 'mysql2/promise'; // Sử dụng phiên bản promise của mysql2
// import dotenv from 'dotenv';

// dotenv.config(); // Nếu bạn dùng file .env

// const app = express();
// app.use(express.json());

// const PORT = process.env.PORT || 3000;
// process.env.JWT_SECRET = '4_ong_deu_ten_Cuong'; // Tốt nhất nên để trong file .env

// app.use(cors({
//     origin: 'http://localhost:5173',
// }));

// // --- CẤU HÌNH KẾT NỐI DATABASE ---
// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',           // Thay bằng user MySQL của bạn
//     password: '',           // Thay bằng mật khẩu MySQL của bạn
//     database: 'work_manager',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// // Kiểm tra kết nối
// pool.getConnection()
//     .then(conn => {
//         console.log("Đã kết nối thành công đến MySQL database 'work_manager'");
//         conn.release();
//     })
//     .catch(err => {
//         console.error("Lỗi kết nối database:", err);
//     });

// app.listen(PORT, () => {
//     console.log(`Server đang chạy tại http://localhost:${PORT}`);
// });

// // --- ROUTE (API ENDPOINTS) ---

// app.get('/', (req, res) => {
//     res.send(`
//         <h1>Backend Quản lý Công việc (MySQL Version)</h1>
//         <p>Server đang chạy với Database.</p>
//     `);
// });

// // --- AUTHENTICATION ---

// // Register
// app.post('/register', async (req, res) => {
//     const { name, email, password, avatar_url } = req.body;

//     if (!name || !email || !password) {
//         return res.status(400).json({ message: 'Vui lòng cung cấp đủ name, email, và password.' });
//     }

//     if (!validator.isEmail(email)) {
//         return res.status(400).json({ message: 'Email không hợp lệ.' });
//     }

//     // Password strength check (giữ nguyên logic cũ)
//     const passwordOptions = { minLength: 8, minNumbers: 1, minUppercase: 1, minSymbols: 1, minLowercase: 0 };
//     if (!validator.isStrongPassword(password, passwordOptions)) {
//         return res.status(400).json({ message: 'Mật khẩu yếu (Cần 8 ký tự, 1 số, 1 hoa, 1 ký tự đặc biệt).' });
//     }

//     try {
//         // Kiểm tra email tồn tại
//         const [existingUsers] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
//         if (existingUsers.length > 0) {
//             return res.status(400).json({ message: 'Email đã được đăng ký.' });
//         }

//         const salt = await bcrypt.genSalt(10);
//         const passwordHash = await bcrypt.hash(password, salt);
        
//         // Mặc định avatar nếu không có
//         const finalAvatar = avatar_url || `https://placehold.co/400x400/EEE/31343C?text=${name.charAt(0)}`;

//         // Insert vào DB
//         // Lưu ý: DB dùng 'username', API dùng 'name'. Ta map name -> username
//         const [result] = await pool.query(
//             'INSERT INTO users (username, email, password_hash, avatar_url, role) VALUES (?, ?, ?, ?, ?)',
//             [name, email, passwordHash, finalAvatar, 'member']
//         );

//         res.status(201).json({
//             message: 'Đăng ký thành công!',
//             user: {
//                 id: result.insertId,
//                 name: name,
//                 email: email,
//                 role: 'member',
//                 avatar_url: finalAvatar
//             }
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Lỗi server', error: err.message });
//     }
// });

// // Login
// app.post('/login', async (req, res) => {
//     const { email, password } = req.body;

//     if (!email || !password) {
//         return res.status(400).json({ message: 'Vui lòng nhập email và password.' });
//     }

//     try {
//         const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
//         const user = users[0];

//         if (!user) {
//             return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng.' });
//         }

//         const isMatch = await bcrypt.compare(password, user.password_hash);
//         if (!isMatch) {
//             return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng.' });
//         }

//         const payload = {
//             id: user.user_id,
//             email: user.email,
//             name: user.username,
//             avatar_url: user.avatar_url,
//             role: user.role
//         };

//         const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

//         res.status(200).json({
//             message: 'Đăng nhập thành công!',
//             token: token
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Lỗi server', error: err.message });
//     }
// });

// // --- MIDDLEWARES ---

// const authMiddleware = (req, res, next) => {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         return res.status(401).json({ message: 'Không tìm thấy token.' });
//     }
//     const token = authHeader.split(' ')[1];
//     try {
//         const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
//         req.user = decodedPayload;
//         next();
//     } catch (err) {
//         res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn.' });
//     }
// };

// // --- BOARDS API ---

// // Get All Boards
// app.get('/api/boards', authMiddleware, async (req, res) => {
//     try {
//         const userId = req.user.id;
//         // Select và đổi tên cột để khớp với Frontend (title -> name)
//         const [boards] = await pool.query(`
//             SELECT 
//                 board_id as id, 
//                 user_id as userId, 
//                 title as name, 
//                 description, 
//                 color, 
//                 visibility 
//             FROM boards 
//             WHERE user_id = ?
//             ORDER BY created_at DESC
//         `, [userId]);

//         // Cần gán lists rỗng mặc định để frontend không lỗi map()
//         const boardsWithLists = boards.map(b => ({ ...b, lists: [] }));
        
//         res.status(200).json(boardsWithLists);
//     } catch (err) {
//         res.status(500).json({ message: 'Lỗi lấy danh sách board' });
//     }
// });

// // Get Single Board (Kèm Lists và Cards)
// app.get('/api/boards/:boardID', authMiddleware, async (req, res) => {
//     const { boardID } = req.params;
//     const userId = req.user.id;

//     try {
//         // 1. Lấy thông tin Board
//         const [boards] = await pool.query(`
//             SELECT board_id as id, user_id as userId, title as name, description, color, visibility 
//             FROM boards WHERE board_id = ? AND user_id = ?
//         `, [boardID, userId]);

//         if (boards.length === 0) {
//             return res.status(404).json({ message: 'Không tìm thấy board.' });
//         }
//         const board = boards[0];

//         // 2. Lấy Lists của Board
//         const [lists] = await pool.query(`
//             SELECT list_id as id, title, position 
//             FROM lists 
//             WHERE board_id = ? 
//             ORDER BY position ASC
//         `, [boardID]);

//         // 3. Lấy tất cả Cards thuộc các List trên
//         const listIds = lists.map(l => l.id);
//         let cards = [];
//         if (listIds.length > 0) {
//             const [cardsData] = await pool.query(`
//                 SELECT 
//                     card_id as id, 
//                     list_id, 
//                     title, 
//                     description, 
//                     position, 
//                     due_date as dueDate 
//                 FROM cards 
//                 WHERE list_id IN (?)
//                 ORDER BY position ASC
//             `, [listIds]);
//             cards = cardsData;
//         }

//         // 4. Ghép Cards vào Lists (Nested JSON)
//         const listsWithCards = lists.map(list => {
//             return {
//                 ...list,
//                 // Chuyển id về string để khớp với frontend cũ (nếu cần thiết)
//                 id: list.id.toString(), 
//                 cards: cards
//                     .filter(c => c.list_id === list.id)
//                     .map(c => ({...c, id: c.id.toString()}))
//             };
//         });

//         // 5. Trả về kết quả
//         board.lists = listsWithCards;
//         board.id = board.id.toString(); // Frontend thường thích ID là string
        
//         res.status(200).json(board);

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Lỗi server khi lấy chi tiết board' });
//     }
// });

// // Create Board
// app.post('/api/boards', authMiddleware, async (req, res) => {
//     const userId = req.user.id;
//     const { name, description, color, visibility } = req.body; // Frontend gửi 'name', DB dùng 'title'

//     if (!name) return res.status(400).json({ message: 'Tên board là bắt buộc' });

//     try {
//         const [result] = await pool.query(
//             'INSERT INTO boards (user_id, title, description, color, visibility) VALUES (?, ?, ?, ?, ?)',
//             [userId, name, description || '', color || '#667eea', visibility || 'Workspace']
//         );

//         const newBoard = {
//             id: result.insertId,
//             userId,
//             name,
//             description,
//             color,
//             visibility,
//             lists: []
//         };
//         res.status(201).json(newBoard);
//     } catch (err) {
//         res.status(500).json({ message: 'Lỗi tạo board', error: err.message });
//     }
// });

// // Update Board
// app.put('/api/boards/:id', authMiddleware, async (req, res) => {
//     const boardId = req.params.id;
//     const userId = req.user.id;
//     const { name, description, color, visibility } = req.body;

//     try {
//         // Kiểm tra quyền sở hữu
//         const [check] = await pool.query('SELECT board_id FROM boards WHERE board_id = ? AND user_id = ?', [boardId, userId]);
//         if (check.length === 0) return res.status(404).json({ message: 'Board không tồn tại hoặc không có quyền.' });

//         await pool.query(
//             'UPDATE boards SET title = ?, description = ?, color = ?, visibility = ? WHERE board_id = ?',
//             [name, description, color, visibility, boardId]
//         );
        
//         // Trả về data đã update (Giả lập)
//         res.json({ id: boardId, name, description, color, visibility });
//     } catch (err) {
//         res.status(500).json({ message: 'Lỗi cập nhật board' });
//     }
// });

// // Delete Board
// app.delete('/api/boards/:id', authMiddleware, async (req, res) => {
//     const boardId = req.params.id;
//     const userId = req.user.id;

//     try {
//         const [result] = await pool.query('DELETE FROM boards WHERE board_id = ? AND user_id = ?', [boardId, userId]);
        
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ message: 'Board không tồn tại hoặc không có quyền.' });
//         }
//         res.status(204).send();
//     } catch (err) {
//         res.status(500).json({ message: 'Lỗi xóa board' });
//     }
// });

// // --- LISTS API ---

// // Create List
// app.post('/api/boards/:boardId/lists', authMiddleware, async (req, res) => {
//     const { boardId } = req.params;
//     const { title } = req.body;

//     if (!title) return res.status(400).json({ message: 'Tiêu đề list trống.' });

//     try {
//         // Lấy vị trí lớn nhất hiện tại để gán cho list mới nằm cuối
//         const [rows] = await pool.query('SELECT MAX(position) as maxPos FROM lists WHERE board_id = ?', [boardId]);
//         const newPos = (rows[0].maxPos || 0) + 1000; // Tăng khoảng cách để dễ chèn

//         const [result] = await pool.query(
//             'INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)',
//             [boardId, title, newPos]
//         );

//         res.status(201).json({
//             id: result.insertId.toString(),
//             title: title,
//             cards: []
//         });
//     } catch (err) {
//         res.status(500).json({ message: 'Lỗi tạo list' });
//     }
// });

// // Update List
// app.put('/api/boards/:boardId/lists/:listId', authMiddleware, async (req, res) => {
//     const { listId } = req.params;
//     const { title } = req.body;

//     try {
//         await pool.query('UPDATE lists SET title = ? WHERE list_id = ?', [title, listId]);
//         res.status(200).json({ id: listId, title });
//     } catch (err) {
//         res.status(500).json({ message: 'Lỗi cập nhật list' });
//     }
// });

// // Delete List
// app.delete('/api/boards/:boardId/lists/:listId', authMiddleware, async (req, res) => {
//     const { listId } = req.params;
//     try {
//         await pool.query('DELETE FROM lists WHERE list_id = ?', [listId]);
//         res.status(200).json({ message: 'Đã xóa list' });
//     } catch (err) {
//         res.status(500).json({ message: 'Lỗi xóa list' });
//     }
// });

// // Move List (Kéo thả List)
// app.put('/api/boards/lists/move', authMiddleware, async (req, res) => {
//     const { sourceBoardId, destBoardId, listId, index } = req.body;

//     try {
//         // Trong thực tế, cần tính lại position dựa trên index.
//         // Cách đơn giản nhất ở đây: Update board_id (nếu chuyển board) và gán position mới.
//         // Để làm chuẩn tính năng Drag & Drop, frontend nên gửi lên 'newPosition' (float) thay vì index.
//         // Ở đây mình tạm gán position = index * 10000 để demo logic cập nhật DB.
        
//         const newPosition = (index + 1) * 10000; 

//         await pool.query(
//             'UPDATE lists SET board_id = ?, position = ? WHERE list_id = ?',
//             [destBoardId, newPosition, listId]
//         );

//         res.status(200).json({ message: 'Di chuyển list thành công' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Lỗi di chuyển list' });
//     }
// });

// // --- CARDS API ---

// // Move Card (Kéo thả Card)
// app.put('/api/cards/move', authMiddleware, async (req, res) => {
//     const { destListId, cardId, index } = req.body; // Chỉ cần biết list đích và vị trí

//     try {
//         // Tương tự Move List, cập nhật cha mới và vị trí mới
//         const newPosition = (index + 1) * 10000;

//         await pool.query(
//             'UPDATE cards SET list_id = ?, position = ? WHERE card_id = ?',
//             [destListId, newPosition, cardId]
//         );

//         res.status(200).json({ message: 'Di chuyển card thành công' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Lỗi di chuyển card' });
//     }
// });

// // Bạn cần thêm API Create Card và Edit/Delete Card nếu frontend có gọi (dựa trên code cũ thì hình như bạn chưa viết phần POST card trong code mẫu, nhưng database đã có).
// // Ví dụ thêm card:
// app.post('/api/lists/:listId/cards', authMiddleware, async (req, res) => {
//     const { listId } = req.params;
//     const { title } = req.body;

//     try {
//         const [rows] = await pool.query('SELECT MAX(position) as maxPos FROM cards WHERE list_id = ?', [listId]);
//         const newPos = (rows[0].maxPos || 0) + 1000;

//         const [result] = await pool.query(
//             'INSERT INTO cards (list_id, title, position) VALUES (?, ?, ?)',
//             [listId, title, newPos]
//         );
//         res.status(201).json({ id: result.insertId.toString(), title, listId });
//     } catch (err) {
//         res.status(500).json({ message: 'Lỗi tạo card' });
//     }
// });