import { useState } from 'react';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import FeatureCard from './FeatureCard';
import URLChecker from '../URLChecker';
import BlogLinkChecker from '../BlogLinkChecker/BlogLinkChecker';
import SchemaChecker from '../SchemaChecker/SchemaChecker';
import HeadingAnalyzer from '../HeadingAnalyzer/HeadingAnalyzer';
import { 
  Link, 
  FileText, 
  Globe, 
  BarChart3, 
  Shield,
  Database,
  Search,
  AlertCircle,
  Code,
  Type
} from 'lucide-react';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('home');

  const features = [
    {
      id: '404-checker',
      title: '404 URL Checker',
      description: 'ตรวจสอบ URL ที่เสียหาย (404) จากรายการ URL หรือ CSV file พร้อมแนะนำ URL สำหรับ redirect อัตโนมัติจาก sitemap',
      icon: Link,
      status: 'active',
      badge: 'Popular'
    },
    {
      id: 'blog-link-checker',
      title: 'Blog Link Checker',
      description: 'ตรวจสอบลิงก์ที่เสียในบทความบล็อกทั้งหมดจาก sitemap.xml โดยอัตโนมัติ',
      icon: FileText,
      status: 'active',
      badge: 'Popular'
    },
    {
      id: 'schema-checker',
      title: 'Schema Markup Checker',
      description: 'ตรวจสอบ Schema.org Markup และวิเคราะห์ความเหมาะสมสำหรับ AI Search',
      icon: Code,
      status: 'active',
      badge: 'New'
    },
    {
      id: 'heading-analyzer',
      title: 'Heading Structure Analyzer',
      description: 'ตรวจสอบโครงสร้าง H1-H6 และแนะนำการปรับปรุงเพื่อ SEO ที่ดีขึ้น',
      icon: Type,
      status: 'active',
      badge: 'New'
    },
    {
      id: 'sitemap-validator',
      title: 'Sitemap Validator',
      description: 'ตรวจสอบความถูกต้องของ sitemap.xml รวมถึงการเข้าถึง URL ทั้งหมดในไฟล์',
      icon: Globe,
      status: 'coming-soon'
    },
    {
      id: 'redirect-mapper',
      title: 'Redirect Mapper',
      description: 'สร้างแผนที่การ redirect อัตโนมัติจากการวิเคราะห์โครงสร้าง URL',
      icon: Database,
      status: 'coming-soon'
    },
    {
      id: 'reports',
      title: 'SEO Reports',
      description: 'รายงานสรุปผลการตรวจสอบ SEO แบบละเอียดพร้อมคำแนะนำในการปรับปรุง',
      icon: BarChart3,
      status: 'coming-soon',
      badge: 'Beta'
    },
    {
      id: 'history',
      title: 'Check History',
      description: 'ดูประวัติการตรวจสอบย้อนหลังพร้อมการเปรียบเทียบผลลัพธ์',
      icon: Database,
      status: 'coming-soon'
    },
    {
      id: 'security',
      title: 'Security Scanner',
      description: 'ตรวจสอบช่องโหว่ด้านความปลอดภัยของเว็บไซต์',
      icon: Shield,
      status: 'coming-soon',
      badge: 'Beta'
    }
  ];

  const renderContent = () => {
    switch(activeTab) {
      case '404-checker':
        return (
          <div className="feature-container">
            <URLChecker />
          </div>
        );
      
      case 'blog-link-checker':
        return (
          <div className="feature-container">
            <BlogLinkChecker />
          </div>
        );
      
      case 'schema-checker':
        return (
          <div className="feature-container">
            <SchemaChecker />
          </div>
        );
      
      case 'heading-analyzer':
        return (
          <div className="feature-container">
            <HeadingAnalyzer />
          </div>
        );
      
      case 'home':
        return (
          <>
            <div className="page-header">
              <h1 className="page-title">SEO Tools Dashboard</h1>
              <p className="page-subtitle">
                เครื่องมือช่วยตรวจสอบและปรับปรุง SEO สำหรับเว็บไซต์ของคุณ
              </p>
            </div>

            <div className="feature-grid">
              {features.map(feature => (
                <FeatureCard
                  key={feature.id}
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                  status={feature.status}
                  badge={feature.badge}
                  onClick={feature.status === 'active' ? () => setActiveTab(feature.id) : undefined}
                />
              ))}
            </div>

            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <Search size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">0</div>
                  <div className="stat-label">Total Checks Today</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <AlertCircle size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">0</div>
                  <div className="stat-label">404 Errors Found</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <Globe size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">0</div>
                  <div className="stat-label">Redirects Suggested</div>
                </div>
              </div>
            </div>
          </>
        );

      case 'settings':
        return (
          <div className="settings-page">
            <div className="page-header">
              <h1 className="page-title">Settings</h1>
              <p className="page-subtitle">จัดการการตั้งค่าเครื่องมือ SEO</p>
            </div>
            <div className="settings-card">
              <p>การตั้งค่าจะพร้อมใช้งานเร็วๆ นี้</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="coming-soon-page">
            <div className="page-header">
              <h1 className="page-title">Coming Soon</h1>
              <p className="page-subtitle">ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนา</p>
            </div>
            <div className="coming-soon-card">
              <Globe size={64} strokeWidth={1} />
              <h2>We're working on it!</h2>
              <p>ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="main-content">
        <Header />
        <div className="content-wrapper">
          <div className="page-content">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;