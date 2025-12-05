import React, { useEffect, useState, useMemo } from "react";

const API_URL = "http://localhost:3000";

const AdminUserPage = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`);
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      alert("Không tải được danh sách user");
    }
  };

  // Xóa user
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa user này?")) return;

    try {
      await fetch(`${API_URL}/api/users/${id}`, { method: "DELETE" });

      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSelectedUser(null);
    } catch (error) {
      console.error(error);
      alert("Xóa thất bại");
    }
  };

  // Tìm user
  const filtered = useMemo(() => {
    const kw = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw)
    );
  }, [search, users]);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 10 }}>Quản lý người dùng</h1>

      <input
        type="text"
        placeholder="Tìm theo tên hoặc email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: 10,
          width: 320,
          borderRadius: 6,
          border: "1px solid #ccc",
          margin: "16px 0",
          fontSize: 15,
        }}
      />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Tên</th>
            <th style={th}>Email</th>
            <th style={th}>Role</th>
            <th style={th}>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((user) => (
            <tr key={user.id}>
              <td style={td}>{user.name}</td>
              <td style={td}>{user.email}</td>
              <td style={td}>{user.role}</td>

              <td style={td}>
                <button
                  onClick={() => setSelectedUser(user)}
                  style={btnPrimary}
                >
                  Chi tiết
                </button>

                <button onClick={() => handleDelete(user.id)} style={btnDanger}>
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedUser && (
        <div style={overlay}>
          <div style={modal}>
            <h2>Thông tin người dùng</h2>

            <p>
              <strong>Tên:</strong> {selectedUser.name}
            </p>
            <p>
              <strong>Email:</strong> {selectedUser.email}
            </p>
            <p>
              <strong>Role:</strong> {selectedUser.role}
            </p>

            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button
                onClick={() => handleDelete(selectedUser.id)}
                style={btnDanger}
              >
                Xóa
              </button>

              <button onClick={() => setSelectedUser(null)} style={btnClose}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// CSS
const th = {
  padding: 12,
  borderBottom: "2px solid #ddd",
  textAlign: "left",
  background: "#f8f8f8",
};

const td = {
  padding: 12,
  borderBottom: "1px solid #eee",
};

const btnPrimary = {
  padding: "6px 12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  marginRight: 8,
};

const btnDanger = {
  padding: "6px 12px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  marginRight: 10,
};

const btnClose = {
  padding: "6px 12px",
  background: "#555",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modal = {
  width: 450,
  background: "#fff",
  borderRadius: 12,
  padding: "25px 30px",
  boxShadow: "0 0 25px rgba(0,0,0,0.25)",
};

export default AdminUserPage;
