import { Bell, User, HelpCircle, ChevronDown, Globe, Sun, Moon } from 'lucide-react';
import { useState } from 'react';

function Header({ currentUser = 'info@visionxbrain.com' }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="breadcrumb">
          <span className="breadcrumb-item">
            <Globe size={16} />
            {currentUser}'s Account
          </span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-search">
          <input 
            type="text" 
            placeholder="Go to..." 
            className="search-input"
          />
          <kbd>⌘K</kbd>
        </div>

        <div className="header-actions">
          <button className="header-btn">
            <HelpCircle size={18} />
            <span>Support</span>
          </button>

          <button className="header-btn notification">
            <Bell size={18} />
            <span className="notification-dot"></span>
          </button>

          <button 
            className="header-btn"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="language-selector">
            <button className="header-btn">
              <span>English</span>
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="user-menu">
            <button 
              className="user-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="user-avatar">
                <User size={18} />
              </div>
              <ChevronDown size={16} />
            </button>

            {showDropdown && (
              <div className="dropdown-menu user-dropdown">
                <div className="dropdown-header">
                  <div className="user-info">
                    <span className="user-email">{currentUser}</span>
                    <span className="user-role">Account Admin</span>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item">Profile Settings</button>
                <button className="dropdown-item">Billing</button>
                <button className="dropdown-item">API Tokens</button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout">Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;