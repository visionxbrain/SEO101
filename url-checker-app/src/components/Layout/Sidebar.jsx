import { useState } from 'react';
import { 
  Home, 
  Search, 
  Link, 
  FileText, 
  BarChart3, 
  Settings, 
  Shield,
  Database,
  Globe,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Code,
  Type
} from 'lucide-react';

function Sidebar({ activeTab, onTabChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState(['tools']);

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const menuItems = [
    {
      id: 'home',
      label: 'Dashboard',
      icon: Home,
      type: 'item'
    },
    {
      id: 'tools',
      label: 'SEO Tools',
      icon: Search,
      type: 'section',
      children: [
        { id: '404-checker', label: '404 URL Checker', icon: Link },
        { id: 'blog-link-checker', label: 'Blog Link Checker', icon: FileText },
        { id: 'schema-checker', label: 'Schema Markup Checker', icon: Code, badge: 'New' },
        { id: 'heading-analyzer', label: 'Heading Structure', icon: Type, badge: 'New' },
        { id: 'sitemap-validator', label: 'Sitemap Validator', icon: Globe, badge: 'Soon' },
        { id: 'redirect-mapper', label: 'Redirect Mapper', icon: Database, badge: 'Soon' }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      type: 'section',
      children: [
        { id: 'reports', label: 'Reports', icon: FileText, badge: 'Soon' },
        { id: 'history', label: 'Check History', icon: Database, badge: 'Soon' }
      ]
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      type: 'item',
      badge: 'Beta'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      type: 'item'
    }
  ];

  return (
    <>
      <button 
        className="sidebar-toggle-mobile"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <Menu size={20} /> : <X size={20} />}
      </button>
      
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Search size={24} />
            {!isCollapsed && <span>SEO Tools</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <div key={item.id} className="nav-group">
              {item.type === 'section' ? (
                <>
                  <button
                    className="nav-item nav-section"
                    onClick={() => toggleSection(item.id)}
                  >
                    <div className="nav-item-content">
                      <item.icon size={18} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      expandedSections.includes(item.id) 
                        ? <ChevronDown size={16} />
                        : <ChevronRight size={16} />
                    )}
                  </button>
                  {expandedSections.includes(item.id) && !isCollapsed && (
                    <div className="nav-children">
                      {item.children.map(child => (
                        <button
                          key={child.id}
                          className={`nav-item nav-child ${activeTab === child.id ? 'active' : ''}`}
                          onClick={() => onTabChange(child.id)}
                        >
                          <child.icon size={16} />
                          <span>{child.label}</span>
                          {child.badge && (
                            <span className={`nav-badge ${child.badge.toLowerCase()}`}>
                              {child.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => onTabChange(item.id)}
                >
                  <item.icon size={18} />
                  {!isCollapsed && <span>{item.label}</span>}
                  {!isCollapsed && item.badge && (
                    <span className={`nav-badge ${item.badge.toLowerCase()}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
            {!isCollapsed && <span>Collapse sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;