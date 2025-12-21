import React, { useState, useEffect } from "react";
import "../styles/homepage.css";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();
  const slides = [
    {
      title: "Inbox",
      desc: "Khi bạn nghĩ đến việc gì đó, nó sẽ được chuyển vào Hộp thư đến. Ghi lại những việc cần làm mọi lúc, mọi nơi.",
      img: "/assets/inbox_01.png",
    },
    {
      title: "Boards",
      desc: 'Danh sách việc cần làm của bạn có thể dài, nhưng hoàn toàn có thể quản lý được! Hãy theo dõi mọi thứ, từ "việc cần làm" đến "nhiệm vụ đã hoàn thành".',
      img: "/assets/backgroundLogin.jpg",
    },
    {
      title: "Planner",
      desc: "Kéo, thả, hoàn thành. Ghi những việc quan trọng nhất vào lịch và dành thời gian cho những việc thực sự quan trọng.",
      img: "/assets/calendar_01.jpg",
    },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="home">
      <h1>Welcome to TaskManager</h1>
      <p>Manage your projects efficiently.</p>
      <button className="btn-rainbow" onClick={() => navigate("/register")}>
        Bắt đầu ngay - Miễn phí!
      </button>

      <div className="grid-container">
        <div className="intro-box">
          <h3>For Software Developers</h3>
          <p>Track progress, manage sprints, and improve collaboration.</p>
        </div>
        <div className="intro-box">
          <h3>Marketing</h3>
          <p>Plan, launch, and monitor campaigns effectively.</p>
        </div>
        <div className="intro-box">
          <h3>Project Management</h3>
          <p>Coordinate projects and manage tasks with clarity.</p>
        </div>
        <div className="intro-box">
          <h3>IT</h3>
          <p>Handle requests, monitor systems, and improve workflows.</p>
        </div>
      </div>

      { }
      <section className="feature-showcase">
        <div className="feature-left">
          <h2>{slides[current].title}</h2>
          <p>{slides[current].desc}</p>

          <div className="feature-dots">
            {slides.map((_, index) => (
              <span
                key={index}
                className={index === current ? "dot active" : "dot"}
                onClick={() => setCurrent(index)}
              ></span>
            ))}
          </div>
        </div>

        <div className="feature-right">
          {slides.map((slide, index) => (
            <img
              key={index}
              src={slide.img}
              alt={slide.title}
              className={`feature-img ${index === current ? "active" : ""}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
