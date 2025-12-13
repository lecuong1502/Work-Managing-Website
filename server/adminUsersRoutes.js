// =====================
//   ADMIN USERS ROUTES
// =====================

export default function adminUserRoutes(
  app,
  users,
  userBoards,
  userNotifications,
  authMiddleware,
  adminOnlyMiddleware
) {
  // Lấy danh sách tất cả user
  app.get("/api/users", authMiddleware, adminOnlyMiddleware, (req, res) => {
    try {
      const list = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar_url,
        role: u.role,
      }));

      res.json(list);
    } catch (err) {
      console.error("Lỗi /api/users:", err);
      res.status(500).json({ message: "Lỗi server khi lấy danh sách user" });
    }
  });

  // Lấy thông tin user theo ID
  app.get("/api/users/:id", authMiddleware, adminOnlyMiddleware, (req, res) => {
    const { id } = req.params;

    try {
      const user = users.find((u) => u.id == id);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy user" });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar_url,
        role: user.role,
      });
    } catch (err) {
      console.error("Lỗi /api/users/:id:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  });

  // Xóa user
  app.delete(
    "/api/users/:id",
    authMiddleware,
    adminOnlyMiddleware,
    (req, res) => {
      const { id } = req.params;

      try {
        // Xóa user trong mảng users
        const index = users.findIndex((u) => u.id == id);
        if (index === -1) {
          return res.status(404).json({ message: "User không tồn tại" });
        }
        users.splice(index, 1);

        // Xóa toàn bộ board của user
        delete userBoards[id];

        // Xóa thông báo của user
        delete userNotifications[id];

        // Gỡ user khỏi các board mà user được share
        Object.keys(userBoards).forEach((uid) => {
          userBoards[uid] = userBoards[uid].map((board) => {
            if (!board.members) return board;
            board.members = board.members.filter((m) => m.id != id);
            return board;
          });
        });

        res.json({ message: "Xóa thành công" });
      } catch (err) {
        console.error("Lỗi DELETE /api/users/:id:", err);
        res.status(500).json({ message: "Lỗi server" });
      }
    }
  );
}
