import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/ProfilePage.css";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = sessionStorage.getItem("token"); // Lấy token từ storage
        const response = await axios.get("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data.user);
        console.log("Thông tin profile:", response.data.user);
      } catch (error) {
        console.error("Lỗi lấy thông tin profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {getInitials(user?.name || user?.username)}
          </div>
          <h2>{user?.name || "Người dùng"}</h2>
          <p className="user-role">Thành viên hệ thống</p>
        </div>

        <div className="profile-body">
          <div className="info-group">
            <label>Username</label>
            <p>{user?.name || "N/A"}</p>
          </div>
          <div className="info-group">
            <label>Email</label>
            <p>{user?.email || "Chưa cập nhật"}</p>
          </div>
          <div className="info-group">
            <label>Ngày tham gia</label>
            <p>{new Date(user?.createdAt).toLocaleDateString("vi-VN")}</p>
          </div>
        </div>

        <button className="edit-profile-btn">Chỉnh sửa thông tin</button>
      </div>
    </div>
  );
};

export default ProfilePage;