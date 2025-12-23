import express from "express";
import cors from "cors";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { createServer, get } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
});

const PORT = process.env.PORT || 3000;
process.env.JWT_SECRET = "4_ong_deu_ten_Cuong";

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

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://task-manager-beta-eight-59.vercel.app",
    "https://client-opal-ten.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
};

app.use(cors(corsOptions));

// --- CẤU HÌNH KẾT NỐI DATABASE ---
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: "work_manager",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Kiểm tra kết nối
pool
  .getConnection()
  .then((conn) => {
    console.log("Đã kết nối thành công đến MySQL database 'work_manager'");
    conn.release();
  })
  .catch((err) => {
    console.error("Lỗi kết nối database:", err);
  });

// --- HÀM TIỆN ÍCH ---

// Hàm gửi thông báo (Lưu DB + Bắn Socket)
async function sendNotification({
  userId,
  actorId,
  cardId,
  boardId,
  type,
  message,
}) {
  try {
    // 1. Lưu vào Database
    const [result] = await pool.query(
      "INSERT INTO notifications (user_id, actor_id, card_id, board_id, type, message) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, actorId, cardId, boardId, type, message]
    );

    const notificationData = {
      id: result.insertId,
      userId,
      actorId,
      cardId,
      boardId,
      type,
      message,
      isRead: 0,
      createdAt: new Date(),
    };

    // 2. Bắn Socket tới Real-time tới user đó
    io.to(`user_${userId}`).emit("new_notification", notificationData);
    console.log(`Đã gửi thông báo tới user_${userId}`);
  } catch (err) {
    console.error("Lỗi gửi thông báo:", err);
  }
}

httpServer.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

// Truy vấn ban đầu để lấy toàn bộ dữ liệu board với lists, cards, labels, members
async function getBoardById(boardId, userId = null) {
  try {
    // Lấy thông tin board
    const [boardRows] = await pool.query(
      "SELECT board_id AS id, user_id AS userId, title AS name, description, color, visibility FROM boards WHERE board_id = ?",
      [boardId]
    );
    if (boardRows.length === 0) return null;
    const board = boardRows[0];

    //console.log("Checkpoint 1: ", boardId);

    // Lấy members của board
    const [memberRows] = await pool.query(
      `SELECT u.user_id AS id, u.username as name, u.email as email, u.created_at as addedAt, u.avatar_url as avatar_url, u.role as role
      FROM board_members bm JOIN users u ON bm.user_id = u.user_id WHERE bm.board_id = ?`,
      [boardId]
    );
    board.members = memberRows;

    // Lấy events của board
    if (userId) {
      const [eventRows] = await pool.query(
        "SELECT event_id AS event_id, title, start_time, end_time FROM calendar_events WHERE user_id = ?",
        [userId]
      );
      board.events = eventRows;
    } else board.events = [];

    // Lấy lists
    const [listRows] = await pool.query(
      "SELECT list_id AS id, title, position FROM lists WHERE board_id = ? ORDER BY position",
      [boardId]
    );

    board.lists = [];

    for (const list of listRows) {
      const listObj = {
        id: list.id,
        title: list.title,
        cards: [],
      };

      // Lấy cards trong list
      const [cardRows] = await pool.query(
        "SELECT card_id AS id, title, description, due_date AS dueDate, state, position FROM cards WHERE list_id = ? ORDER BY position",
        [list.id]
      );

      for (const card of cardRows) {
        const cardObj = {
          id: card.id,
          title: card.title,
          description: card.description,
          dueDate: convertDateBtoF(card.dueDate),
          state: card.state,
          labels: [],
          members: [],
          position: card.position,
        };

        // Lấy labels của card
        const [labelRows] = await pool.query(
          "SELECT label_id AS id, color, name FROM labels WHERE card_id = ?",
          [card.id]
        );
        cardObj.labels = labelRows;

        // Lấy members của card
        const [cardMemberRows] = await pool.query(
          "SELECT u.user_id AS id, u.username FROM card_members cm JOIN users u ON cm.user_id = u.user_id WHERE cm.card_id = ?",
          [card.id]
        );
        cardObj.members = cardMemberRows;

        listObj.cards.push(cardObj);
      }

      board.lists.push(listObj);
    }

    return board;
  } catch (err) {
    console.error("Lỗi lấy board:", err);
    return null;
  } finally {
    //await connection.end();
  }
}

// Lấy thông tin list kèm cards, labels, members
async function getListsById(listId) {
  try {
    // Lấy thông tin list
    const [listRows] = await pool.query(
      "SELECT list_id AS id, board_id, title, position FROM lists WHERE list_id = ?",
      [listId]
    );
    if (listRows.length === 0) return null;
    const list = listRows[0];

    // Lấy cards trong list
    const [cardRows] = await pool.query(
      "SELECT card_id AS id, title, description, due_date AS dueDate, state, position FROM cards WHERE list_id = ? ORDER BY position",
      [listId]
    );

    list.cards = [];

    for (const card of cardRows) {
      const cardObj = {
        id: card.id,
        title: card.title,
        description: card.description,
        dueDate: convertDateBtoF(card.dueDate),
        state: card.state,
        labels: [],
        members: [],
        position: card.position,
      };

      // Lấy labels của card
      const [labelRows] = await pool.query(
        "SELECT label_id AS id, name, color FROM labels WHERE card_id = ?",
        [card.id]
      );
      cardObj.labels = labelRows;

      // Lấy members của card
      const [memberRows] = await pool.query(
        "SELECT u.user_id AS id, u.username FROM card_members cm JOIN users u ON cm.user_id = u.user_id WHERE cm.card_id = ?",
        [card.id]
      );
      cardObj.members = memberRows;

      list.cards.push(cardObj);
    }

    return list;
  } catch (err) {
    console.error("Lỗi lấy list:", err);
    return null;
  } finally {
    //await pool.end();
  }
}

// Lấy thông tin card kèm labels, members, comments, attachments
async function getCardById(cardId) {
  try {
    // Lấy thông tin card
    const [cardRows] = await pool.query(
      `SELECT card_id AS id, list_id, title, description, position, 
              due_date AS dueDate, state, created_at, updated_at
       FROM cards WHERE card_id = ?`,
      [cardId]
    );
    if (cardRows.length === 0) return null;
    const card = cardRows[0];
    card.dueDate = convertDateBtoF(card.dueDate);

    // Lấy labels
    const [labelRows] = await pool.query(
      "SELECT label_id AS id, name, color FROM labels WHERE card_id = ?",
      [cardId]
    );
    card.labels = labelRows;

    // Lấy members
    const [memberRows] = await pool.query(
      `SELECT u.user_id AS id, u.username, u.email
       FROM card_members cm 
       JOIN users u ON cm.user_id = u.user_id
       WHERE cm.card_id = ?`,
      [cardId]
    );
    card.members = memberRows;

    // Lấy comments
    const [commentRows] = await pool.query(
      `SELECT c.comment_id AS id, c.comment, c.created_at, c.updated_at,
              u.user_id, u.username
       FROM card_comments c 
       JOIN users u ON c.user_id = u.user_id
       WHERE c.card_id = ? ORDER BY c.created_at ASC`,
      [cardId]
    );
    card.comments = commentRows;

    // Lấy attachments
    const [attachmentRows] = await pool.query(
      `SELECT attachment_id AS id, file_url, file_type, user_id
       FROM card_attachments WHERE card_id = ?`,
      [cardId]
    );
    card.attachments = attachmentRows;

    return card;
  } catch (err) {
    console.error("Lỗi lấy card:", err);
    return null;
  } finally {
    //await connection.end();
  }
}

import dayjs from "dayjs";
import { log } from "console";
import { constants } from "buffer";
// MySQL -> React
const convertDateBtoF = (date) => {
  //console.log("B - F", date);
  return date ? dayjs(date).format("MM-DD-YYYY") : "";
};

// React -> MySQL
const convertDateFtoB = (date) => {
  //console.log("F - B",date);
  return date ? dayjs(date).format("YYYY-MM-DD") : null;
};

const shortenDateB = (date) => {
  return date ? dayjs(date).format("YYYY-MM-DD") : null;
}

// --- ROUTE (API ENDPOINTS) ---

app.get("/", async (req, res) => {
  try {
    // Lấy tất cả users
    const [users] = await pool.query("SELECT * FROM users");

    // Lấy tất cả boards
    const boards = [];
    const [boardIds] = await pool.query("SELECT board_id FROM boards");
    for (const boardId of boardIds) {
      const boardData = await getBoardById(boardId);
      //console.log("Lấy board cho user:", boardId.board_id, boardData);
      if (boardData) boards.push(boardData);
    }
    //console.log("Boards lấy từ DB:", boards);

    res.send(`
      <h1>Backend Quản lý Công việc (MySQL Version)</h1>
      <p>Server đang chạy với Database.</p>
      <p><b>Database (Users):</b></p>
      <pre>${JSON.stringify(users, null, 2)}</pre>
      <p><b>Database (Boards):</b></p>
      <pre>${JSON.stringify(boards, null, 2)}</pre>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi khi lấy dữ liệu từ database");
  }
});

// --- AUTHENTICATION ---

// Register
app.post("/register", async (req, res) => {
  const { name, email, password, avatar_url } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp đủ name, email, và password." });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Email không hợp lệ." });
  }

  // Password strength check
  const passwordOptions = {
    minLength: 8,
    minNumbers: 1,
    minUppercase: 1,
    minSymbols: 1,
    minLowercase: 0,
  };
  if (!validator.isStrongPassword(password, passwordOptions)) {
    return res.status(400).json({
      message: "Mật khẩu yếu (Cần 8 ký tự, 1 số, 1 hoa, 1 ký tự đặc biệt).",
    });
  }

  try {
    // Kiểm tra email tồn tại
    const [existingUsers] = await pool.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Email đã được đăng ký." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const finalAvatar =
      avatar_url ||
      `https://placehold.co/400x400/EEE/31343C?text=${name.charAt(0)}`;

    // Insert vào DB
    const [result] = await pool.query(
      "INSERT INTO users (username, email, password_hash, avatar_url, role) VALUES (?, ?, ?, ?, ?)",
      [name, email, passwordHash, finalAvatar, "member"]
    );

    res.status(201).json({
      message: "Đăng ký thành công!",
      user: {
        id: result.insertId,
        name: name,
        email: email,
        role: "member",
        avatar_url: finalAvatar,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng nhập email và password." });
  }

  try {
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    const user = users[0];

    if (!user) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng." });
    }

    const payload = {
      id: user.user_id,
      email: user.email,
      name: user.username,
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
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// --- MIDDLEWARES ---

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Không tìm thấy token." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedPayload;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn." });
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

async function checkBoardMembership(userId, boardId) {
  const [rows] = await pool.query(
    "SELECT board_id FROM board_members WHERE board_id = ? AND user_id = ?",
    [boardId, userId]
  );
  return rows.length > 0;
}

// --- BOARDS API ---

// Get All Boards
// Kèm Lists, Cards, Labels (Giống Get Single Board)
app.get("/api/boards", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy tất cả board mà user có quyền truy cập
    const [boards] = await pool.query(
      `
            SELECT board_id as boardId FROM board_members WHERE user_id = ?
        `,
      [userId]
    );
    const boardIds = boards.map((b) => b.boardId);
    const boardsWithLists = [];
    const inboxId = `inbox_${userId}`;
    for (const boardId of boardIds) {
      if (boardId === inboxId) continue;
      const boardData = await getBoardById(boardId);
      if (boardData) {
        boardsWithLists.push(boardData);
      }
    }

    res.status(200).json(boardsWithLists);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách board" });
  }
});

// Get Single Board (Kèm Lists và Cards)
app.get("/api/boards/:boardID", authMiddleware, async (req, res) => {
  const { boardID } = req.params;
  const userId = req.user.id;

  // Kiểm tra quyền sở hữu trong board_members
  if (!(await checkBoardMembership(userId, boardID))) {
    return res
      .status(403)
      .json({ message: "Board không tồn tại hoặc không có quyền." });
  }

  try {
    const boardData = await getBoardById(boardID);
    res.status(200).json(boardData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết board" });
  }
});

// Add, edit, delete boards in database
// Create Board
app.post("/api/boards", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { name, description, color, visibility } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  if (!name) return res.status(400).json({ message: "Tên board là bắt buộc" });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const boardId = `board_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 7)}`;

    // Tạo board mới trong DB
    const [result] = await connection.query(
      "INSERT INTO boards (board_id, user_id, title, description, color, visibility) VALUES (?, ?, ?, ?, ?, ?)",
      [
        boardId,
        userId,
        name,
        description || "",
        color || "#667eea",
        visibility || "Workspace",
      ]
    );

    const newBoard = {
      id: boardId,
      userId: Number(userId),
      name: name,
      description: description || "",
      color: color || "#667eea",
      visibility: visibility || "Workspace",
      lists: [],
    };

    // Thêm vào bảng board_members
    await connection.query(
      "INSERT INTO board_members (board_id, user_id) VALUES (?, ?)",
      [boardId, userId]
    );

    res.status(201).json(newBoard);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Lỗi tạo board", error: err.message });
  } finally {
    connection.release();
  }
});

// Update Board
app.put("/api/boards/:id", authMiddleware, async (req, res) => {
  const boardId = req.params.id;
  const userId = req.user.id;
  const { name, description, color, visibility } = req.body;

  // Kiểm tra quyền sở hữu trong board_members
  if (!(await checkBoardMembership(userId, boardId))) {
    return res
      .status(403)
      .json({ message: "Board không tồn tại hoặc bạn không có quyền." });
  }

  const currentBoard = await getBoardById(boardId);
  const ownerId = currentBoard.userId;
  if (userId != ownerId && currentBoard.visibility == "Private") {
    return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa." });
  }

  // Preserve existing values if not provided or null
  const newName = name !== undefined && name !== null ? name : currentBoard.title;
  const newDescription = description !== undefined && description !== null ? description : currentBoard.description;
  const newColor = color !== undefined && color !== null ? color : currentBoard.color;
  const newVisibility = visibility !== undefined ? visibility : currentBoard.visibility;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (visibility == "Private") {
      await connection.query(
        `DELETE FROM board_members WHERE board_id = ? AND user_id != ?`,
        [boardId, ownerId]
      );
    }

    // Cập nhật thông tin board
    await connection.query(
      "UPDATE boards SET title = ?, description = ?, color = ?, visibility = ? WHERE board_id = ?",
      [newName, newDescription, newColor, newVisibility, boardId]
    );

    await connection.commit();

    const targetBoard = await getBoardById(boardId);
    // SOCKET REAL-TIME
    io.emit("board_updated", targetBoard);
    // Trả về data đã update
    res.json(targetBoard);
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Lỗi cập nhật board" });
  } finally {
    connection.release();
  }
});

// Delete Board
app.delete("/api/boards/:id", authMiddleware, async (req, res) => {
  const boardId = req.params.id;
  const userId = req.user.id;
  const currentBoard = await getBoardById(boardId);
  const ownerIdOfBoard = currentBoard.userId;

  // CHECK QUYỀN: CHỈ OWNER ĐƯỢC XÓA
  if (String(userId) !== String(ownerIdOfBoard)) {
    return res.status(403).json({
      message:
        "Bạn chỉ là thành viên. Chỉ chủ sở hữu (Owner) mới được xóa Board.",
    });
  }

  try {
    //Xóa board nếu user là chủ sở hữu
    const [result] = await pool.query(
      "DELETE FROM boards WHERE board_id = ? AND user_id = ?",
      [boardId, userId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Board không tồn tại hoặc không có quyền." });
    }

    // Xóa các liên kết trong bảng board_members
    await pool.query("DELETE FROM board_members WHERE board_id = ?", [boardId]);

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa board" });
  }
});

// --- LISTS API ---

// Create List
app.post("/api/boards/:boardId/lists", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { boardId } = req.params;
  const { title } = req.body;

  if (!title) return res.status(400).json({ message: "Tiêu đề list trống." });

  // Kiểm tra quyền sở hữu trong board_members
  if (!(await checkBoardMembership(userId, boardId))) {
    return res
      .status(403)
      .json({ message: "Board không tồn tại hoặc không có quyền." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Lấy vị trí lớn nhất hiện tại để gán cho list mới nằm cuối
    const [rows] = await connection.query(
      "SELECT MAX(position) as maxPos FROM lists WHERE board_id = ?",
      [boardId]
    );
    const newPos = (rows[0].maxPos || 0) + 1000; // Tăng khoảng cách để dễ chèn

    const newList = {
      id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      boardId,
      title,
      position: newPos,
      cards: [],
    };

    const [result] = await connection.query(
      "INSERT INTO lists (list_id, board_id, title, position) VALUES (?, ?, ?, ?)",
      [newList.id, boardId, title, newPos]
    );

    res.status(201).json(newList);
    await connection.commit();
    //Socket.io
    const io = req.app.get("socketio");
    io.to(boardId.toString()).emit("board_updated", await getBoardById(boardId));
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Lỗi tạo list" });
  } finally {
    connection.release();
  }
});

// Update List
app.put(
  "/api/boards/:boardId/lists/:listId",
  authMiddleware,
  async (req, res) => {
    const userId = req.user.id;
    const { boardId, listId } = req.params;
    const { title } = req.body;

    // Kiểm tra quyền sở hữu trong board_members
    if (!(await checkBoardMembership(userId, boardId))) {
      return res
        .status(403)
        .json({ message: "Board không tồn tại hoặc không có quyền." });
    }

    // Kiểm tra tồn tại list
    const [listRows] = await pool.query(
      "SELECT list_id FROM lists WHERE list_id = ? AND board_id = ?",
      [listId, boardId]
    );
    if (listRows.length === 0) {
      return res
        .status(404)
        .json({ message: "List không tồn tại hoặc không có quyền." });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      // Cập nhật thông tin list
      await connection.query("UPDATE lists SET title = ? WHERE list_id = ?", [
        title,
        listId,
      ]);
      await connection.commit();

      const updatedList = await getListsById(listId);
      res.status(200).json(updatedList);

      //Socket.io
      const io = req.app.get("socketio");
      io.to(boardId.toString()).emit("board_updated", await getBoardById(boardId));
    } catch (err) {
      await connection.rollback();
      console.error(err);
      res.status(500).json({ message: "Lỗi cập nhật list" });
    } finally {
      connection.release();
    }
  }
);

// Delete List
app.delete(
  "/api/boards/:boardId/lists/:listId",
  authMiddleware,
  async (req, res) => {
    const userId = req.user.id;
    const { boardId } = req.params;
    const { listId } = req.params;

    // Kiểm tra quyền sở hữu trong board_members
    if (!(await checkBoardMembership(userId, boardId))) {
      return res
        .status(403)
        .json({ message: "Board không tồn tại hoặc không có quyền." });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query("DELETE FROM lists WHERE list_id = ?", [listId]);
      res.status(200).json({ message: "Đã xóa list" });
      await connection.commit();
      //Socket.io
      const io = req.app.get("socketio");
      io.to(boardId.toString()).emit("LIST_DELETED", { listId });
    } catch (err) {
      await connection.rollback();
      console.error(err);
      res.status(500).json({ message: "Lỗi xóa list" });
    } finally {
      connection.release();
    }
  }
);

// Drop List (Kéo thả List)
app.put("/api/boards/lists/move", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { sourceBoardId, destBoardId, listId, index } = req.body;
  const io = req.app.get("socketio");

  if (!sourceBoardId || !destBoardId || !listId) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết." });
  }

  // Kiểm tra quyền sở hữu trong board_members
  if (
    !(await checkBoardMembership(userId, sourceBoardId)) ||
    !(await checkBoardMembership(userId, destBoardId))
  ) {
    return res
      .status(403)
      .json({ message: "Board không tồn tại hoặc không có quyền." });
  }

  // Kiểm tra tồn tại list trong source board
  const [listRows] = await pool.query(
    "SELECT list_id FROM lists WHERE list_id = ? AND board_id = ?",
    [listId, sourceBoardId]
  );
  if (listRows.length === 0) {
    return res
      .status(404)
      .json({ message: "List không tồn tại trong Board nguồn." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [sourceBoards] = await connection.query(
      "SELECT * FROM lists WHERE board_id = ?",
      [sourceBoardId]
    );
    const [destBoards] = await connection.query(
      "SELECT * FROM lists WHERE board_id = ?",
      [destBoardId]
    );
    if (sourceBoards.length === 0 || destBoards.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy Board nguồn hoặc đích." });
    }

    // Board nguồn và đích
    const sourceBoard = await getBoardById(sourceBoardId);
    const destBoard = (String(destBoardId) === String(sourceBoardId) ? sourceBoard : await getBoardById(destBoardId));

    const listIndex = sourceBoard.lists.findIndex((l) => l.id == listId);
    if (listIndex === -1) {
      return res
        .status(404)
        .json({ message: "List không tồn tại trong Board nguồn." });
    }

    //Di chuyển List giữa 2 Board
    const [movedList] = sourceBoard.lists.splice(listIndex, 1);
    if (
      typeof index === "number" &&
      index >= 0 &&
      index <= destBoard.lists.length
    ) {
      destBoard.lists.splice(index, 0, movedList);
    } else {
      destBoard.lists.push(movedList);
    }

    // Đánh số lại position cho các board trong destBoard trong database
    destBoard.lists.forEach(async (list, orderIndex) => {
      await connection.query(
        "UPDATE lists SET position = ?, board_id = ? WHERE list_id = ?",
        [orderIndex, destBoardId, list.id]
      );
    });

    if (String(sourceBoardId) !== String(destBoardId)) {
      // Đánh số lại position cho các board trong sourceBoard trong database
      sourceBoard.lists.forEach(async (list, orderIndex) => {
        await connection.query(
          "UPDATE lists SET position = ?, board_id = ? WHERE list_id = ?",
          [orderIndex, sourceBoardId, list.id]
        );
      });
    }

    await connection.commit();
    res.status(200).json({ message: "Di chuyển list thành công" });
    //Socket.io
    if (io) {
      const payload = {
        movedList,
        sourceBoardId,
        destBoardId,
        index,
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
  } catch (err) {
    console.error(err);
    await connection.rollback();
    res.status(500).json({ message: "Lỗi di chuyển list" });
  } finally {
    connection.release();
  }
});

// --- CARDS API ---

// Move Card (Kéo thả Card)
app.put("/api/cards/move", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const {
    sourceBoardId,
    sourceListId,
    destBoardId,
    destListId,
    cardId,
    index,
  } = req.body;

  if (
    !sourceBoardId ||
    !sourceListId ||
    !destBoardId ||
    !destListId ||
    !cardId
  ) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết." });
  }

  // Kiểm tra quyền sở hữu trong board_members
  if (
    !(await checkBoardMembership(userId, sourceBoardId)) ||
    !(await checkBoardMembership(userId, destBoardId))
  ) {
    return res
      .status(403)
      .json({ message: "Board không tồn tại hoặc không có quyền." });
  }

  // Kiểm tra tồn tại card trong source list
  const [cardRows] = await pool.query(
    "SELECT card_id FROM cards WHERE card_id = ? AND list_id = ?",
    [cardId, sourceListId]
  );
  if (cardRows.length === 0) {
    return res
      .status(404)
      .json({ message: "Card không tồn tại trong List nguồn." });
  }

  const connection = await pool.getConnection();
  try {
    // Trong thực tế, cần tính lại position dựa trên index.

    await connection.beginTransaction();
    const [sourceBoards] = await connection.query(
      "SELECT * FROM lists WHERE board_id = ?",
      [sourceBoardId]
    );
    const [destBoards] = await connection.query(
      "SELECT * FROM lists WHERE board_id = ?",
      [destBoardId]
    );
    if (sourceBoards.length === 0 || destBoards.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy Board nguồn hoặc đích." });
    }

    const [sourceLists] = await connection.query(
      "SELECT * FROM lists WHERE list_id = ?",
      [sourceListId]
    );
    const [destLists] = await connection.query(
      "SELECT * FROM lists WHERE list_id = ?",
      [destListId]
    );

    if (sourceLists.length === 0 || destLists.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy List nguồn hoặc đích." });
    }
    // List nguồn và đích
    const sourceList = await getListsById(sourceListId);
    const destList = await getListsById(destListId);

    const cardIndex = sourceList.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return res
        .status(404)
        .json({ message: "Card không tồn tại trong List nguồn." });
    }

    //Di chuyển card giữa 2 list
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

    // Đánh số lại position cho các card trong destList trong database
    destList.cards.forEach( async (card, orderIndex) => {
      await connection.query(
        "UPDATE cards SET position = ?, list_id = ? WHERE card_id = ?",
        [orderIndex, destListId, card.id]
      );
    });

    // Đánh số lại position cho các card trong sourceList trong database
    sourceList.cards.forEach(async (card, orderIndex) => {
      await connection.query(
        "UPDATE cards SET position = ?, list_id = ? WHERE card_id = ?",
        [orderIndex, sourceListId, card.id]
      );
    });

    await connection.commit();
    res.status(200).json({ message: "Di chuyển card thành công" });
    console.log(
      `Đã chuyển Card "${movedCard.title}" từ List "${sourceList.title}" sang List "${destList.title}" tại vị trí "${index}"`
    );

    //Socket.io
    const payload = {
      movedCard,
      sourceListId,
      destListId,
      sourceBoardId,
      destBoardId,
      index,
    };
    const io = req.app.get("socketio");
    await io.to(String(sourceBoardId)).emit("CARD_MOVED", payload);
    await io.to(String(sourceBoardId)).emit(
      "board_updated",
      await getBoardById(sourceBoardId)
    );
    if (String(destBoardId) !== String(sourceBoardId)) {
      io.to(String(destBoardId)).emit("CARD_MOVED", payload);
      io.to(String(destBoardId)).emit(
        "board_updated",
        await getBoardById(destBoardId)
      );
    }
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Lỗi di chuyển card" });
  } finally {
    connection.release();
  }
});

// Create Card
app.post(
  "/api/boards/:boardId/lists/:listId/cards",
  authMiddleware,
  async (req, res) => {
    const userId = req.user.id;
    const { boardId, listId } = req.params;
    const { title, description, labels, dueDate, members } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Tiêu đề card là bắt buộc" });
    }

    if (!(await checkBoardMembership(userId, boardId))) {
      return res
        .status(403)
        .json({ message: "Board không tồn tại hoặc không có quyền." });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Tính toán vị trí (position) để card nằm cuối list
      const [rows] = await connection.query(
        "SELECT MAX(position) as maxPos FROM cards WHERE list_id = ?",
        [listId]
      );
      const newPosition = (rows[0].maxPos || 0) + 1024;

      // Tạo object card mới
      const newCard = {
        card_id: `card_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        list_id: listId,
        title: title,
        description: description || "",
        position: newPosition,
        state: "Inprogress",
        labels: labels || [],
        due_date: dueDate || null,
        members: members || [],
      };

      // Insert vào bảng cards
      await connection.query(
        "INSERT INTO cards (card_id, list_id, title, description, position, due_date) VALUES (?, ?, ?, ?, ?, ?)",
        [
          newCard.card_id,
          newCard.list_id,
          newCard.title,
          newCard.description,
          newCard.position,
          newCard.due_date,
        ]
      );

      res.status(201).json(newCard);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      console.error(err);
      res
        .status(500)
        .json({ message: "Lỗi server khi tạo card", error: err.message });
    } finally {
      connection.release();
    }
  }
);

// Card activity
const sendActivity = async ({ actorId, cardId, boardId, message, type }) =>  {
  const [actor] = await pool.query(`SELECT * FROM users WHERE user_id = ?`, [actorId]);
  const activity = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    message,
    createdAt: new Date(),
    sender: {
      id: actorId.toString(),
      name: actor[0].username,
      avatar: actor[0].avatar_url,
    },
    target: {
      boardId: boardId.toString(),
      cardId: cardId.toString(),
    },
  };
  try {
    await pool.query(
      `INSERT INTO card_activities (activity_id, actor_id, card_id, board_id, message, type) VALUE (?, ?, ?, ?, ?, ?)`,
      [activity.id, actorId, cardId, boardId, message, type]
    );

    // emit realtime cho tất cả user đang mở board
    io.to(boardId.toString()).emit("activity_created", activity);
  } catch (e) {
    console.log(e);
  }
};

app.get("/api/cards/:cardId/activities", authMiddleware, async (req, res) => {
  const { cardId } = req.params;
  //console.log("activities change");
  
  const [users] = await pool.query(`SELECT * FROM users`);
  //Check activity trong database
  const [rawActivities] = await pool.query(
    `SELECT * FROM card_activities WHERE card_id = ?`,
    [cardId]
  );
  const activities = rawActivities.map((activity) => {
    const actor = users.find((user) => user.user_id == activity.actor_id);
    return {
      id: activity.activity_id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.created_at,
      sender: {
        id: activity.actor_id,
        name: actor.username || "",
        avatar: actor.avatar_url || "",
      },
      target: {
        boardId: activity.board_id,
        cardId: activity.card_id,
      },
    };
  });
  //console.log(cardId, activities);
  res.json(activities);
});

// Update Card
app.put(
  "/api/boards/:boardId/lists/:listId/cards/:cardId",
  authMiddleware,
  async (req, res) => {
    const userId = req.user.id;
    const { boardId, listId, cardId } = req.params;
    const { title, description, labels, dueDate, state, members } = req.body;

    // Kiểm tra quyền sở hữu trong board_members
    if (!(await checkBoardMembership(userId, boardId))) {
      return res
        .status(403)
        .json({ message: "Board không tồn tại hoặc không có quyền." });
    }

    // Kiểm tra tồn tại card
    const check = await pool.query(
      "SELECT card_id FROM cards WHERE card_id = ? AND list_id = ?",
      [cardId, listId]
    );
    if (check[0].length === 0) {
      return res.status(404).json({ message: "Card không tồn tại." });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Cập nhật bảng card_members
      if (Array.isArray(members)) {
        // Lấy danh sách thành viên cũ
        const [oldMemberRows] = await connection.query(
          "SELECT user_id FROM card_members WHERE card_id = ?",
          [cardId]
        );
        const oldMemberIds = oldMemberRows.map((r) => r.user_id);

        // Xóa toàn bộ thành viên cũ
        await connection.query("DELETE FROM card_members WHERE card_id = ?", [
          cardId,
        ]);

        // Thêm lại danh sách thành viên mới (nếu có)
        if (members.length > 0) {
          const memberValues = members.map((uid) => [cardId, uid]);
          await connection.query(
            "INSERT INTO card_members (card_id, user_id) VALUES ?",
            [memberValues]
          );
        }

        // Tìm những thành viên vừa được thêm mới
        const addedMembers = members.filter(
          (uid) => !oldMemberIds.includes(uid)
        );

        // Lấy tên Card để hiển thị trong thông báo
        const [cardInfo] = await connection.query(
          "SELECT title FROM cards WHERE card_id = ?",
          [cardId]
        );
        const cardTitle = cardInfo[0]?.title || "Unknown Card";

        // Gửi thông báo cho thành viên mới
        for (const newUserId of addedMembers) {
          if (newUserId !== userId) {
            // ACTIVITY – gửi cho toàn board
            sendActivity({
              actorId: userId,
              cardId: cardId,
              boardId: boardId,
              type: "assigned",
              message: `added ${newUserId || "a member"} to this card`,
            });

            // dùng userId thay vì actorId
            sendNotification({
              userId: newUserId,
              actorId: userId,
              cardId: cardId,
              type: "assigned_card",
              message: `Bạn đã được thêm vào thẻ: "${cardTitle}"`,
            });
          }
        }
      }

      // Xóa label cũ liên kết với card
      await connection.query("DELETE FROM labels WHERE card_id = ?", cardId);
      // Thêm label mới liên kết với card
      labels.forEach(async (label) => {
        await connection.query(
          "INSERT INTO labels (card_id, name, color) VALUES (?, ?, ?)",
          [cardId, label.name, label.color]
        );
      });

      // Lấy card cũ để so sánh
      const [oldCards] = await connection.query(
        "SELECT title, description, due_date, state FROM cards WHERE card_id = ?",
        cardId
      );
      const oldCard = oldCards[0];

      // Cập nhật thông tin card
      const newTitle = title !== undefined ? title : oldCard.title;
      if (title != undefined && title != oldCard.title) {
        sendActivity({
          actorId: userId,
          cardId: cardId,
          boardId: boardId,
          type: "update",
          message: `đã đổi tên thẻ từ "${oldCard.title}" thành "${title}"`,
        });
      }
      const newDescription =
        description !== undefined ? description : oldCard.description;
      if (description !== undefined && description !== oldCard.description) {
        sendActivity({
          actorId: userId,
          cardId: cardId,
          boardId: boardId,
          type: "update",
          message: `đã cập nhật mô tả thẻ`,
        });
      }
      const newDueDate =
        dueDate !== undefined ? dueDate : oldCard.due_date;
      if (
        dueDate !== undefined &&
        dueDate !== shortenDateB(oldCard.due_date)
      ) {
        sendActivity({
          actorId: userId,
          cardId: cardId,
          boardId: boardId,
          type: "due",
          message:
            dueDate !== undefined
              ? `đã đặt hạn chót ${dueDate}`
              : `đã xoá hạn chót`,
        });
      }
      const newState = state !== undefined ? state : oldCard.state;
      // Cập nhật bảng cards
      await connection.query(
        "UPDATE cards SET title = ?, description = ?, due_date = ?, state = ? WHERE card_id = ?",
        [newTitle, newDescription, newDueDate, newState, cardId]
      );
      await connection.commit();

      const updatedCard = await getCardById(cardId);
      res.json(updatedCard);

      // Socket 
      io.to(boardId.toString()).emit("board_updated", await getBoardById(boardId));

      io.to(boardId.toString()).emit("CARD_UPDATED", {
        listId,
        card: updatedCard
      });

      //console.log("card edit", listId, updatedCard);

    } catch (err) {
      await connection.rollback();
      console.error(err);
      res
        .status(500)
        .json({ message: "Lỗi cập nhật card", error: err.message });
    } finally {
      connection.release();
    }
  }
);

// Delete Card
app.delete(
  "/api/boards/:boardId/lists/:listId/cards/:cardId",
  authMiddleware,
  async (req, res) => {
    const userId = req.user.id;
    const { boardId, listId, cardId } = req.params;

    // Kiểm tra quyền sở hữu trong board_members
    if (!(await checkBoardMembership(userId, boardId))) {
      return res
        .status(403)
        .json({ message: "Board không tồn tại hoặc không có quyền." });
    }

    // Kiểm tra tồn tại card
    const check = await pool.query(
      "SELECT card_id FROM cards WHERE card_id = ? AND list_id = ?",
      [cardId, listId]
    );
    if (check[0].length === 0) {
      return res.status(404).json({ message: "Card không tồn tại." });
    }

    try {
      const [result] = await pool.query("DELETE FROM cards WHERE card_id = ?", [
        cardId,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Card không tồn tại để xóa" });
      }

      console.log(`Đã xóa card với ID: ${cardId}`);
      res.status(204).send(); // 204 No Content
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi xóa card", error: err.message });
    }
  }
);
//

// API get notifications
app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // Lấy thông báo và thông tin người gửi (actor)
    const [rows] = await pool.query(
      `
            SELECT 
                n.notification_id as id,
                n.type,
                n.message,
                n.is_read as isRead,
                n.created_at as createdAt,
                n.card_id as cardId,
                n.board_id as boardId,
                u.username as actorName,
                u.avatar_url as actorAvatar
            FROM notifications n
            JOIN users u ON n.actor_id = u.user_id
            WHERE n.user_id = ? 
            ORDER BY n.created_at DESC
        `,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thông báo" });
  }
});

// Mark Notification as Read
app.put("/api/notifications/:id/read", authMiddleware, async (req, res) => {
  try {
    const notiId = req.params.id;
    const userId = req.user.id;
    await pool.query(
      "UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?",
      [notiId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Lỗi cập nhật thông báo" });
  }
});
// Thêm
// API LẤY DANH SÁCH USER (ADMIN)
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        user_id AS id,
        username AS name,
        email,
        avatar_url AS avatar,
        role
      FROM users
    `);

    res.json(rows);
  } catch (err) {
    console.error("Lỗi /api/users:", err);
    res.status(500).json({ message: "Lỗi tải danh sách user" });
  }
});

//  API LẤY THÔNG TIN 1 USER THEO ID

app.get("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT user_id AS id, username AS name, email, avatar_url AS avatar, role FROM users WHERE user_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Lỗi /api/users/:id", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

//  API XÓA USER

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query("DELETE FROM users WHERE user_id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    res.json({ message: "Xóa thành công" });
  } catch (err) {
    console.error("Lỗi DELETE /api/users/:id:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// CALENDAR API ENDPOINTS

// Lấy danh sách sự kiện của một user
app.get("/api/events", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  // Lọc sự kiện thuộc về user_id từ "bảng" calendarEvents
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [events] = await connection.query(
      "SELECT * FROM calendar_events WHERE user_id = ?",
      [userId]
    );
    const formattedEvents = events.map(event => {
      return {
        ...event, // Copy existing properties
        // Check if time exists, then format: '2025-12-19T02:00:00.000Z'
        start_time: event.start_time ? new Date(event.start_time + 'Z').toISOString() : null,
        end_time: event.end_time ? new Date(event.end_time + 'Z').toISOString() : null
      };
    });
    res.status(201).json(formattedEvents);
    //console.log(formattedEvents);
    connection.commit;

    // Socket.io
    io.emit("SERVER_EVENT_CREATED", events);
  } catch (e) {
    await connection.rollback();
    console.log(e);
    res.status(500).json({ message: "Lỗi server" });
  } finally {
    connection.release();
  }
});

// Tạo sự kiện mới 
app.post("/api/events", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { title, start_time, end_time } = req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json({ message: "Thiếu dữ liệu lịch" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      "INSERT INTO calendar_events (user_id, title, start_time, end_time) VALUES (?, ?, ?, ?)",
      [userId, title, start_time.slice(0, 19).replace('T', ' '), end_time.slice(0, 19).replace('T', ' ')]
    );

    await connection.commit();
    res.status(201).json({
      event_id: result.insertId,
      user_id: userId,
      title,
      start_time,
      end_time,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Lỗi POST /api/events:", err);
    res.status(500).json({ message: "Lỗi tạo lịch" });
  } finally {
    connection.release();
  }
});

// Cập nhật sự kiện (Kéo thả lịch, đổi tên, v.v.)
app.put("/api/events/:eventId", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const eventId = req.params.eventId;
  const { title, start_time, end_time } = req.body;

  console.log(eventId);

  // Tìm event trong "bảng" calendarEvents
  const [eventIndex] = await pool.query(
    `SELECT * FROM calendar_events WHERE event_id = ?`,
    [eventId]
  );
  if (eventIndex.length === 0) {
    return res.status(404).json({ message: "Sự kiện không tồn tại." });
  }

  const event = eventIndex[0];

  if (event.user_id != userId) {
    return res.status(403).json({ message: "Không có thẩm quyền." });
  }

  // Cập nhật
  const updatedEvent = {
    ...event,
    title: title || event.title,
    start_time: start_time || event.start_time,
    end_time: end_time || event.end_time
  };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      "UPDATE calendar_events SET title = ?, start_time = ?, end_time = ? WHERE event_id = ?",
      [
        updatedEvent.title,
        updatedEvent.start_time.slice(0, 19).replace('T', ' '),
        updatedEvent.end_time.slice(0, 19).replace('T', ' '),
        eventId
      ]
    );
    await connection.commit();
    //Socket.io
    io.emit("SERVER_EVENT_UPDATED", updatedEvent);

    console.log("Event Updated:", updatedEvent);
    res.status(200).json(updatedEvent);
  } catch (e) {
    console.log(e);
    await connection.rollback();
    res.status(500).json({ message: "Lỗi server" });
  } finally {
    connection.release();
  }
});

// Delete events
app.delete("/api/events/:eventId", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const eventId = req.params.eventId;

  // Tìm event trong "bảng" calendarEvents
  const [eventIndex] =await pool.query(
    "SELECT * FROM calendar_events WHERE event_id = ?",
    [eventId]
  );
  if (eventIndex.length === 0) {
    return res.status(404).json({ message: "Sự kiện không tồn tại." });
  }

  const event = eventIndex[0];

  // Xóa
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM calendar_events WHERE event_id = ?`, [
      eventId,
    ]);
    await connection.commit();
    //Socket.io
    io.emit("SERVER_EVENT_DELETED", { event_id: eventId });

    console.log(`Event ID ${eventId} đã bị xóa.`);
    res.status(200).json({ message: "Đã xóa sự kiện thành công." });
  } catch (e) {
    console.log(e);
    await connection.rollback();
    res.status(500).json({ message: "Lỗi server" });
  } finally {
    connection.release();
  }
});

// Add Member
app.post("/api/boards/add-member", authMiddleware, async (req, res) => {
  const currentUserId = req.user.id;
  const currentUserEmail = req.user.email;

  const { boardId, memberEmail, role } = req.body;

  if (!boardId || !memberEmail) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp Board ID và Email thành viên." });
  }

  const [members] = await pool.query(`SELECT * FROM users WHERE email = ?`, [
    memberEmail,
  ]);
  if (members.length === 0) {
    return res.status(400).json({ message: "Thành viên không tồn tại." });
  }
  const member = members[0];

  // Kiểm tra quyền sở hữu trong board_members
  if (!(await checkBoardMembership(currentUserId, boardId))) {
    return res
      .status(403)
      .json({ message: "Board không tồn tại hoặc không có quyền." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Tìm người dùng muốn thêm (Member) trong database users
    const [memberToAdds] = await connection.query(
      `SELECT * FROM users WHERE email = ?`,
      [memberEmail]
    );

    if (memberToAdds.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy người dùng với email này." });
    }
    const memberToAdd = memberToAdds[0];

    // Không cho phép tự thêm chính mình
    if (memberToAdd.user_id === currentUserId) {
      return res
        .status(400)
        .json({ message: "Bạn không thể tự thêm chính mình vào board." });
    }

    // KIểm tra xem thành viên này có trong board chưa
    const [checkMember] = await connection.query(
      `
      SELECT * FROM board_members WHERE board_id = ? AND user_id = ?`,
      [boardId, memberToAdd.user_id]
    );
    if (checkMember.length > 0) {
      return res
        .status(400)
        .json({
          message: `Thành viên ${memberToAdd.email} này đã có trong nhóm.`,
        });
    }

    await connection.query(
      `INSERT INTO board_members (board_id, user_id) VALUES (?, ?)`,
      [boardId, memberToAdd.user_id]
    );

    const targetBoard = await getBoardById(boardId);

    // Tạo thông báo (Notification)
    const notiContent = {
      id: `noti_${Date.now()}`,
      type: "invite",
      message: `${req.user.name} đã thêm bạn vào bảng "${targetBoard.name}"`,
      sender: { name: req.user.name, avatar: req.user.avatar_url },
      boardId: boardId,
      createdAt: new Date(),
      isRead: false,
    };

    sendNotification({
      userId: memberToAdd.user_id,
      actorId: currentUserId,
      cardId: null,
      boardId: boardId,
      type: "invite",
      message: `${req.user.name} đã thêm bạn vào bảng "${targetBoard.name}"`,
    });

    // Socket.io
    // Gửi Socket Real-time (Để client bên kia tự cập nhật UI)
    io.to(`user_${memberToAdd.user_id}`).emit(
      "notification_received",
      notiContent
    );

    // Bắn sự kiện "Bạn vừa được thêm vào board" để client tự fetch lại list board
    io.to(`user_${memberToAdd.user_id}`).emit("board_joined", targetBoard);

    io.to(targetBoard.board_id).emit("board_updated", targetBoard);

    await connection.commit();
    res.status(200).json({
      // Trả kết quả theo định dạng nào đó chưa fix được
      message: "Thêm thành viên thành công!",
      member: {
        id: memberToAdd.user_id,
        name: memberToAdd.name,
        email: memberToAdd.email,
        avatar_url: memberToAdd.avatar_url,
        role: role, // Role mặc định
        addedAt: new Date(),
      },
      board: targetBoard,
    });
  } catch (e) {
    await connection.rollback();
    console.log(e);
    res.status(500).json({
      message: "Lỗi server khi thêm thành viên.",
      error: e.message,
    });
  } finally {
    connection.release();
  }
});

// --- HÀM TIỆN ÍCH CHO CHECKLISTS ---

async function getChecklistsByCardId(cardId) {
  const [checklists] = await pool.query(
    "SELECT * FROM checklists WHERE card_id = ?",
    [cardId]
  );
  for (let cl of checklists) {
    const [items] = await pool.query(
      "SELECT * FROM checklist_items WHERE checklist_id = ?",
      [cl.checklist_id]
    );
    cl.items = items;
    // Tính progress
    const total = items.length;
    const completed = items.filter((i) => i.is_completed).length;
    cl.progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  }
  return checklists;
}

async function checkCardMembership(userId, cardId) {
  // Tìm board chứa card
  const [rows] = await pool.query(
    `
        SELECT bm.board_id FROM board_members bm
        JOIN lists l ON bm.board_id = l.board_id
        JOIN cards c ON l.list_id = c.list_id
        WHERE bm.user_id = ? AND c.card_id = ?
    `,
    [userId, cardId]
  );
  return rows.length > 0;
}

async function updateCardStatus(cardId, isDone) {
  const state = isDone ? "Done" : "Inprogress";
  await pool.query(
    "UPDATE cards SET state = ?, updated_at = NOW() WHERE card_id = ?",
    [state, cardId]
  );
}

// CARD STATUS & CHECKLIST API

// Card status
app.put("/api/cards/:cardId/status", authMiddleware, async (req, res) => {
  const userId = Number(req.user.id);
  const { cardId } = req.params;

  // Kiểm tra quyền sở hữu trong board_members
  if (!(await checkCardMembership(userId, cardId))) {
    return res
      .status(403)
      .json({ message: "Không có quyền truy cập card này." });
  }

  // Lấy trạng thái hiện tại của card
  const [cardRows] = await pool.query(
    "SELECT state FROM cards WHERE card_id = ?",
    [cardId]
  );
  if (cardRows.length === 0) {
    return res.status(404).json({ message: "Card không tồn tại." });
  }

  const currentState = cardRows[0].state;
  const isDone = currentState === "Done" ? false : true;

  // Cập nhật trạng thái
  await updateCardStatus(cardId, isDone);

  // Lấy card sau khi cập nhật
  const [updatedCardRows] = await pool.query(
    "SELECT * FROM cards WHERE card_id = ?",
    [cardId]
  );
  const updatedCard = updatedCardRows[0];

  // Socket: Báo cho mọi người biết card này đã đổi trạng thái
  io.emit("CARD_UPDATED", { cardId, card: updatedCard });

  res.status(200).json(updatedCard);
});

// Lấy checklist
app.get("/api/cards/:cardId/checklists", authMiddleware, async (req, res) => {
  const { cardId } = req.params;
  const userId = req.user.id;

  // Kiểm tra quyền truy cập card
  if (!(await checkCardMembership(userId, cardId))) {
    return res
      .status(403)
      .json({ message: "Không có quyền truy cập card này." });
  }

  try {
    const checklists = await getChecklistsByCardId(cardId);
    res.status(200).json(checklists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server." });
  }
});

// Cập nhật checklist
app.post("/api/cards/:cardId/checklists", authMiddleware, async (req, res) => {
  const { cardId } = req.params;
  const { title } = req.body;
  const userId = req.user.id;

  if (!title)
    return res.status(400).json({ message: "Tiêu đề không được để trống" });

  // Kiểm tra quyền truy cập card
  if (!(await checkCardMembership(userId, cardId))) {
    return res
      .status(403)
      .json({ message: "Không có quyền truy cập card này." });
  }

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      "INSERT INTO checklists (card_id, title) VALUES (?, ?)",
      [cardId, title]
    );
    const newChecklist = {
      checklist_id: result.insertId,
      card_id: cardId,
      title,
    };

    // Socket: Báo cập nhật
    io.emit("CHECKLIST_UPDATED", { cardId });

    res.status(201).json(newChecklist);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server." });
  } finally {
    connection.release();
  }
});

// Xóa checklist
app.delete("/api/checklists/:checklistId", authMiddleware, async (req, res) => {
  const checklistId = Number(req.params.checklistId);
  const userId = req.user.id;

  // Tìm checklist để lấy card_id
  const [checklistRows] = await pool.query(
    "SELECT card_id FROM checklists WHERE checklist_id = ?",
    [checklistId]
  );
  if (checklistRows.length === 0)
    return res.status(404).json({ message: "Checklist không tồn tại" });

  const cardId = checklistRows[0].card_id;

  // Kiểm tra quyền truy cập card
  if (!(await checkCardMembership(userId, cardId))) {
    return res
      .status(403)
      .json({ message: "Không có quyền truy cập card này." });
  }

  const connection = await pool.getConnection();
  try {
    // Xóa items trước
    await connection.query(
      "DELETE FROM checklist_items WHERE checklist_id = ?",
      [checklistId]
    );
    // Xóa checklist
    await connection.query("DELETE FROM checklists WHERE checklist_id = ?", [
      checklistId,
    ]);

    io.emit("CHECKLIST_UPDATED", { cardId });

    res.status(200).json({ message: "Đã xóa checklist thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server." });
  } finally {
    connection.release();
  }
});

// Thêm item vào checklist
app.post(
  "/api/checklists/:checklistId/items",
  authMiddleware,
  async (req, res) => {
    const checklistId = Number(req.params.checklistId);
    const { description } = req.body;
    const userId = req.user.id;

    if (!description)
      return res.status(400).json({ message: "Nội dung không được để trống" });

    // Tìm checklist để lấy card_id
    const [checklistRows] = await pool.query(
      "SELECT card_id FROM checklists WHERE checklist_id = ?",
      [checklistId]
    );
    if (checklistRows.length === 0)
      return res.status(404).json({ message: "Checklist không tồn tại." });

    const cardId = checklistRows[0].card_id;

    // Kiểm tra quyền truy cập card
    if (!(await checkCardMembership(userId, cardId))) {
      return res
        .status(403)
        .json({ message: "Không có quyền truy cập card này." });
    }

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        "INSERT INTO checklist_items (checklist_id, description, is_completed) VALUES (?, ?, false)",
        [checklistId, description]
      );
      const newItem = {
        item_id: result.insertId,
        checklist_id: checklistId,
        description,
        is_completed: false,
      };

      // Socket update real-time
      io.emit("CHECKLIST_UPDATED", { cardId });

      res.status(201).json(newItem);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server." });
    } finally {
      connection.release();
    }
  }
);

// Toggle item của checklist
app.put(
  "/api/checklist-items/:itemId/toggle",
  authMiddleware,
  async (req, res) => {
    const itemId = Number(req.params.itemId);
    const userId = req.user.id;

    // Tìm item để lấy checklist_id và card_id
    const [itemRows] = await pool.query(
      `
        SELECT ci.*, c.card_id FROM checklist_items ci
        JOIN checklists cl ON ci.checklist_id = cl.checklist_id
        JOIN cards c ON cl.card_id = c.card_id
        WHERE ci.item_id = ?
    `,
      [itemId]
    );
    if (itemRows.length === 0)
      return res.status(404).json({ message: "Item không tồn tại." });

    const cardId = itemRows[0].card_id;

    // Kiểm tra quyền truy cập card
    if (!(await checkCardMembership(userId, cardId))) {
      return res
        .status(403)
        .json({ message: "Không có quyền truy cập card này." });
    }

    const currentCompleted = itemRows[0].is_completed;
    const newCompleted = !currentCompleted;

    await pool.query(
      "UPDATE checklist_items SET is_completed = ? WHERE item_id = ?",
      [newCompleted, itemId]
    );

    const updatedItem = { ...itemRows[0], is_completed: newCompleted };

    // Socket update
    io.emit("CHECKLIST_UPDATED", { cardId });

    res.status(200).json(updatedItem);
  }
);

// Xóa item
app.delete("/api/checklist-items/:itemId", authMiddleware, async (req, res) => {
  const itemId = Number(req.params.itemId);
  const userId = req.user.id;

  // Tìm item để lấy card_id
  const [itemRows] = await pool.query(
    `
        SELECT c.card_id FROM checklist_items ci
        JOIN checklists cl ON ci.checklist_id = cl.checklist_id
        JOIN cards c ON cl.card_id = c.card_id
        WHERE ci.item_id = ?
    `,
    [itemId]
  );
  if (itemRows.length === 0)
    return res.status(404).json({ message: "Item không tồn tại." });

  const cardId = itemRows[0].card_id;

  // Kiểm tra quyền truy cập card
  if (!(await checkCardMembership(userId, cardId))) {
    return res
      .status(403)
      .json({ message: "Không có quyền truy cập card này." });
  }

  await pool.query("DELETE FROM checklist_items WHERE item_id = ?", [itemId]);

  // Socket update
  io.emit("CHECKLIST_UPDATED", { cardId });

  res.status(200).json({ message: "Đã xóa item" });
});

// Chỉnh sửa item trong checklist
app.put("/api/checklist-items/:itemId", authMiddleware, async (req, res) => {
  const itemId = Number(req.params.itemId);
  const { description } = req.body;
  const userId = req.user.id;

  // Tìm item để lấy card_id
  const [itemRows] = await pool.query(
    `
        SELECT c.card_id FROM checklist_items ci
        JOIN checklists cl ON ci.checklist_id = cl.checklist_id
        JOIN cards c ON cl.card_id = c.card_id
        WHERE ci.item_id = ?
    `,
    [itemId]
  );
  if (itemRows.length === 0)
    return res.status(404).json({ message: "Item không tồn tại." });

  const cardId = itemRows[0].card_id;

  // Kiểm tra quyền truy cập card
  if (!(await checkCardMembership(userId, cardId))) {
    return res
      .status(403)
      .json({ message: "Không có quyền truy cập card này." });
  }

  await pool.query(
    "UPDATE checklist_items SET description = ? WHERE item_id = ?",
    [description, itemId]
  );

  const updatedItem = { item_id: itemId, description };

  // Socket update
  io.emit("CHECKLIST_UPDATED", { cardId });

  res.status(200).json(updatedItem);
});

// GLOBAL INBOX APIS

// Hàm đảm bảo user có inbox cá nhân
async function ensureInbox(userId) {
  const inboxBoardId = `inbox_${userId}`;
  const inboxListId = `inbox_${userId}`;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Kiểm tra board inbox có tồn tại không
    const [boardRows] = await pool.query(
      "SELECT board_id FROM boards WHERE board_id = ?",
      [inboxBoardId]
    );
    if (boardRows.length === 0) {
      // Tạo board inbox
      await connection.query(
        "INSERT INTO boards (board_id, user_id, title, description, color, visibility) VALUES (?, ?, ?, 'Danh sách thẻ inbox cá nhân', '#f0f0f0', 'Private')",
        [inboxBoardId, userId, "Inbox"]
      );

      // Thêm user vào board_members (owner)
      await connection.query(
        "INSERT INTO board_members (board_id, user_id) VALUES (?, ?)",
        [inboxBoardId, userId]
      );
    }

    // Kiểm tra list "inbox" có tồn tại không
    const [listRows] = await connection.query(
      "SELECT list_id FROM lists WHERE board_id = ? AND list_id = ?",
      [inboxBoardId, inboxListId]
    );
    if (listRows.length === 0) {
      // Tạo list inbox
      await connection.query(
        "INSERT INTO lists (list_id, board_id, title, position) VALUES (?, ?, ?, 0)",
        [inboxListId, inboxBoardId, `Inbox`]
      );
    }

    //console.log(`Inbox đảm bảo cho user ${userId}`);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error("Lỗi tạo inbox:", err);
  } finally {
    connection.release();
  }
}

app.get("/api/inbox", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const inboxBoardId = `inbox_${userId}`;
  const inboxListId = `inbox_${userId}`;

  // Đảm bảo user có inbox
  await ensureInbox(userId);

  // Kiểm tra quyền truy cập board inbox
  if (!(await checkBoardMembership(userId, inboxBoardId))) {
    return res.status(403).json({ message: "Không có quyền truy cập Inbox." });
  }

  try {
    const inboxList = await getListsById(inboxListId);
    //console.log(inboxList.cards);
    res.status(200).json(inboxList.cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server." });
  }
});

// Tạo thẻ mới vào Inbox
app.post("/api/inbox/cards", authMiddleware, async (req, res) => {
  const userId = Number(req.user.id);
  const { title, description } = req.body;

  // Đảm bảo user có inbox
  await ensureInbox(userId);
  const listId = `inbox_${userId}`;

  if (!title)
    return res.status(400).json({ message: "Tiêu đề thẻ là bắt buộc" });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Tính toán vị trí (position) để card nằm cuối list
    const [rows] = await connection.query(
      "SELECT MAX(position) as maxPos FROM cards WHERE list_id = ?",
      [listId]
    );
    const newPosition = (rows[0].maxPos || 0) + 1024;

    // Tạo object card mới
    const newCard = {
      card_id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      list_id: listId,
      title: title || "Inbox",
      description: description || "",
      position: newPosition,
      state: "Inprogress",
      labels: [],
      due_date: null,
      members: [],
    };

    // Insert vào bảng cards
    await connection.query(
      "INSERT INTO cards (card_id, list_id, title, description, position, due_date) VALUES (?, ?, ?, ?, ?, ?)",
      [
        newCard.card_id,
        newCard.list_id,
        newCard.title,
        newCard.description,
        newCard.position,
        newCard.due_date,
      ]
    );

    res.status(201).json(newCard);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res
      .status(500)
      .json({ message: "Lỗi server khi tạo card", error: err.message });
  } finally {
    connection.release();
  }
});

// Cập nhật thẻ Inbox (Sửa tên, mô tả)
app.put("/api/inbox/cards/:cardId", authMiddleware, async (req, res) => {
  const userId = Number(req.user.id);
  const { cardId } = req.params;
  const { title, description, labels, dueDate, state } = req.body;

  // Đảm bảo user có inbox
  await ensureInbox(userId);
  const listId = `inbox_${userId}`;

  // Kiểm tra tồn tại card
  const check = await pool.query(
    "SELECT card_id FROM cards WHERE card_id = ? AND list_id = ?",
    [cardId, listId]
  );
  if (check[0].length === 0) {
    return res.status(404).json({ message: "Card không tồn tại." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Xóa label cũ liên kết với card
    await connection.query("DELETE FROM labels WHERE card_id = ?", cardId);
    // Thêm label mới liên kết với card
    for (const label of labels) {
      await connection.query(
        "INSERT INTO labels (card_id, name, color) VALUES (?, ?, ?)",
        [cardId, label.name, label.color]
      );
    }

    // Lấy card cũ để so sánh
    const [oldCards] = await connection.query(
      "SELECT title, description, due_date, state FROM cards WHERE card_id = ?",
      cardId
    );
    const oldCard = oldCards[0];

    // Cập nhật thông tin card
    const newTitle = title !== undefined ? title : oldCard.title;
    if (title != undefined && title != oldCard.title) {
      sendActivity({
        actorId: userId,
        cardId: cardId,
        boardId: boardId,
        type: "update",
        message: `đã đổi tên thẻ từ "${oldCard.title}" thành "${title}"`,
      });
    }
    const newDescription =
      description !== undefined ? description : oldCard.description;
    const newDueDate =
      dueDate !== undefined ? convertDateFtoB(dueDate) : oldCard.due_date;
    if (
      dueDate !== undefined &&
      convertDateFtoB(dueDate) !== oldCard.due_date
    ) {
      sendActivity({
        actorId: userId,
        cardId: cardId,
        boardId: boardId,
        type: "due",
        message:
          dueDate !== undefined
            ? `đã đặt hạn chót ${dueDate}`
            : `đã xoá hạn chót`,
      });
    }
    const newState = state !== undefined ? state : oldCard.state;
    // Cập nhật bảng cards
    await connection.query(
      "UPDATE cards SET title = ?, description = ?, due_date = ?, state = ? WHERE card_id = ?",
      [newTitle, newDescription, newDueDate, newState, cardId]
    );
    await connection.commit();

    const updatedCard = await getCardById(cardId);
    res.json(updatedCard);
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Lỗi cập nhật card", error: err.message });
  } finally {
    connection.release();
  }
});

// Xóa thẻ Inbox
app.delete("/api/inbox/cards/:cardId", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const cardId = req.params;

  // Đảm bảo user có inbox
  await ensureInbox(userId);
  const listId = `inbox_${userId}`;

  // Kiểm tra tồn tại card
  const check = await pool.query(
    "SELECT card_id FROM cards WHERE card_id = ? AND list_id = ?",
    [cardId, listId]
  );
  if (check[0].length === 0) {
    return res.status(404).json({ message: "Card không tồn tại." });
  }

  try {
    const [result] = await pool.query("DELETE FROM cards WHERE card_id = ?", [
      cardId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Card không tồn tại để xóa" });
    }

    console.log(`Đã xóa card với ID: ${cardId}`);
    res.status(204).send(); // 204 No Content
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xóa card", error: err.message });
  }
});

// API Comment
// Post new comments into cards
app.post("/api/cards/:cardId/comments", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { cardId } = req.params;
  const { content, boardId, listId } = req.body;

  if (!content) {
    return res.status(400).json({ message: "Comment content is required" });
  }

  // Check if user has access to the board
  if (!(await checkBoardMembership(userId, boardId))) {
    return res.status(403).json({ message: "Board not found or no access" });
  }

  // Check if card exists
  const [cardRows] = await pool.query(
    "SELECT card_id FROM cards WHERE card_id = ?",
    [cardId]
  );
  if (cardRows.length === 0) {
    return res.status(404).json({ message: "Card not found" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insert comment into database
    const [result] = await connection.query(
      "INSERT INTO card_comments (card_id, user_id, comment) VALUES (?, ?, ?)",
      [cardId, userId, content]
    );

    await connection.commit();

    // Send activity
    sendActivity({
      actorId: userId,
      cardId: cardId,
      boardId: boardId,
      message: content,
      type: "comment",
    });

    res.status(201).json({ message: "Comment added"});
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Error adding comment" });
  } finally {
    connection.release();
  }
});

// Frontend Socket.io
// import { io } from "socket.io-client";

// const socket = io("http://localhost:3000", {
//     auth: { token: "YOUR_JWT_TOKEN" }
// });

// socket.on("new_notification", (data) => {
//     // 1. Hiển thị Toast (Popup nhỏ góc màn hình)
//     toast.info(data.message);

//     // 2. Thêm vào danh sách state 'notifications' để hiển thị ở Inbox
//     setNotifications(prev => [data, ...prev]);
// });
