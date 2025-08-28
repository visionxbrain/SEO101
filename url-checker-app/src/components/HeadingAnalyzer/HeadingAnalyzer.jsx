import { useState } from 'react';
import { 
  Type, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Download, 
  TrendingUp, 
  FileText, 
  Globe, 
  ExternalLink,
  AlertTriangle,
  Hash,
  List,
  ChevronRight,
  ArrowRight,
  Eye,
  RefreshCw,
  Maximize2,
  X,
  Zap,
  Copy
} from 'lucide-react';
import './HeadingAnalyzer.css';
import { openWithOverlay } from '../../utils/headingOverlay';
import { openWithIssuesOverlay } from '../../utils/headingOverlayWithIssues';
import config from '../../config';

function HeadingAnalyzer() {
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [inputMode, setInputMode] = useState('urls'); // 'urls' or 'sitemap'
  const [selectedUrl, setSelectedUrl] = useState(null); // For live preview
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [highlightHeadings, setHighlightHeadings] = useState(true);

  const handleCheck = async () => {
    let requestData;
    
    if (inputMode === 'sitemap') {
      // Sitemap mode
      const sitemapUrl = urls.trim();
      if (!sitemapUrl) {
        setError('กรุณาใส่ URL ของ sitemap.xml');
        return;
      }
      if (!sitemapUrl.includes('sitemap') && !sitemapUrl.endsWith('.xml')) {
        setError('URL ต้องเป็น sitemap.xml');
        return;
      }
      requestData = {
        urls: sitemapUrl,
        max_workers: 5,
        limit: null // No limit - fetch all
      };
    } else {
      // Manual URLs mode
      const urlList = urls.split('\n').map(url => url.trim()).filter(url => url);
      if (urlList.length === 0) {
        setError('กรุณาใส่ URL อย่างน้อย 1 รายการ');
        return;
      }
      requestData = {
        urls: urlList,
        max_workers: 5
      };
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(config.endpoints.checkHeadingStructure, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('เกิดข้อผิดพลาดในการตรวจสอบ');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'ไม่สามารถตรวจสอบโครงสร้าง Heading ได้');
    } finally {
      setLoading(false);
    }
  };

  const exportResults = (format = 'json') => {
    if (!results) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const source = results.summary.source === 'sitemap' ? 'sitemap' : 'manual';
    const filename = `heading_report_${source}_${timestamp}`;

    if (format === 'json') {
      const json = JSON.stringify(results, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export
      const csvHeader = ['URL', 'Has H1', 'H1 Count', 'H1 Text', 'Score', 'Issues', 'Recommendations'];
      
      // Add summary info at the top
      const summaryInfo = [
        ['Heading Structure Report'],
        ['Generated:', new Date().toLocaleString('th-TH')],
        ['Source:', results.summary.source === 'sitemap' ? `Sitemap: ${results.summary.sitemap_url}` : 'Manual URLs'],
        ['Total URLs:', results.summary.total_urls],
        ['With H1:', results.summary.with_h1],
        ['Without H1:', results.summary.without_h1],
        ['Multiple H1:', results.summary.multiple_h1],
        ['Perfect Structure:', results.summary.perfect_structure],
        ['Average Score:', results.summary.average_score],
        [''],
        csvHeader
      ];
      
      const csvData = results.results.map(r => [
        r.url,
        r.has_h1 ? 'Yes' : 'No',
        r.h1_count,
        r.h1_text.join(' | ') || 'None',
        r.score,
        r.issues.length + ' issues',
        r.recommendations.join('; ') || 'No recommendations'
      ]);

      const csvContent = [...summaryInfo, ...csvData];
      const csv = csvContent.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-fair';
    return 'score-poor';
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'ดีเยี่ยม';
    if (score >= 70) return 'ดี';
    if (score >= 50) return 'พอใช้';
    return 'ต้องปรับปรุง';
  };

  const getIssueIcon = (issueType) => {
    switch(issueType) {
      case 'missing_h1': return <XCircle size={14} />;
      case 'multiple_h1': return <AlertTriangle size={14} />;
      case 'skipped_level': return <AlertCircle size={14} />;
      case 'empty_heading': return <AlertCircle size={14} />;
      case 'too_long': return <AlertCircle size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  const getIssueColor = (issueType) => {
    switch(issueType) {
      case 'missing_h1': return 'issue-critical';
      case 'multiple_h1': return 'issue-warning';
      case 'skipped_level': return 'issue-warning';
      case 'empty_heading': return 'issue-error';
      case 'too_long': return 'issue-info';
      default: return 'issue-info';
    }
  };

  return (
    <div className="heading-analyzer">
      <div className="analyzer-header">
        <div className="header-content">
          <div className="header-icon">
            <Type size={24} />
          </div>
          <div>
            <h1>Heading Structure Analyzer</h1>
            <p>ตรวจสอบโครงสร้าง H1-H6 และแนะนำการปรับปรุงเพื่อ SEO ที่ดีขึ้น</p>
          </div>
        </div>
      </div>

      <div className="analyzer-content">
        {!results ? (
          <div className="input-section">
            <div className="url-input-card">
              <div className="card-header">
                <Hash size={20} />
                <h3>ตรวจสอบโครงสร้าง Heading</h3>
              </div>
              
              <div className="input-mode-selector">
                <button
                  className={`mode-btn ${inputMode === 'urls' ? 'active' : ''}`}
                  onClick={() => setInputMode('urls')}
                  disabled={loading}
                  title="กรอก URLs ที่ต้องการตรวจสอบเอง"
                >
                  <FileText size={18} />
                  <span>
                    <strong>ใส่ URLs เอง</strong>
                    <small style={{display: 'block', fontSize: '11px', marginTop: '2px', opacity: 0.8}}>
                      กรอกแต่ละบรรทัด
                    </small>
                  </span>
                </button>
                <button
                  className={`mode-btn ${inputMode === 'sitemap' ? 'active' : ''}`}
                  onClick={() => setInputMode('sitemap')}
                  disabled={loading}
                  title="ใช้ไฟล์ sitemap.xml เพื่อตรวจสอบทั้งเว็บไซต์"
                >
                  <Globe size={18} />
                  <span>
                    <strong>ใช้ Sitemap.xml</strong>
                    <small style={{display: 'block', fontSize: '11px', marginTop: '2px', opacity: 0.8}}>
                      ตรวจสอบทั้งเว็บ
                    </small>
                  </span>
                </button>
              </div>
              
              {inputMode === 'urls' ? (
                <textarea
                  className="url-textarea"
                  placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={8}
                  disabled={loading}
                />
              ) : (
                <div className="sitemap-input">
                  <div className="sitemap-label">
                    <Globe size={16} />
                    <span>ใส่ URL ของไฟล์ Sitemap</span>
                  </div>
                  <input
                    type="text"
                    className="url-input"
                    placeholder="https://example.com/sitemap.xml"
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    disabled={loading}
                  />
                  <div className="sitemap-tips">
                    <AlertCircle size={14} />
                    <span>ระบบจะดึง URLs ทั้งหมดจาก sitemap และตรวจสอบโครงสร้าง Heading ทุกหน้า</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                className="btn btn-primary btn-large"
                onClick={handleCheck}
                disabled={loading || !urls.trim()}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    ตรวจสอบโครงสร้าง
                  </>
                )}
              </button>

              <div className="info-box">
                <AlertCircle size={16} />
                <div>
                  <p>ระบบจะตรวจสอบ:</p>
                  <ul>
                    <li>การมี H1 และจำนวน H1 ในหน้า</li>
                    <li>ลำดับชั้นของ Heading (H1→H2→H3...)</li>
                    <li>Heading ที่ว่างเปล่าหรือยาวเกินไป</li>
                    <li>การข้ามระดับ Heading</li>
                    <li>คำแนะนำในการปรับปรุงโครงสร้าง</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="results-section">
            <div className="results-header">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setResults(null);
                  setUrls('');
                  setError(null);
                }}
              >
                ตรวจสอบใหม่
              </button>
              
              <div className="export-buttons">
                <button
                  className="btn btn-secondary"
                  onClick={() => exportResults('csv')}
                >
                  <Download size={16} />
                  Export CSV
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => exportResults('json')}
                >
                  <Download size={16} />
                  Export JSON
                </button>
              </div>
            </div>

            {/* Show sitemap info if used */}
            {results.summary.source === 'sitemap' && (
              <div className="sitemap-info">
                <AlertCircle size={16} />
                <span>ตรวจสอบ {results.summary.urls_checked} URLs จาก: {results.summary.sitemap_url}</span>
              </div>
            )}
            
            {/* Summary Stats */}
            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-icon blue">
                  <Hash size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">{results.summary.total_urls}</div>
                  <div className="card-label">URLs ที่ตรวจสอบ</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon green">
                  <CheckCircle size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">{results.summary.with_h1}</div>
                  <div className="card-label">มี H1</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon orange">
                  <AlertTriangle size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">{results.summary.multiple_h1}</div>
                  <div className="card-label">H1 หลายแท็ก</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon purple">
                  <TrendingUp size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">{results.summary.average_score}</div>
                  <div className="card-label">คะแนนเฉลี่ย</div>
                </div>
              </div>
            </div>

            {/* Common Issues */}
            {Object.keys(results.summary.common_issues).length > 0 && (
              <div className="common-issues">
                <h3>ปัญหาที่พบบ่อย</h3>
                <div className="issue-badges">
                  {Object.entries(results.summary.common_issues).map(([issue, count]) => (
                    <span key={issue} className={`issue-badge ${getIssueColor(issue)}`}>
                      {getIssueIcon(issue)}
                      {issue.replace(/_/g, ' ')} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="result-tabs">
              <button
                className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                ภาพรวม
              </button>
              <button
                className={`tab ${activeTab === 'hierarchy' ? 'active' : ''}`}
                onClick={() => setActiveTab('hierarchy')}
              >
                โครงสร้าง Heading
              </button>
              <button
                className={`tab ${activeTab === 'live' ? 'active' : ''}`}
                onClick={() => setActiveTab('live')}
              >
                <Eye size={14} />
                Live Preview
              </button>
              <button
                className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
                onClick={() => setActiveTab('recommendations')}
              >
                คำแนะนำ
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-grid">
                  {results.results.map((result, idx) => (
                    <div key={idx} className="url-card">
                      <div className="url-header">
                        <a href={result.url} target="_blank" rel="noopener noreferrer" title="คลิกเพื่อเปิดในแท็บใหม่">
                          <span className="url-text">{result.url}</span>
                          <ExternalLink size={12} className="external-icon" />
                        </a>
                        <div className={`score-badge ${getScoreColor(result.score)}`}>
                          {result.score}/100
                        </div>
                      </div>
                      
                      <div className="url-stats">
                        <div className="stat">
                          <span className="stat-label">H1:</span>
                          <span className={result.has_h1 ? 'has-h1' : 'no-h1'}>
                            {result.h1_count === 0 ? 'ไม่มี' : 
                             result.h1_count === 1 ? 'มี 1 แท็ก' : 
                             `มี ${result.h1_count} แท็ก ⚠️`}
                          </span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">ปัญหา:</span>
                          <span className={result.issues.length > 0 ? 'has-issues' : 'no-issues'}>
                            {result.issues.length} รายการ
                          </span>
                        </div>
                      </div>

                      {result.h1_text.length > 0 && (
                        <div className="h1-preview">
                          <strong>H1:</strong> {result.h1_text[0].substring(0, 60)}
                          {result.h1_text[0].length > 60 && '...'}
                        </div>
                      )}

                      {result.issues.length > 0 && (
                        <div className="issue-summary">
                          {result.issues.slice(0, 2).map((issue, i) => (
                            <div key={i} className={`mini-issue ${getIssueColor(issue.type)}`}>
                              {getIssueIcon(issue.type)}
                              <span>{issue.message}</span>
                            </div>
                          ))}
                          {result.issues.length > 2 && (
                            <div className="mini-issue">
                              <span>+{result.issues.length - 2} ปัญหาอื่นๆ</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="score-analysis">
                        <div className="score-bar">
                          <div 
                            className={`score-fill ${getScoreColor(result.score)}`}
                            style={{ width: result.score === 0 ? '3%' : `${result.score}%` }}
                            title={`Score: ${result.score}/100`}
                          ></div>
                        </div>
                        <span className="score-label">
                          {result.score < 50 ? '⚠️ ' : ''}
                          {getScoreLabel(result.score)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'hierarchy' && (
                <div className="hierarchy-section">
                  {results.results.map((result, idx) => (
                    <div key={idx} className="hierarchy-card">
                      <div className="hierarchy-card-header">
                        <h3>
                          <a href={result.url} target="_blank" rel="noopener noreferrer">
                            {result.url}
                            <ExternalLink size={14} />
                          </a>
                        </h3>
                        <div className="hierarchy-stats-bar">
                          <span className={`stat-badge ${result.h1_count === 1 ? 'success' : result.h1_count === 0 ? 'error' : 'warning'}`}>
                            H1: {result.h1_count}
                          </span>
                          <span className="stat-badge">Total: {result.heading_hierarchy.length}</span>
                          <span className={`stat-badge score ${getScoreColor(result.score)}`}>
                            Score: {result.score}/100
                          </span>
                        </div>
                      </div>
                      
                      <div className="heading-comparison">
                        {/* Current Structure */}
                        <div className="structure-column current">
                          <div className="column-header">
                            <List size={16} />
                            <span>โครงสร้างปัจจุบัน</span>
                            {result.issues.length > 0 && (
                              <span className="issue-count">{result.issues.length} ปัญหา</span>
                            )}
                          </div>
                          <div className="heading-tree">
                            {result.heading_hierarchy.length > 0 ? (
                              <>
                                {result.heading_hierarchy.map((heading, hIdx) => (
                                  <div 
                                    key={hIdx} 
                                    className={`heading-item level-${heading.level} ${
                                      result.issues.some(i => i.element && heading.text && heading.text.includes(i.element.substring(0, 30))) ? 'has-issue' : ''
                                    }`}
                                    style={{ 
                                      paddingLeft: `${(heading.level - 1) * 20 + 12}px`,
                                      position: 'relative'
                                    }}
                                  >
                                    <span className="item-number">{hIdx + 1}</span>
                                    <span className="heading-tag">{heading.tag}</span>
                                    <span className={`heading-text ${!heading.text || heading.text === '(empty)' ? 'empty' : ''}`}>
                                      {heading.text || '(ว่างเปล่า)'}
                                    </span>
                                    {heading.full_text && heading.full_text.length > 70 && (
                                      <span className="text-warning" title="ข้อความยาวเกินไป">⚠️</span>
                                    )}
                                  </div>
                                ))}
                              </>
                            ) : (
                              <p className="heading-tree-empty">
                                <AlertCircle size={32} />
                                <span>ไม่พบ Heading ในหน้านี้</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="structure-divider">
                          <ArrowRight size={20} />
                        </div>

                        {/* Optimized Structure */}
                        <div className="structure-column optimized">
                          <div className="column-header success">
                            <CheckCircle size={16} />
                            <span>โครงสร้างที่แนะนำ</span>
                            <span className="improvement-badge">SEO Optimized</span>
                          </div>
                          <div className="heading-tree optimized">
                            {result.optimized_structure && result.optimized_structure.length > 0 ? (
                              result.optimized_structure.map((heading, oIdx) => (
                                <div 
                                  key={oIdx} 
                                  className={`heading-item level-${heading.level} action-${heading.action}`}
                                  style={{ 
                                    paddingLeft: `${(heading.level - 1) * 20 + 12}px`,
                                    position: 'relative'
                                  }}
                                >
                                  <span className="item-number">{oIdx + 1}</span>
                                  <span className="heading-tag">{heading.tag}</span>
                                  <span className="heading-text">{heading.text}</span>
                                  <span className="action-badge">
                                    {heading.action === 'add' && (
                                      <><span className="action-icon">+</span> เพิ่ม</>
                                    )}
                                    {heading.action === 'change' && (
                                      <><span className="action-icon">↻</span> เปลี่ยน</>
                                    )}
                                    {heading.action === 'keep' && (
                                      <><span className="action-icon">✓</span> คงไว้</>
                                    )}
                                    {heading.action === 'shorten' && (
                                      <><span className="action-icon">✂</span> ย่อ</>
                                    )}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="no-optimization">
                                <CheckCircle size={24} color="#22c55e" />
                                <span>โครงสร้างดีอยู่แล้ว!</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Issues Summary */}
                      {result.issues.length > 0 && (
                        <div className="issues-summary-bar">
                          <div className="summary-title">
                            <AlertCircle size={16} />
                            ปัญหาที่พบ:
                          </div>
                          <div className="issue-pills">
                            {result.issues.slice(0, 3).map((issue, iIdx) => (
                              <span key={iIdx} className={`issue-pill ${issue.severity || 'medium'}`}>
                                {issue.message}
                              </span>
                            ))}
                            {result.issues.length > 3 && (
                              <span className="issue-pill more">+{result.issues.length - 3} อื่นๆ</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'live' && (
                <div className="live-preview-section">
                  <div className="live-mode-header">
                    <div className="live-mode-icon">
                      <Zap size={32} />
                    </div>
                    <div className="live-mode-info">
                      <h2>🚀 Live Mode - ตรวจสอบแบบ Real-time</h2>
                      <p>เปิดเว็บไซต์ในแท็บใหม่พร้อมแสดงกรอบสีและคำแนะนำการแก้ไข Heading</p>
                    </div>
                  </div>

                  <div className="url-cards-grid">
                    {results.results.map((result, idx) => (
                      <div key={idx} className="live-url-card">
                        <div className="live-card-header">
                          <div className="live-url-info">
                            <Globe size={16} />
                            <span className="live-url-text">{result.url}</span>
                          </div>
                          <div className={`live-score-badge ${getScoreColor(result.score)}`}>
                            {result.score}/100
                          </div>
                        </div>

                        <div className="live-issues-summary">
                          <div className="issue-stat critical">
                            <AlertCircle size={14} />
                            <span>{result.issues.filter(i => i.severity === 'critical').length} Critical</span>
                          </div>
                          <div className="issue-stat high">
                            <AlertTriangle size={14} />
                            <span>{result.issues.filter(i => i.severity === 'high').length} High</span>
                          </div>
                          <div className="issue-stat medium">
                            <AlertCircle size={14} />
                            <span>{result.issues.filter(i => i.severity === 'medium').length} Medium</span>
                          </div>
                        </div>

                        <div className="live-main-issues">
                          {result.issues.slice(0, 3).map((issue, i) => (
                            <div key={i} className={`live-issue-item ${issue.severity || 'medium'}`}>
                              <div className="issue-type">{getIssueIcon(issue.type)}</div>
                              <div className="issue-text">
                                <div className="issue-msg">{issue.message}</div>
                                <div className="issue-suggest">→ {issue.suggestion}</div>
                              </div>
                            </div>
                          ))}
                          {result.issues.length > 3 && (
                            <div className="more-issues">+{result.issues.length - 3} ปัญหาอื่นๆ</div>
                          )}
                        </div>

                        <div className="live-actions">
                          <button
                            className="btn-live-mode"
                            onClick={() => {
                              // Use the new HeadingsMap overlay with issues
                              openWithIssuesOverlay(result.url, result.heading_hierarchy, result.issues, result.score);
                            }}
                          >
                            <Eye size={16} />
                            เปิด Live Mode
                          </button>
                          
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="live-mode-instructions">
                    <h3>📖 วิธีใช้ Live Mode</h3>
                    <ol>
                      <li>คลิก "เปิด Live Mode" เพื่อเปิดเว็บไซต์ในแท็บใหม่</li>
                      <li>Script จะถูกคัดลอกอัตโนมัติ</li>
                      <li>วางใน Address Bar ของแท็บใหม่แล้วกด Enter</li>
                      <li>จะเห็นกรอบสีและ Panel แสดงคำแนะนำด้านขวา</li>
                    </ol>
                    
                    <div className="color-legend">
                      <h4>🎨 ความหมายของสี:</h4>
                      <div className="legend-item">
                        <span className="color-box red"></span>
                        <span>H1 - ควรมีเพียง 1 ต่อหน้า (Primary Topic)</span>
                      </div>
                      <div className="legend-item">
                        <span className="color-box orange"></span>
                        <span>H2 - ควรมี 2-5 แท็ก (Subtopics)</span>
                      </div>
                      <div className="legend-item">
                        <span className="color-box yellow"></span>
                        <span>H3 - หัวข้อย่อย</span>
                      </div>
                      <div className="legend-item">
                        <span className="color-box gray"></span>
                        <span>H4-H6 - รายละเอียดเพิ่มเติม</span>
                      </div>
                    </div>

                    <div className="bookmark-tip">
                      <AlertCircle size={16} />
                      <div>
                        <strong>💡 Pro Tip:</strong> บันทึก Script เป็น Bookmark เพื่อใช้ซ้ำได้ทุกเว็บไซต์!
                        <br />
                        1. คัดลอก Script → 2. Bookmark หน้าใดก็ได้ → 3. Edit Bookmark → 4. แทนที่ URL ด้วย Script
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div className="recommendations-section">
                  {results.results.map((result, idx) => (
                    <div key={idx} className="recommendation-card">
                      <div className="rec-header">
                        <h3>
                          <a href={result.url} target="_blank" rel="noopener noreferrer">
                            {new URL(result.url).pathname || '/'}
                          </a>
                        </h3>
                        <span className={`score-badge ${getScoreColor(result.score)}`}>
                          {result.score}/100
                        </span>
                      </div>
                      
                      {result.issues.length > 0 ? (
                        <div className="issues-list">
                          <h4>ปัญหาที่พบ:</h4>
                          {result.issues.map((issue, iIdx) => (
                            <div key={iIdx} className={`issue-item ${getIssueColor(issue.type)}`}>
                              <div className="issue-header">
                                {getIssueIcon(issue.type)}
                                <strong>{issue.message}</strong>
                              </div>
                              <div className="issue-suggestion">
                                <ChevronRight size={14} />
                                {issue.suggestion}
                              </div>
                              {issue.element && (
                                <div className="issue-element">
                                  <code>{issue.element}</code>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {result.recommendations.length > 0 ? (
                        <div className="recommendations-list">
                          <h4>คำแนะนำ:</h4>
                          <ul>
                            {result.recommendations.map((rec, rIdx) => (
                              <li key={rIdx}>
                                <AlertCircle size={16} />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="perfect-score">
                          <CheckCircle size={20} />
                          โครงสร้าง Heading ของคุณสมบูรณ์แบบ!
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HeadingAnalyzer;