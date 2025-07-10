import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Workflow from './pages/Workflow';
import KnowledgeBase from './pages/KnowledgeBase';

function UserProfile() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div className="user-profile-container" ref={dropdownRef}>
      <button className="user-profile" onClick={toggleDropdown}>
        M
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          <a href="#" className="dropdown-item">Profile</a>
          <a href="#" className="dropdown-item">Settings</a>
          <div className="dropdown-divider"></div>
          <a href="#" className="dropdown-item">Logout</a>
        </div>
      )}
    </div>
  );
}

function Sidebar({ isOpen }) {
  const chatHistory = [];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <button className="new-chat-button">New Chat</button>
      </div>
      <ul className="chat-history-list">
        {chatHistory.map(chat => (
          <li key={chat.id}>{chat.title}</li>
        ))}
      </ul>
    </aside>
  );
}

const SunIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 20V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4.92999 4.92999L6.33999 6.33999" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17.66 17.66L19.07 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.33999 17.66L4.92999 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.07 4.92999L17.66 6.33999" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

const MoonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

const WorkflowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20"></path></svg>
);

const KnowledgeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
);

export const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CollapseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

function App() {
  const [theme, setTheme] = useState('dark');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="main-view">
        <header className="header">
          <div className="header-content">
            <div className="header-left">
              <button className="menu-button" onClick={toggleSidebar}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <NavLink to="/" className="logo">SKENZER</NavLink>
      </div>
            <nav className="nav-links">
              <NavLink to="/workflow" className="nav-button">
                <WorkflowIcon />
                <span>Workflow</span>
              </NavLink>
              <NavLink to="/knowledge-base" className="nav-button">
                <KnowledgeIcon />
                <span>Knowledge Base</span>
              </NavLink>
              <button className="theme-toggle" onClick={toggleTheme}>
                {theme === 'light' ? <SunIcon /> : <MoonIcon />}
        </button>
              <UserProfile />
            </nav>
          </div>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/workflow" element={<Workflow />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App; 