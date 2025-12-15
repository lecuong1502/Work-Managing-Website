import React, { useEffect, useState, useMemo } from "react";

const API_URL = "http://localhost:3000";

const AdminUserPage = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

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

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa user này?")) return;

    try {
      await fetch(`${API_URL}/api/users/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      alert("Xóa thất bại!");
    }
  };

  const filtered = useMemo(() => {
    const kw = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw)
    );
  }, [search, users]);

  return (
    <div style={page}>
      <h1 style={title}> Quản lý người dùng</h1>

      {/* Ô tìm kiếm */}
      <input
        type="text"
        placeholder="🔍 Tìm theo tên hoặc email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchBox}
      />

      <div style={tableWrapper}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Tên</th>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((user, index) => (
              <tr
                key={user.id}
                style={{ background: index % 2 ? "#f9fafb" : "white" }}
              >
                <td style={td}>{user.name}</td>
                <td style={td}>{user.email}</td>
                <td style={tdRole(user.role)}>{user.role}</td>

                <td style={td}>
                  <button
                    onClick={() => setSelectedUser(user)}
                    style={btnPrimary}
                  >
                    Chi tiết
                  </button>

                  <button
                    onClick={() => handleDelete(user.id)}
                    style={btnDanger}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={{ marginBottom: 10 }}>Thông tin người dùng</h2>

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

//Styles
const page = {
  padding: 20,
  animation: "fadeIn 0.3s ease",
};

const title = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 20,
  color: "#1e293b",
};

const searchBox = {
  padding: "10px 14px",
  width: 330,
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  marginBottom: 18,
  fontSize: 15,
  outline: "none",
  transition: "0.2s",
};

searchBox[":focus"] = {
  borderColor: "#2563eb",
};

const tableWrapper = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  padding: "12px 10px",
  background: "#f1f5f9",
  fontWeight: 600,
  textAlign: "left",
  borderBottom: "2px solid #e2e8f0",
  color: "#334155",
};

const td = {
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 15,
};

const tdRole = (role) => ({
  ...td,
  fontWeight: 600,
  color: role === "admin" ? "#dc2626" : "#0f766e",
});

const btnPrimary = {
  padding: "6px 12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  marginRight: 8,
  fontWeight: 600,
  transition: "0.2s",
};

const btnDanger = {
  padding: "6px 12px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  marginRight: 8,
  fontWeight: 600,
  transition: "0.2s",
};

const btnClose = {
  padding: "6px 12px",
  background: "#475569",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
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
  borderRadius: 14,
  padding: "25px 30px",
};

export default AdminUserPage;
