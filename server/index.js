import express, { json } from "express";
import cors from "cors";
import validator from "validator";
// import session from 'express-session'
// import passport from 'passport';
// import { Strategy as LocalStrategy } from 'passport-local';
// import { Strategy as GoogleStrategy } from 'passport-google-oauth20';   // Google Acc
// import { Strategy as GitHubStrategy } from 'passport-github2';          // GitHub Acc
// import { Strategy as MicrosoftStrategy } from 'passport-microsoft';     // Microsoft Acc
import bcrypt from "bcryptjs"; // hash password
import jwt from "jsonwebtoken"; // transfer client and server: header + payload + signature (JSON File)
// import { authorize } from 'passport';
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
app.use(express.json()); // Server reads body of request in JSON

// PORT = 3000
const PORT = process.env.PORT || 3000;
process.env.JWT_SECRET = "4_ong_deu_ten_Cuong";

const corsOptions = {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
};

app.use(cors(corsOptions));

// app.listen(PORT, () => {
//     console.log(`Server đang chạy (listening) tại http://localhost:${PORT}`);
// });

httpServer.listen(PORT, () => {
    console.log(`Server Socket.io đang chạy tại http://localhost:${PORT}`);
});

const io = new Server(httpServer, {
    cors: corsOptions,
});

// Create simple database
const users = [];
let userIdCounter = 1;
const userNotifications = {};

const DEFAULT_BOARDS_TEMPLATE = [
    {
        id: 1,
        userId: 1,
        name: "Công việc nhóm",
        description: "Các công việc cần hoàn thành theo nhóm.",
        color: "linear-gradient(135deg, #667eea, #764ba2)",
        visibility: "Workspace",
        members: [],
        events: [
            {
                event_id: 1,
                title: "Deadline nộp báo cáo",
                start_time: "2025-12-15T09:00:00.000Z",
                end_time: "2025-12-15T11:00:00.000Z",
                description: "Nộp cho quản lý qua email",
            },
            {
                event_id: 2,
                title: "Họp team tiến độ",
                start_time: "2025-12-16T14:00:00.000Z",
                end_time: "2025-12-16T15:30:00.000Z",
                description: "Review code phần Frontend",
            }
        ],
        lists: [
            {
                id: "list_1",
                title: "To Do",
                cards: [
                    {
                        id: "card_1",
                        title: "Thiết kế giao diện trang chủ",
                        description: "Dùng Figma để tạo layout cơ bản.",
                        labels: ["design"],
                        dueDate: "2025-11-10",
                        state: "Inprogress",
                        isDone: false,
                        checklists: [
                            {
                                id: 1,
                                title: "Yêu cầu thiết kế",
                                items: [
                                    { description: "Màu chủ đạo", isCompleted: true },
                                    { description: "Logo placement", isCompleted: false }
                                ]
                            }
                        ],
                    },
                    {
                        id: "card_2",
                        title: "Phân công nhiệm vụ",
                        description: "Chia việc cho từng thành viên.",
                        labels: ["management"],
                        state: "Inprogress",
                        isDone: false,
                        checklists: [],
                    },
                ],
            },
            {
                id: "list_2",
                title: "In Progress",
                cards: [],
            },
            {
                id: "list_3",
                title: "Done",
                cards: [],
            },
            { id: "inbox", title: "Inbox", cards: [] },
        ],
    },
    {
        id: 2,
        userId: 1,
        name: "Dự án React",
        description: "Làm project web quản lý công việc bằng React.",
        color: "linear-gradient(135deg, #fddb92, #d1fdff)",
        visibility: "Workspace",
        members: [],
        events: [],
        lists: [
            {
                id: "list_4",
                title: "To Do",
                cards: [
                    {
                        id: "card_3",
                        title: "Tạo component Login",
                        description: "Form đăng nhập với validation.",
                        labels: ["frontend"],
                        state: "Inprogress",
                    },
                ],
            },
            { id: "inbox", title: "Inbox", cards: [] },
        ],
    },
    {
        id: 3,
        userId: 2,
        name: "Việc cá nhân",
        description: "Danh sách việc riêng trong tuần.",
        color: "#722ed1",
        visibility: "Workspace",
        members: [],
        events: [],
        lists: [{ id: "inbox", title: "Inbox", cards: [] }],
    },
];

let userBoards = {};
// let userBoards = JSON.parse(JSON.stringify(DEFAULT_BOARDS_TEMPLATE));
let calendarEvents = [];
let mockChecklists = [];
let checklistIdCounter = 1;

let mockChecklistItems = [];
let itemIdCounter = 1;

// Get events from Template to fill calenderEvents
const initMockDatabase = () => {
    calendarEvents = [];

    DEFAULT_BOARDS_TEMPLATE.forEach((board) => {
        if (board.events && Array.isArray(board.events)) {
            board.events.forEach((event) => {
                calendarEvents.push({
                    ...event,
                    board_id: board.id, // Quan trọng: Gán khóa ngoại board_id
                });
            });
        }

        // Init checklists
        board.lists.forEach((list) => {
            list.cards.forEach((card) => {
                if (card.checklists && Array.isArray(card.checklists)) {
                    card.checklists.forEach(clTemplate => {
                        // Tạo checklist giả lập vào bảng mockChecklists
                        const newChecklistId = checklistIdCounter++;
                        mockChecklists.push({
                            checklist_id: newChecklistId,
                            card_id: card.id, // Foreign Key
                            title: clTemplate.title
                        });

                        // Tạo items giả lập vào bảng mockChecklistItems
                        if (clTemplate.items) {
                            clTemplate.items.forEach(item => {
                                mockChecklistItems.push({
                                    item_id: itemIdCounter++,
                                    checklist_id: newChecklistId, // Foreign Key
                                    description: item.description,
                                    is_completed: item.isCompleted || false
                                });
                            });
                        }
                    });
                    // Xóa field checklist trong template gốc để chuẩn hóa dữ liệu (Card không chứa trực tiếp checklist nữa)
                    delete card.checklists;
                }

                // Đảm bảo card nào cũng có field isDone
                if (card.isDone === undefined) card.isDone = false;
            });
        });
    });
    console.log(`[Database] Đã khởi tạo ${calendarEvents.length} sự kiện calendar từ Template.`);
};

initMockDatabase();

let eventIdCounter = calendarEvents.length > 0 ? Math.max(...calendarEvents.map((e) => e.event_id)) + 1 : 1;

io.use((socket, next) => {
    // Log ra để kiểm tra xem Token nằm ở đâu
    console.log("--- DEBUG SOCKET HANDSHAKE ---");
    console.log("Auth Token:", socket.handshake.auth.token);
    console.log("Query Token:", socket.handshake.query.token);

    // Chấp nhận Token từ cả 2 nguồn để chắc chắn
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
        console.log("-> LỖI: Không tìm thấy token!");
        return next(new Error("Authentication error: Token missing"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        console.log("-> Success: User", decoded.id);
        next();
    } catch (err) {
        console.log("-> LỖI: Token không hợp lệ:", err.message);
        next(new Error("Authentication error: Invalid token"));
    }
});
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    socket.join(`user_${socket.user.id}`);

    socket.on("join-board", (boardId) => {
        socket.join(boardId.toString());
        console.log(`User ${socket.user.id} joined board ${boardId}`);
    });

    socket.on("leave-board", (boardId) => {
        socket.leave(boardId.toString());
    });

    socket.on("disconnect", () => {
        console.log("User disconnected", socket.user.id);
    });
});

app.set("socketio", io);

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
            avatar: actor.avatar_url,
        },
        target: {
            boardId: boardId.toString(),
            cardId: card.id.toString(),
        },
    };

    // Lưu vào In-Memory Store (userNotifications)
    if (!userNotifications[userId]) {
        userNotifications[userId] = [];
    }
    // Thêm vào đầu mảng
    userNotifications[userId].unshift(newNotification);

    // Bắn Socket Real-time
    io.to(`user_${userId}`).emit("notification_received", newNotification);
    console.log(`[Socket] Đã gửi thông báo cho User ID ${userId}`);
};

// Route (API ENDPOINTS)
app.get("/", (req, res) => {
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
app.post("/register", async (req, res) => {
    const { name, email, password, avatar_url } = req.body;

    if (!name || !email || !password) {
        return res
            .status(400)
            .json({ message: "Vui lòng cung cấp đủ name, email, và password." });
    }

    // Check format of email
    if (!validator.isEmail(email)) {
        return res
            .status(400)
            .json({
                message: "Định dạng email không hợp lệ. Vui lòng kiểm tra lại.",
            });
    }

    // How strong is the password
    const passwordOptions = {
        minLength: 8,
        maxLength: 20,
        minNumbers: 1,
        minUppercase: 1,
        minSymbols: 1,
        minLowercase: 0,
        returnScore: false,
    };

    if (!validator.isStrongPassword(password, passwordOptions)) {
        const errorMessage = `Mật khẩu không đủ mạnh. Yêu cầu: Dài từ 8 đến 20 ký tự, có ít nhất 1 chữ số (0-9), có ít nhất 1 chữ cái viết hoa (A-Z), có ít nhất 1 ký tự đặc biệt (ví dụ: !@#$%^&*).`;
        return res.status(400).json({ message: errorMessage });
    }

    try {
        // Email existed ?
        const existingUser = users.find((user) => user.email === email);
        if (existingUser) {
            return res.status(400).json({ message: "Email đã được đăng ký." });
        }

        // Hashing password
        // Salting: add random strings into password
        const salt = await bcrypt.genSalt(10); // Create Salt
        const passwordHash = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = {
            id: userIdCounter++,
            name: name,
            email: email,
            passwordHash: passwordHash,
            role: "member", // Default role
            avatar_url:
                avatar_url ||
                `https://placehold.co/400x400/EEE/31343C?text=${name.charAt(0)}`,
            createdAt: new Date(),
        };

        // Save to database
        users.push(newUser);
        userBoards[newUser.id] = JSON.parse(
            JSON.stringify(DEFAULT_BOARDS_TEMPLATE)
        ).filter((b) => b.userId === newUser.id);

        console.log("Users database sau khi đăng ký:", users);
        console.log("UserBoards database sau khi đăng ký:", userBoards);

        // Successful
        res.status(201).json({
            message: "Đăng ký thành công!",
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                avatar_url: newUser.avatar_url,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res
            .status(400)
            .json({ message: "Vui lòng cung cấp email và password." });
    }

    try {
        const user = users.find((user) => user.email === email);
        if (!user) {
            return res
                .status(400)
                .json({ message: "Email hoặc mật khẩu không đúng." });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res
                .status(400)
                .json({ message: "Email hoặc mật khẩu không đúng." });
        }

        console.log(users);

        const payload = {
            id: Number(user.id),
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            role: user.role,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });

        res.status(200).json({
            message: "Đăng nhập thành công!",
            token: token,
            payload: payload,
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
});

// Middleware: confirm token, only for one user, each user have a different token
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
            .status(401)
            .json({ message: "Truy cập bị từ chối. Không tìm thấy token." });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedPayload;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }
};

// Middleware to check admin
const adminOnlyMiddleware = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        res.status(403).json({ message: "Truy cập bị cấm. Yêu cầu quyền Admin." });
    }
};

// Route for all users (not change)
app.get("/api/profile", authMiddleware, (req, res) => {
    const userInfo = req.user;
    res.status(200).json({
        message: "Đây là thông tin profile của bạn",
        user: userInfo,
    });
});

// Route for admin (not change)
app.get("/api/admin/data", authMiddleware, adminOnlyMiddleware, (req, res) => {
    res.status(200).json({
        message: `Chào mừng Admin ${req.user.name}! Đây là dữ liệu bí mật của admin.`,
        sensitiveData: [
            { id: 1, info: "Dữ liệu chỉ admin thấy" },
            { id: 2, info: "Toàn bộ danh sách người dùng" },
        ],
    });
});

/**
 * @route   GET /api/boards
 * @desc    Lấy tất cả các board của user đã đăng nhập
 * @access  Private
 */
app.get("/api/boards", authMiddleware, (req, res) => {
    const userId = Number(req.user.id);

    if (!userBoards[userId]) {
        userBoards[userId] = []; // đảm bảo luôn tồn tại
    }

    // 1. Boards sở hữu
    const ownedBoards = userBoards[userId].filter((b) => b.userId === userId);

    // 2. Boards được share vào
    const sharedBoards = Object.values(userBoards)
        .flat()
        .filter((b) => b.members?.some((m) => m.id === userId));

    let result = [...ownedBoards, ...sharedBoards];

    // MAP DỮ LIỆU TỪ "BẢNG" EVENTS VÀO BOARD (Tương tự SQL JOIN)
    result = result.map(board => {
        // Tìm các event có board_id trùng khớp
        const realTimeEvents = calendarEvents.filter(e => e.board_id === board.id);

        // Trả về board với field events được cập nhật mới nhất
        return {
            ...board,
            events: realTimeEvents
        };
    });

    res.status(200).json(result);
});

/**
 * @route   GET /api/boards/:boardId
 * @desc    Lấy một board cụ thể bằng ID,
 * @access  Private
 */

app.get("/api/boards/:boardID", authMiddleware, (req, res) => {
    const userID = Number(req.user.id);
    const { boardID } = req.params;

    const allBoards = Object.values(userBoards).flat();

    const board = allBoards.find((b) => b.id.toString() === boardID);

    if (!board) {
        return res.status(404).json({ message: "Không tìm thấy board." });
    }

    // KIỂM TRA QUYỀN TRUY CẬP (Rất quan trọng)
    const isOwner = board.userId === userID;
    const isMember = board.members?.some((m) => m.id === userID);

    if (!isOwner && !isMember) {
        return res
            .status(403)
            .json({ message: "Bạn không có quyền truy cập board này." });
    }

    // Lấy events mới nhất từ biến calendarEvents ghép vào
    const currentEvents = calendarEvents.filter(e => e.board_id === board.id);

    // Tạo object trả về 
    const responseData = {
        ...board,
        events: currentEvents
    };

    res.status(200).json(board);
});

// Add, edit, delete boards in database
// let userBoardsCopy = DEFAULT_BOARDS_TEMPLATE.map(board => ({ ...board }));

// Auto-increasingly Id for board
// let nextBoardId = userBoards.reduce((maxId, board) => Math.max(maxId, board.id), 0) + 1;

// Post new boards
app.post("/api/boards", authMiddleware, (req, res) => {
    const userId = req.user.id;

    const { name, description, color, visibility } = req.body;

    if (!userId) {
        return res.status(401).json({ message: "Chưa xác thực" });
    }

    if (!name) {
        return res.status(400).json({ message: "Tên board là bắt buộc" });
    }

    const boardsOfThisUser = userBoards[userId];

    if (!boardsOfThisUser) {
        return res
            .status(404)
            .json({ message: "Không tìm thấy dữ liệu board cho user này" });
    }

    const newBoardId = boardsOfThisUser.length
        ? Math.max(...boardsOfThisUser.map((b) => b.id)) + 1
        : 1;

    const newBoard = {
        id: newBoardId,
        userId: Number(userId),
        name: name,
        description: description || "",
        color: color || "linear-gradient(135deg, #667eea, #764ba2)",
        visibility: visibility || "Workspace",
        lists: [{ id: "inbox", title: "Inbox", cards: [] }], // Board mới mặc định không có list
    };

    boardsOfThisUser.push(newBoard);
    console.log(
        `UserBoards của user ${userId} sau khi thêm:`,
        userBoards[userId]
    );

    res.status(201).json(newBoard);
});

// Edit new boards
app.put("/api/boards/:id", authMiddleware, (req, res) => {
    const userId = req.user.id;

    if (!userId) {
        return res.status(401).json({ message: "Chưa xác thực" });
    }

    // Lấy boardId từ URL params
    const boardId = parseInt(req.params.id, 10);
    if (isNaN(boardId)) {
        return res.status(400).json({ message: "Board ID không hợp lệ" });
    }

    // Lấy dữ liệu mới từ body
    const { name, description, color, visibility } = req.body;
    if (!name) {
        return res.status(400).json({ message: "Tên board là bắt buộc" });
    }

    // Lấy mảng board của user
    const boardsOfThisUser = userBoards[userId];
    if (!boardsOfThisUser) {
        return res
            .status(404)
            .json({ message: "Không tìm thấy dữ liệu board cho user này" });
    }

    // Tìm index của board cần cập nhật
    const boardIndex = boardsOfThisUser.findIndex((b) => b.id === boardId);

    if (boardIndex === -1) {
        // Board ID này không tồn tại trong mảng của user
        return res.status(404).json({ message: "Không tìm thấy board" });
    }

    // Cập nhật board tại index đó
    const originalBoard = boardsOfThisUser[boardIndex];
    const updatedBoard = {
        ...originalBoard,
        name: name !== undefined ? name : originalBoard.name,
        description: description !== undefined ? description : originalBoard.description,
        color: color !== undefined ? color : originalBoard.color,
        visibility: visibility !== undefined ? visibility : originalBoard.visibility,
    };

    boardsOfThisUser[boardIndex] = updatedBoard;

    console.log(`UserBoards của user ${userId} sau khi SỬA:`, userBoards[userId]);
    res.json(updatedBoard);
});

// Delete boards
app.delete("/api/boards/:id", authMiddleware, (req, res) => {
    const userId = req.user.id;
    if (!userId) {
        return res.status(401).json({ message: "Chưa xác thực" });
    }

    const boardId = parseInt(req.params.id, 10);
    if (isNaN(boardId)) {
        return res.status(400).json({ message: "Board ID không hợp lệ" });
    }

    const boardsOfThisUser = userBoards[userId];
    if (!boardsOfThisUser) {
        return res
            .status(404)
            .json({ message: "Không tìm thấy dữ liệu board cho user này" });
    }

    const boardIndex = boardsOfThisUser.findIndex((b) => b.id === boardId);

    if (boardIndex === -1) {
        // Board ID này không tồn tại trong mảng của user
        return res.status(404).json({ message: "Không tìm thấy board" });
    }

    boardsOfThisUser.splice(boardIndex, 1);

    console.log(`UserBoards của user ${userId} sau khi XOÁ:`, userBoards[userId]);
    res.status(204).send();
});

// Lưu ý, phải lưu token bằng localStorage trong frontend thì mới chạy đúng được
// Quy trình:
// Đăng nhập và Lưu token (Login) -> Gửi token đi (khi gọi API lấy data) -> Đăng xuất (xóa token khoit localStorage)

app.post("/api/boards/:boardId/lists", authMiddleware, (req, res) => {
    const userId = Number(req.user.id);
    const { boardId } = req.params;
    const { title } = req.body;

    console.log("Kiểu dữ liệu", typeof boardId);

    if (!title) {
        return res
            .status(400)
            .json({ message: "Tiêu đề list không được để trống." });
    }

    const io = req.app.get("socketio");

    // Tìm board trong toàn bộ hệ thống (bao gồm cả board được share)
    const allBoards = Object.values(userBoards).flat();
    const board = allBoards.find((b) => b.id.toString() === boardId);

    if (!board) {
        return res
            .status(404)
            .json({ message: "Board không tồn tại hoặc không có quyền truy cập." });
    }

    // Kiểm tra quyền (Chủ sở hữu hoặc Thành viên)
    const isOwner = board.userId === userId;
    const isMember = board.members?.some((m) => m.id === userId);

    if (!isOwner && !isMember) {
        return res
            .status(403)
            .json({ message: "Bạn không có quyền thêm list vào board này." });
    }

    const newList = {
        id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: title,
        cards: [],
    };

    board.lists.push(newList);

    console.log(`[SERVER] Đang bắn socket update cho phòng: ${boardId}`);
    // io.to(boardId.toString()).emit('LIST_CREATED', newList);
    io.to(boardId.toString()).emit("board_updated", board);

    res.status(201).json(newList);
});

app.put("/api/boards/:boardId/lists/:listId", authMiddleware, (req, res) => {
    const userId = Number(req.user.id);
    const { boardId, listId } = req.params;
    console.log(boardId, listId);
    const { title } = req.body;

    const io = req.app.get("socketio");

    const allBoards = Object.values(userBoards).flat();
    const board = allBoards.find((b) => b.id.toString() === boardId);

    if (!board) {
        return res.status(404).json({ message: "Board không tồn tại." });
    }

    // Kiểm tra quyền
    const isOwner = board.userId === userId;
    const isMember = board.members?.some((m) => m.id === userId);

    if (!isOwner && !isMember) {
        return res
            .status(403)
            .json({ message: "Bạn không có quyền sửa list trong board này." });
    }

    const list = board.lists.find((l) => l.id === listId);
    if (!list) {
        return res.status(404).json({ message: "List không tồn tại." });
    }

    if (title) list.title = title;

    // io.to(boardId).emit('LIST_UPDATED', list);
    io.to(boardId.toString()).emit("board_updated", board);

    res.status(200).json(list);
});

app.delete("/api/boards/:boardId/lists/:listId", authMiddleware, (req, res) => {
    // const userId = req.user.id;
    const userId = Number(req.user.id);
    const { boardId, listId } = req.params;

    const io = req.app.get("socketio");

    const allBoards = Object.values(userBoards).flat();
    const board = allBoards.find((b) => b.id.toString() === boardId);

    if (!board) {
        return res.status(404).json({ message: "Board không tồn tại." });
    }

    // Kiểm tra quyền
    const isOwner = board.userId === userId;
    const isMember = board.members?.some((m) => m.id === userId);

    if (!isOwner && !isMember) {
        return res
            .status(403)
            .json({ message: "Bạn không có quyền xóa list trong board này." });
    }

    const listIndex = board.lists.findIndex((l) => l.id === listId);
    if (listIndex === -1) {
        return res.status(404).json({ message: "List không tồn tại." });
    }

    board.lists.splice(listIndex, 1);

    io.to(boardId).emit("LIST_DELETED", { listId });

    res.status(200).json({ message: "Đã xóa list thành công." });
});

// Drop lists
// app.put("/api/boards/lists/move", authMiddleware, (req, res) => {
//     const { sourceBoardId, destBoardId, listId, index } = req.body;

//     // Validation
//     if (!sourceBoardId || !destBoardId || !listId) {
//         return res
//             .status(400)
//             .json({
//                 message: "Thiếu thông tin: sourceBoardId, destBoardId hoặc listId.",
//             });
//     }

//     // 2. Tìm Board Nguồn và Board Đích
//     const sourceBoard = userBoards.find((b) => b.id == sourceBoardId);
//     const destBoard = userBoards.find((b) => b.id == destBoardId);

//     if (!sourceBoard) {
//         return res
//             .status(404)
//             .json({
//                 message: "Không tìm thấy Board nguồn hoặc không có quyền truy cập.",
//             });
//     }

//     if (!destBoard) {
//         return res
//             .status(404)
//             .json({
//                 message: "Không tìm thấy Board đích hoặc không có quyền truy cập.",
//             });
//     }

//     // List cần chuyển trong Board nguồn
//     const listIndex = sourceBoard.lists.findIndex((l) => l.id === listId);

//     if (listIndex === -1) {
//         return res
//             .status(404)
//             .json({ message: "Không tìm thấy List trong Board nguồn." });
//     }

//     // CẮT List ra khỏi Board nguồn (Dùng splice)
//     const [movedList] = sourceBoard.lists.splice(listIndex, 1);

//     // THÊM List vào Board đích
//     if (
//         typeof index === "number" &&
//         index >= 0 &&
//         index <= destBoard.lists.length
//     ) {
//         destBoard.lists.splice(index, 0, movedList);
//     } else {
//         destBoard.lists.push(movedList);
//     }

//     console.log(
//         `Đã chuyển list "${movedList.title}" từ Board ${sourceBoardId} sang Board ${destBoardId}`
//     );

//     res.status(200).json({
//         message: "Di chuyển List thành công",
//         sourceBoardId,
//         destBoardId,
//         movedList,
//     });
// });

// Move list
app.put("/api/boards/lists/move", authMiddleware, (req, res) => {
    const userId = req.user.id;
    const {
        sourceBoardId,
        destBoardId,
        listId,
        index
    } = req.body;

    const io = req.app.get("socketio");

    // 1. Validate input
    if (!sourceBoardId || !destBoardId || !listId) {
        return res.status(400).json({
            message: "Thiếu thông tin cần thiết để di chuyển list."
        });
    }

    if (!userBoards || typeof userBoards !== "object") {
        return res.status(500).json({
            message: "userBoards chưa được khởi tạo."
        });
    }

    // 2. Gom tất cả board
    const allBoards = Object.values(userBoards).flat();

    const sourceBoard = allBoards.find(b => String(b.id) === String(sourceBoardId));
    const destBoard   = allBoards.find(b => String(b.id) === String(destBoardId));

    if (!sourceBoard || !destBoard) {
        return res.status(404).json({
            message: "Không tìm thấy board nguồn hoặc board đích."
        });
    }

    // 3. Check quyền
    const hasPermission = (board) => {
        const isOwner  = board.userId === userId;
        const isMember = board.members?.some(m => m.id === userId);
        return isOwner || isMember;
    };

    if (!hasPermission(sourceBoard) || !hasPermission(destBoard)) {
        return res.status(403).json({
            message: "Bạn không có quyền chỉnh sửa board này."
        });
    }

    if (!Array.isArray(sourceBoard.lists) || !Array.isArray(destBoard.lists)) {
        return res.status(500).json({
            message: "Dữ liệu list không hợp lệ."
        });
    }

    // 4. Lấy list cần move
    const listIndex = sourceBoard.lists.findIndex(
        l => String(l.id) === String(listId)
    );

    if (listIndex === -1) {
        return res.status(404).json({
            message: "List không tồn tại trong board nguồn."
        });
    }

    const [movedList] = sourceBoard.lists.splice(listIndex, 1);

    // 5. Chèn vào board đích
    if (
        typeof index === "number" &&
        index >= 0 &&
        index <= destBoard.lists.length
    ) {
        destBoard.lists.splice(index, 0, movedList);
    } else {
        destBoard.lists.push(movedList);
    }

    console.log(
        `Đã chuyển List "${movedList.title}" từ Board ${sourceBoardId} sang Board ${destBoardId}`
    );

    // 6. Emit socket realtime
    if (io) {
        const payload = {
            movedList,
            sourceBoardId,
            destBoardId,
            index
        };

        io.to(String(sourceBoardId)).emit("LIST_MOVED", payload);

        if (String(destBoardId) !== String(sourceBoardId)) {
            io.to(String(destBoardId)).emit("LIST_MOVED", payload);
        }

        io.to(String(sourceBoardId)).emit("board_updated", sourceBoard);

        if (String(destBoardId) !== String(sourceBoardId)) {
            io.to(String(destBoardId)).emit("board_updated", destBoard);
        }
    }

    // 7. Response
    res.status(200).json({
        message: "Di chuyển List thành công",
        movedList
    });
});


// Drop cards
app.put("/api/cards/move", authMiddleware, (req, res) => {
    const userId = req.user.id;
    const {
        sourceBoardId,
        sourceListId,
        destBoardId,
        destListId,
        cardId,
        index,
    } = req.body;

    const io = req.app.get("socketio");

    if (
        !sourceBoardId ||
        !destBoardId ||
        !sourceListId ||
        !destListId ||
        !cardId
    ) {
        return res
            .status(400)
            .json({ message: "Thiếu thông tin ID cần thiết để di chuyển card." });
    }

    const allBoards = Object.values(userBoards).flat();
    const sourceBoard = allBoards.find((b) => b.id == sourceBoardId);
    const destBoard = allBoards.find((b) => b.id == destBoardId);

    if (!sourceBoard || !destBoard) {
        return res
            .status(404)
            .json({ message: "Không tìm thấy Board hoặc không có quyền truy cập." });
    }

    // Hàm kiểm tra quyền (Owner hoặc Member)
    const checkPermission = (board) => {
        const isOwner = board.userId === userId;
        const isMember = board.members?.some(m => m.id === userId);
        return isOwner || isMember;
    };

    // Check quyền truy cập cả board nguồn và board đích
    if (!checkPermission(sourceBoard) || !checkPermission(destBoard)) {
        return res
            .status(403)
            .json({ message: "Bạn không có quyền chỉnh sửa trên board này." });
    }

    const sourceList = sourceBoard.lists.find((l) => l.id === sourceListId);
    const destList = destBoard.lists.find((l) => l.id === destListId);

    if (!sourceList || !destList) {
        return res
            .status(404)
            .json({ message: "Không tìm thấy List nguồn hoặc đích." });
    }

    const cardIndex = sourceList.cards.findIndex(
        (c) => String(c.id) === String(cardId)
    );
    if (cardIndex === -1) {
        return res
            .status(404)
            .json({
                message: `Card không tồn tại trong List nguồn.CardID là ${cardId}`,
            });
    }

    const [movedCard] = sourceList.cards.splice(cardIndex, 1);

    if (
        typeof index === "number" &&
        index >= 0 &&
        index <= destList.cards.length
    ) {
        destList.cards.splice(index, 0, movedCard);
    } else {
        destList.cards.push(movedCard);
    }

    console.log(
        `Đã chuyển Card "${movedCard.title}" từ List "${sourceList.title}" sang List "${destList.title}"`
    );

    // Broadcast real-time update to clients in the involved board rooms
    try {
        if (io) {
            const payload = {
                movedCard,
                sourceListId,
                destListId,
                sourceBoardId,
                destBoardId,
                index,
            };
            // Emit to source and destination board rooms (if different, both will receive)
            io.to(String(sourceBoardId)).emit("CARD_MOVED", payload);
            if (String(destBoardId) !== String(sourceBoardId)) {
                io.to(String(destBoardId)).emit("CARD_MOVED", payload);
            }
        }
    } catch (e) {
        console.error("Socket emit error:", e);
    }

    io.to(String(sourceBoardId)).emit("board_updated", sourceBoard);

    if (String(destBoardId) !== String(sourceBoardId)) {
        io.to(String(destBoardId)).emit("board_updated", destBoard);
    }

    res.status(200).json({
        message: "Di chuyển Card thành công",
        movedCard,
        sourceListId,
        destListId,
    });
});

// Create new cards
app.post(
    "/api/boards/:boardId/lists/:listId/cards",
    authMiddleware,
    (req, res) => {
        const userId = Number(req.user.id);
        const { boardId, listId } = req.params;
        const { title, description, labels, dueDate, members } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Tiêu đề card là bắt buộc" });
        }

        const allBoards = Object.values(userBoards).flat();
        const board = allBoards.find((b) => b.id.toString() === boardId);

        if (!board) {
            return res
                .status(404)
                .json({ message: "Board không tồn tại hoặc không có quyền truy cập." });
        }

        // Kiểm tra quyền
        const isOwner = board.userId === userId;
        const isMember = board.members?.some((m) => m.id === userId);

        if (!isOwner && !isMember) {
            return res
                .status(403)
                .json({ message: "Bạn không có quyền xóa list trong board này." });
        }

        const list = board.lists.find((l) => l.id === listId);
        if (!list) {
            return res
                .status(404)
                .json({ message: "List không tồn tại trong Board này." });
        }

        const randomId = Math.random().toString(36).substr(2, 9);

        const newCard = {
            id: `card_${randomId}`,
            title: title,
            description: description || "",
            labels: labels || [],
            dueDate: dueDate || null,
            members: members || [],
            state: "Inprogress",
        };

        list.cards.push(newCard);

        console.log(
            `User ${userId} đã thêm card "${title}" vào list "${list.title}"`
        );
        console.log("List sau khi thêm card:", list.cards);

        io.to(boardId.toString()).emit("board_updated", board);
        res.status(201).json(newCard);
    }
);

// Edit cards
// Edit cards (Đã tích hợp Socket Notification)
app.put(
    "/api/boards/:boardId/lists/:listId/cards/:cardId",
    authMiddleware,
    (req, res) => {
        const userId = Number(req.user.id); // Người đang thực hiện hành động (Actor)
        const { boardId, listId, cardId } = req.params;
        const { title, description, labels, dueDate, members, state } = req.body;

        const allBoards = Object.values(userBoards).flat();
        const board = allBoards.find((b) => b.id.toString() === boardId);

        if (!board)
            return res.status(404).json({ message: "Board không tồn tại." });

        // Kiểm tra quyền
        const isOwner = board.userId === userId;
        const isMember = board.members?.some((m) => m.id === userId);

        if (!isOwner && !isMember) {
            return res
                .status(403)
                .json({ message: "Bạn không có quyền xóa list trong board này." });
        }

        const list = board.lists.find((l) => l.id === listId);
        if (!list) return res.status(404).json({ message: "List không tồn tại." });

        const card = list.cards.find((c) => c.id === cardId);
        if (!card) return res.status(404).json({ message: "Card không tồn tại." });

        // --- LOGIC XỬ LÝ THAY ĐỔI VÀ THÔNG BÁO ---
        if (members !== undefined) {
            const oldMembers = card.members || [];
            card.members = members;

            const addedMembers = members.filter((mId) => !oldMembers.includes(mId));

            if (addedMembers.length > 0) {
                const actor = {
                    id: req.user.id,
                    name: req.user.name,
                    avatar_url: req.user.avatar_url,
                };

                addedMembers.forEach((targetUserId) => {
                    if (Number(targetUserId) !== Number(userId)) {
                        sendNotification({
                            userId: Number(targetUserId), // User nhận
                            actor: actor, // User gửi
                            card: card, // Card liên quan
                            boardId: boardId,
                            type: "assigned",
                            message: `đã thêm bạn vào thẻ "${card.title || "Không tên"}"`,
                        });
                    }
                });
            }
        }

        if (title !== undefined) card.title = title;
        if (description !== undefined) card.description = description;
        if (labels !== undefined) card.labels = labels;
        if (dueDate !== undefined) card.dueDate = dueDate;
        if (state !== undefined) card.state = state;

        console.log(`Đã cập nhật card ${cardId}`);

        // const io = req.app.get("io")

        io.to(boardId.toString()).emit("board_updated", board);

        res.json(card);
    }
);

// Delete cards
app.delete(
    "/api/boards/:boardId/lists/:listId/cards/:cardId",
    authMiddleware,
    (req, res) => {
        const userId = Number(req.user.id);
        const { boardId, listId, cardId } = req.params;

        const allBoards = Object.values(userBoards).flat();
        const board = allBoards.find((b) => b.id.toString() === boardId);

        if (!board)
            return res.status(404).json({ message: "Board không tồn tại." });

        // Kiểm tra quyền
        const isOwner = board.userId === userId;
        const isMember = board.members?.some((m) => m.id === userId);

        if (!isOwner && !isMember) {
            return res
                .status(403)
                .json({ message: "Bạn không có quyền xóa list trong board này." });
        }

        const list = board.lists.find((l) => l.id === listId);
        if (!list) return res.status(404).json({ message: "List không tồn tại." });

        const cardIndex = list.cards.findIndex((c) => c.id === cardId);
        if (cardIndex === -1)
            return res.status(404).json({ message: "Card không tồn tại." });

        // Xóa card khỏi mảng
        list.cards.splice(cardIndex, 1);

        console.log(`Đã xóa card ${cardId}`);

        io.to(boardId.toString()).emit("board_updated", board);
        res.status(204).send();
    }
);

// Lấy danh sách thông báo
app.get("/api/notifications", authMiddleware, (req, res) => {
    const userId = req.user.id;
    // Trả về mảng thông báo của user, nếu chưa có thì trả về mảng rỗng
    const notis = userNotifications[userId] || [];
    res.json(notis);
});

// Đánh dấu đã đọc
app.put("/api/notifications/:id/read", authMiddleware, (req, res) => {
    const userId = req.user.id;
    const notiId = req.params.id;

    const notis = userNotifications[userId];
    if (notis) {
        const notification = notis.find((n) => n.id === notiId);
        if (notification) {
            notification.isRead = true;
        }
    }
    res.json({ success: true });
});

// Add Member
app.post("/api/boards/add-member", authMiddleware, (req, res) => {
    try {
        const currentUserId = req.user.id;
        const currentUserEmail = req.user.email;

        const { boardId, memberEmail, role } = req.body;

        if (!boardId || !memberEmail) {
            return res
                .status(400)
                .json({ message: "Vui lòng cung cấp Board ID và Email thành viên." });
        }

        // Tìm người dùng muốn thêm (Member) trong database users
        const memberToAdd = users.find((u) => u.email === memberEmail);

        if (!memberToAdd) {
            return res
                .status(404)
                .json({ message: "Không tìm thấy người dùng với email này." });
        }

        // Không cho phép tự thêm chính mình
        if (memberToAdd.id === currentUserId) {
            return res
                .status(400)
                .json({ message: "Bạn không thể tự thêm chính mình vào board." });
        }

        // Tìm Board trong danh sách board của người đang đăng nhập
        if (!userBoards[currentUserId]) {
            return res.status(404).json({ message: "Bạn chưa có board nào." });
        }

        // Tìm board cụ thể
        const targetBoard = userBoards[currentUserId].find((b) => b.id == boardId);

        if (!targetBoard) {
            return res
                .status(404)
                .json({
                    message: "Không tìm thấy Board hoặc bạn không có quyền truy cập.",
                });
        }

        // Kiểm tra xem thành viên này đã có trong board chưa
        if (!targetBoard.members) {
            targetBoard.members = [];
        }

        const isAlreadyMember = targetBoard.members.some(
            (m) => m.id === memberToAdd.id
        );
        if (isAlreadyMember) {
            return res
                .status(400)
                .json({ message: "Thành viên này đã có trong nhóm." });
        }

        // Thêm thành viên vào danh sách `members` của Board
        const newMemberInfo = {
            id: memberToAdd.id,
            name: memberToAdd.name,
            email: memberToAdd.email,
            avatar_url: memberToAdd.avatar_url,
            role: role, // Role mặc định
            addedAt: new Date(),
        };

        targetBoard.members.push(newMemberInfo);

        // Kiểm tra xem người được mời đã có danh sách board chưa
        if (!userBoards[memberToAdd.id]) {
            userBoards[memberToAdd.id] = [];
        }

        const alreadyShared = userBoards[memberToAdd.id].some(
            (b) => b.id == targetBoard.id
        );
        if (!alreadyShared) {
            console.log(
                `Đã share Board ID ${targetBoard.id} sang dashboard của User ID ${memberToAdd.id}`
            );
        }

        // Tạo thông báo (Notification)
        const notiContent = {
            id: `noti_${Date.now()}`,
            type: "invite",
            message: `${req.user.name} đã thêm bạn vào bảng "${targetBoard.name}"`,
            sender: { name: req.user.name, avatar: req.user.avatar_url },
            boardId: targetBoard.id,
            createdAt: new Date(),
            isRead: false,
        };

        if (!userNotifications[memberToAdd.id]) {
            userNotifications[memberToAdd.id] = [];
        }
        userNotifications[memberToAdd.id].unshift(notiContent);

        // Gửi Socket Real-time (Để client bên kia tự cập nhật UI)
        io.to(`user_${memberToAdd.id}`).emit("notification_received", notiContent);

        // Bắn sự kiện "Bạn vừa được thêm vào board" để client tự fetch lại list board
        io.to(`user_${memberToAdd.id}`).emit("board_joined", targetBoard);

        io.to(targetBoard.id.toString()).emit("board_updated", targetBoard);

        res.status(200).json({
            message: "Thêm thành viên thành công!",
            member: newMemberInfo,
            board: targetBoard,
        });
    } catch (error) {
        console.error("Lỗi add member:", error);
        res
            .status(500)
            .json({
                message: "Lỗi server khi thêm thành viên.",
                error: error.message,
            });
    }
});


// ==========================================
// CALENDAR API ENDPOINTS
// ==========================================

// Lấy danh sách sự kiện của một board
app.get("/api/boards/:boardId/events", authMiddleware, (req, res) => {
    const userId = Number(req.user.id);
    const boardId = Number(req.params.boardId);

    // Tìm board trong userBoards (để check quyền)
    const allBoards = Object.values(userBoards).flat();
    const board = allBoards.find((b) => b.id === boardId);

    if (!board) {
        return res.status(404).json({ message: "Board không tồn tại." });
    }

    // Check quyền (Owner hoặc Member mới xem được lịch)
    const isOwner = board.userId === userId;
    const isMember = board.members?.some((m) => m.id === userId);

    if (!isOwner && !isMember) {
        return res.status(403).json({ message: "Bạn không có quyền xem lịch của board này." });
    }

    // Lọc sự kiện thuộc board_id này từ "bảng" calendarEvents
    const events = calendarEvents.filter((e) => e.board_id === boardId);

    res.status(200).json(events);
});

// Tạo sự kiện mới
app.post("/api/boards/:boardId/events", authMiddleware, (req, res) => {
    const userId = Number(req.user.id);
    const boardId = Number(req.params.boardId);
    const { title, start_time, end_time, description } = req.body;

    // Validate input
    if (!title || !start_time || !end_time) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc (title, start_time, end_time)." });
    }

    // Check quyền truy cập board
    const allBoards = Object.values(userBoards).flat();
    const board = allBoards.find((b) => b.id === boardId);

    if (!board) {
        return res.status(404).json({ message: "Board không tồn tại." });
    }

    const isOwner = board.userId === userId;
    const isMember = board.members?.some((m) => m.id === userId);

    if (!isOwner && !isMember) {
        return res.status(403).json({ message: "Bạn không có quyền thêm sự kiện vào board này." });
    }

    // Tạo event mới
    const newEvent = {
        event_id: eventIdCounter++,
        board_id: boardId,
        title: title,
        start_time: start_time,
        end_time: end_time,
        description: description || "",
    };

    calendarEvents.push(newEvent);

    // Socket.io
    io.emit("SERVER_EVENT_CREATED", newEvent);

    console.log("New Event Created:", newEvent);
    res.status(201).json(newEvent);
});

// Cập nhật sự kiện (Kéo thả lịch, đổi tên, v.v.)
app.put("/api/events/:eventId", authMiddleware, (req, res) => {
    const userId = Number(req.user.id);
    const eventId = Number(req.params.eventId);
    const { title, start_time, end_time, description } = req.body;

    // Tìm event trong "bảng" calendarEvents
    const eventIndex = calendarEvents.findIndex((e) => e.event_id === eventId);
    if (eventIndex === -1) {
        return res.status(404).json({ message: "Sự kiện không tồn tại." });
    }

    const event = calendarEvents[eventIndex];

    // Check quyền
    const allBoards = Object.values(userBoards).flat();
    const board = allBoards.find((b) => b.id === event.board_id);

    // Nếu board bị xóa mất thì event mồ côi -> lỗi logic
    if (!board) return res.status(404).json({ message: "Board chứa sự kiện này không còn tồn tại." });

    const isOwner = board.userId === userId;
    const isMember = board.members?.some((m) => m.id === userId);

    if (!isOwner && !isMember) {
        return res.status(403).json({ message: "Không có quyền sửa sự kiện này." });
    }

    // Cập nhật
    const updatedEvent = {
        ...event,
        title: title || event.title,
        start_time: start_time || event.start_time,
        end_time: end_time || event.end_time,
        description: description !== undefined ? description : event.description,
    };

    calendarEvents[eventIndex] = updatedEvent;

    io.emit("SERVER_EVENT_UPDATED", updatedEvent);

    console.log("Event Updated:", updatedEvent);
    res.status(200).json(updatedEvent);
});

// Delete events
app.delete("/api/events/:eventId", authMiddleware, (req, res) => {
    const userId = Number(req.user.id);
    const eventId = Number(req.params.eventId);

    const eventIndex = calendarEvents.findIndex((e) => e.event_id === eventId);
    if (eventIndex === -1) {
        return res.status(404).json({ message: "Sự kiện không tồn tại." });
    }

    const event = calendarEvents[eventIndex];

    // Check quyền
    const allBoards = Object.values(userBoards).flat();
    const board = allBoards.find((b) => b.id === event.board_id);

    if (board) {
        const isOwner = board.userId === userId;
        const isMember = board.members?.some((m) => m.id === userId);
        if (!isOwner && !isMember) {
            return res.status(403).json({ message: "Không có quyền xóa sự kiện này." });
        }
    }

    // Xóa 
    calendarEvents.splice(eventIndex, 1);

    io.emit("SERVER_EVENT_DELETED", { event_id: eventId });

    console.log(`Event ID ${eventId} đã bị xóa.`);
    res.status(200).json({ message: "Đã xóa sự kiện thành công." });
});


// ==========================================
// CARD STATUS & CHECKLIST API
// ==========================================

app.put("/api/cards/:cardId/status", authMiddleware, (req, res) => {
    const userId = Number(req.user.id);
    const { cardId } = req.params;

    // Tìm Card trong toàn bộ userBoards (Deep Search)
    const allBoards = Object.values(userBoards).flat();
    let foundCard = null;
    let foundBoard = null;

    // Duyệt tìm card và board chứa nó
    for (const board of allBoards) {
        for (const list of board.lists) {
            const card = list.cards.find(c => String(c.id) === String(cardId));
            if (card) {
                foundCard = card;
                foundBoard = board;
                break;
            }
        }
        if (foundCard) break;
    }

    if (!foundCard) return res.status(404).json({ message: "Card không tồn tại." });

    // Check quyền
    const isOwner = foundBoard.userId === userId;
    const isMember = foundBoard.members?.some(m => m.id === userId);
    if (!isOwner && !isMember) return res.status(403).json({ message: "Không có quyền sửa card." });

    // Toggle trạng thái isDone (status BOOLEAN)
    foundCard.isDone = !foundCard.isDone;

    // Cập nhật state text 
    if (foundCard.isDone) {
        foundCard.state = "Done";
    } else {
        foundCard.state = "Inprogress";
    }

    foundCard.updated_at = new Date();

    // Socket: Báo cho mọi người biết card này đã đổi trạng thái
    io.emit("CARD_UPDATED", { boardId: foundBoard.id, card: foundCard });

    io.emit("board_updated", foundBoard);

    res.status(200).json(foundCard);
});

/**
 * @route   GET /api/cards/:cardId/checklists
 * @desc    Lấy toàn bộ checklist và items của 1 card (JOIN 2 bảng giả lập)
 */
app.get("/api/cards/:cardId/checklists", authMiddleware, (req, res) => {
    const { cardId } = req.params;

    // Tìm các checklist thuộc card này
    const checklists = mockChecklists.filter(cl => String(cl.card_id) === String(cardId));

    // Map items vào từng checklist (SQL Join Logic)
    const result = checklists.map(cl => {
        const items = mockChecklistItems.filter(item => item.checklist_id === cl.checklist_id);

        // Tính toán tiến độ (progress)
        const total = items.length;
        const completed = items.filter(i => i.is_completed).length;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

        return {
            ...cl,
            items: items,
            progress: progress
        };
    });

    res.status(200).json(result);
});

// Tạo 1 checklist
app.post("/api/cards/:cardId/checklists", authMiddleware, (req, res) => {
    const { cardId } = req.params;
    const { title } = req.body;

    if (!title) return res.status(400).json({ message: "Tiêu đề không được để trống" });

    const newChecklist = {
        checklist_id: checklistIdCounter++,
        card_id: cardId,
        title: title
    };

    mockChecklists.push(newChecklist);

    // Socket: Báo cập nhật
    io.emit("CHECKLIST_UPDATED", { cardId });

    res.status(201).json(newChecklist);
});

// Delete Checklist
app.delete("/api/checklists/:checklistId", authMiddleware, (req, res) => {
    const checklistId = Number(req.params.checklistId);

    // Tìm checklist để lấy card_id trước khi xóa (để emit socket)
    const checklist = mockChecklists.find(cl => cl.checklist_id === checklistId);
    if (!checklist) return res.status(404).json({ message: "Checklist không tồn tại" });

    // Xóa các items thuộc checklist này
    mockChecklistItems = mockChecklistItems.filter(item => item.checklist_id !== checklistId);

    // Xóa checklist
    mockChecklists = mockChecklists.filter(cl => cl.checklist_id !== checklistId);

    io.emit("CHECKLIST_UPDATED", { cardId: checklist.card_id });

    res.status(200).json({ message: "Đã xóa checklist thành công" });
});

/**
 * @route   POST /api/checklists/:checklistId/items
 * @desc    Thêm 1 việc nhỏ vào checklist
 */
app.post("/api/checklists/:checklistId/items", authMiddleware, (req, res) => {
    const checklistId = Number(req.params.checklistId);
    const { description } = req.body;

    if (!description) return res.status(400).json({ message: "Nội dung không được để trống" });

    const checklist = mockChecklists.find(cl => cl.checklist_id === checklistId);
    if (!checklist) return res.status(404).json({ message: "Checklist không tồn tại." });

    const newItem = {
        item_id: itemIdCounter++,
        checklist_id: checklistId,
        description: description,
        is_completed: false
    };

    mockChecklistItems.push(newItem);

    // Socket update real-time
    io.emit("CHECKLIST_UPDATED", { cardId: checklist.card_id });

    res.status(201).json(newItem);
});

/**
 * @route   PUT /api/checklist-items/:itemId/toggle
 * @desc    Tick chọn hoàn thành 1 item trong checklist
 */
app.put("/api/checklist-items/:itemId/toggle", authMiddleware, (req, res) => {
    const itemId = Number(req.params.itemId);

    const item = mockChecklistItems.find(i => i.item_id === itemId);
    if (!item) return res.status(404).json({ message: "Item không tồn tại." });

    // Toggle status
    item.is_completed = !item.is_completed;

    // Tìm checklist cha để lấy card_id gửi socket
    const checklist = mockChecklists.find(cl => cl.checklist_id === item.checklist_id);

    if (checklist) {
        io.emit("CHECKLIST_UPDATED", { cardId: checklist.card_id });
    }

    res.status(200).json(item);
});

// Delete items in checklist
app.delete("/api/checklist-items/:itemId", authMiddleware, (req, res) => {
    const itemId = Number(req.params.itemId);

    const item = mockChecklistItems.find(i => i.item_id === itemId);
    if (!item) return res.status(404).json({ message: "Item không tồn tại." });

    // Lưu lại checklist_id để tìm card_id
    const parentChecklistId = item.checklist_id;

    // Xóa item khỏi mảng
    mockChecklistItems = mockChecklistItems.filter(i => i.item_id !== itemId);

    // Tìm checklist cha để emit socket
    const checklist = mockChecklists.find(cl => cl.checklist_id === parentChecklistId);
    if (checklist) {
        io.emit("CHECKLIST_UPDATED", { cardId: checklist.card_id });
    }

    res.status(200).json({ message: "Đã xóa item" });
});

// Edit items in checklist
app.put("/api/checklist-items/:itemId", authMiddleware, (req, res) => {
    const itemId = Number(req.params.itemId);
    const { description } = req.body;

    const item = mockChecklistItems.find(i => i.item_id === itemId);
    if (!item) return res.status(404).json({ message: "Item không tồn tại." });

    item.description = description;

    const checklist = mockChecklists.find(cl => cl.checklist_id === item.checklist_id);
    if (checklist) {
        io.emit("CHECKLIST_UPDATED", { cardId: checklist.card_id });
    }

    res.status(200).json(item);
});