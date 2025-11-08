import React, { useEffect, useState } from "react";
import { data, useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import SearchBar from "../components/SearchBar";

const Dashboard = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // useEffect(() => {
  //   const isLoggedIn = sessionStorage.getItem("loggedIn");
  //   if (!isLoggedIn) {
  //     navigate("/");
  //     return;
  //   }

  //   // Giả lập lấy danh sách boards
  //   const savedBoards =
  //     JSON.parse(sessionStorage.getItem("boards")) || [
  //       { id: 1, name: "Công việc nhóm" },
  //       { id: 2, name: "Dự án React" },
  //       { id: 3, name: "Việc cá nhân" },
  //     ];
  //   setBoards(savedBoards);
  // }, [navigate]);

  useEffect(()=>{
    const isLoggedIn = sessionStorage.getItem("loggedIn");
    if(!isLoggedIn){
      navigate("/");
      return;
    }

    fetch("Board.json")
    .then((res)=>res.json())
    .then((data)=>{
      setBoards(data.boards);
      sessionStorage.setItem("boards",JSON.stringify(data.boards));
    }).catch((err)=>console.error("Lỗi tải board",err));
  },[navigate]);

  const handleBoardClick = (boardId) => {
    navigate(`/board/${boardId}`);
  };

  const handleAddBoard = () => {
    const name = prompt("Nhập tên board mới:");
    if (name) {
      const newBoard = { id: Date.now(), name };
      const updatedBoards = [...boards, newBoard];
      setBoards(updatedBoards);
      sessionStorage.setItem("boards", JSON.stringify(updatedBoards));
    }
  };

  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

return (
    <div className="dashboard">
      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm}/>

      <div className="dashboard-header">      
        <h1>📋 My Boards</h1>
        <div>
          <button className="dashboard-button" onClick={handleAddBoard}>
            + Thêm board
          </button>
        </div>
      </div>

      <div className="board-list">
        {filteredBoards.map((board) => (
          <div
            key={board.id}
            className="board-card"
            onClick={() => handleBoardClick(board.id)}
          >
            {board.name}
          </div>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;
