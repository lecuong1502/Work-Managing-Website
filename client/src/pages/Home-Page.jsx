import React from "react";
import "../styles/homepage.css";

const HomePage =()=> {
  return (
    <div className="home">
      <h1>Welcome to TaskManager</h1>
      <p>Manage your projects efficiently.</p>
      <div class="grid-container">
        <div class="intro-box">
          <h3>For Software Developers</h3>
          <p>Track progress, manage sprints, and improve collaboration.</p>
        </div>
        <div class="intro-box">
          <h3>Marketing</h3>
          <p>Plan, launch, and monitor campaigns effectively.</p>
        </div>
        <div class="intro-box">
          <h3>Project Management</h3>
          <p>Coordinate projects and manage tasks with clarity.</p>
        </div>
        <div class="intro-box">
          <h3>IT</h3>
          <p>Handle requests, monitor systems, and improve workflows.</p>
        </div>
      </div>

    </div>
  );
}

export default HomePage;
