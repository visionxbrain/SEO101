import React, { useState, useEffect } from 'react';
import { Link, ExternalLink, Search, AlertCircle, CheckCircle, XCircle, Download, Globe, Play, Pause, RotateCcw } from 'lucide-react';
import './BlogLinkChecker.css';
import config from '../../config';

function BlogLinkChecker() {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [checkExternal, setCheckExternal] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [progress, setProgress] = useState({ status: '', current: 0, total: 0 });
  const [logs, setLogs] = useState([]);
  const [resumeToken, setResumeToken] = useState(null);
  const [savedProgress, setSavedProgress] = useState(null);
  const [eventSource, setEventSource] = useState(null);
  const [blogPath, setBlogPath] = useState('/blog/');  // Custom path for blog URLs

  // Check for saved progress when sitemap URL changes
  useEffect(() => {
    if (sitemapUrl) {
      const savedToken = localStorage.getItem(`resume_${sitemapUrl}`);
      const savedProgressData = localStorage.getItem(`progress_${sitemapUrl}`);
      
      if (savedToken && savedProgressData) {
        try {
          const progressData = JSON.parse(savedProgressData);
          setResumeToken(savedToken);
          setSavedProgress({
            token: savedToken,
            progress: progressData.progress || 0,
            message: progressData.message || 'พบความคืบหน้าที่บันทึกไว้'
          });
        } catch (e) {
          console.error('Error loading saved progress:', e);
        }
      }
    }
  }, [sitemapUrl]);

  const handleCheck = async (useResumeToken = false) => {
    if (!sitemapUrl.trim()) {
      setError('กรุณาใส่ URL ของ Sitemap');
      return;
    }

    setLoading(true);
    setChecking(true);
    setError(null);
    
    // Don't clear results if resuming
    if (!useResumeToken) {
      setResults(null);
      setLogs([]);
      setProgress({ status: 'กำลังเชื่อมต่อกับ Server...', current: 0, total: 100 });
    } else {
      setProgress(prev => ({ ...prev, status: 'กำลังดำเนินการต่อ...' }));
      setLogs(prev => [...prev, '🔄 กำลังดำเนินการต่อจากที่ค้างไว้...']);
    }

    let newEventSource = null;
    let reconnectAttempts = 0;
    const maxReconnects = 3;
    let lastEventTime = Date.now();

    const connectEventSource = () => {
      try {
        const params = {
          sitemap_url: sitemapUrl,
          check_external: checkExternal.toString(),
          max_workers: '5',
          blog_path: blogPath || '/blog/'
        };
        
        // Add resume token if available
        if (useResumeToken && resumeToken) {
          params.resume_token = resumeToken;
        }
        
        newEventSource = new EventSource(
          `${config.endpoints.checkBlogLinksStream}?` + 
          new URLSearchParams(params)
        );
        
        setEventSource(newEventSource);

        newEventSource.onopen = () => {
          console.log('EventSource connected');
          reconnectAttempts = 0;
          setProgress(prev => ({ ...prev, status: 'เชื่อมต่อสำเร็จ' }));
        };

        newEventSource.onmessage = (event) => {
          lastEventTime = Date.now();
          
          // Handle keep-alive messages
          if (event.data.trim().startsWith(':')) {
            console.log('Keep-alive received');
            return;
          }
          
          console.log('Event received:', event.data.substring(0, 100));
          
          try {
            const data = JSON.parse(event.data);
            console.log('Event type:', data.type, 'Progress:', data.progress);
            
            switch(data.type) {
              case 'status':
                setProgress({ 
                  status: data.message, 
                  current: data.progress, 
                  total: 100 
                });
                if (data.total_blogs) {
                  setLogs(prev => [...prev, `✓ ${data.message}`]);
                }
                // Save resume token if provided
                if (data.resume_token) {
                  setResumeToken(data.resume_token);
                  localStorage.setItem(`resume_${sitemapUrl}`, data.resume_token);
                  localStorage.setItem(`progress_${sitemapUrl}`, JSON.stringify({
                    progress: data.progress,
                    message: data.message
                  }));
                }
                break;
                
              case 'log':
                setLogs(prev => {
                  const newLogs = [...prev];
                  if (newLogs.length > 10) {
                    newLogs.shift();
                  }
                  newLogs.push(`📝 ${data.message}`);
                  return newLogs;
                });
                break;
                
              case 'progress':
                setProgress(prev => ({ ...prev, current: data.progress }));
                // Update saved progress
                if (resumeToken) {
                  localStorage.setItem(`progress_${sitemapUrl}`, JSON.stringify({
                    progress: data.progress,
                    message: progress.status
                  }));
                }
                break;
                
              case 'broken_found':
                setLogs(prev => {
                  const newLogs = [...prev];
                  if (newLogs.length > 15) {
                    newLogs.shift();
                  }
                  newLogs.push(`❌ พบลิงก์เสีย: ${data.link.substring(0, 50)}... (${data.status})`);
                  return newLogs;
                });
                break;
                
              case 'warning':
                setLogs(prev => [...prev, `⚠️ ${data.message}`]);
                break;
              
              case 'saved':
                // Progress saved notification
                setLogs(prev => [...prev, `💾 ${data.message}`]);
                setSavedProgress({
                  token: data.resume_token,
                  progress: progress.current,
                  message: 'ความคืบหน้าถูกบันทึกไว้'
                });
                break;
              
              case 'summary':
                // Pre-update summary before complete data
                setProgress({ status: 'กำลังสรุปผล...', current: data.progress, total: 100 });
                break;
                
              case 'complete':
                setResults(data);
                setProgress({ status: 'เสร็จสิ้น!', current: 100, total: 100 });
                setLogs(prev => [...prev, `✅ ตรวจสอบเสร็จสิ้น - พบลิงก์เสีย ${data.summary.broken_links} จาก ${data.summary.total_links_checked} ลิงก์`]);
                newEventSource.close();
                setLoading(false);
                setChecking(false);
                // Clear saved resume token
                setResumeToken(null);
                setSavedProgress(null);
                localStorage.removeItem(`resume_${sitemapUrl}`);
                localStorage.removeItem(`progress_${sitemapUrl}`);
                break;
                
              case 'error':
                setError(data.message);
                newEventSource.close();
                setLoading(false);
                setChecking(false);
                // Keep resume token for retry
                if (resumeToken) {
                  setSavedProgress({
                    token: resumeToken,
                    progress: progress.current,
                    message: 'เกิดข้อผิดพลาด - สามารถดำเนินการต่อได้'
                  });
                }
                break;
            }
          } catch (parseError) {
            console.error('Error parsing event data:', parseError);
          }
        };

        newEventSource.onerror = (err) => {
          console.error('EventSource error:', err);
          
          // Check if this is a connection issue that can be retried
          if (newEventSource.readyState === EventSource.CLOSED) {
            if (reconnectAttempts < maxReconnects && checking) {
              reconnectAttempts++;
              setLogs(prev => [...prev, `⚠️ การเชื่อมต่อขาดหาย ลองเชื่อมต่อใหม่ครั้งที่ ${reconnectAttempts}/${maxReconnects}...`]);
              
              // Attempt to reconnect after a delay
              setTimeout(() => {
                if (checking) {
                  newEventSource.close();
                  connectEventSource();
                }
              }, 2000 * reconnectAttempts);  // Exponential backoff
            } else {
              setError('การเชื่อมต่อขาดหาย หากต้องการลองใหม่ กรุณากดตรวจสอบอีกครั้ง');
              newEventSource.close();
              setLoading(false);
              setChecking(false);
              // Save progress for resume
              if (resumeToken) {
                setSavedProgress({
                  token: resumeToken,
                  progress: progress.current,
                  message: 'การเชื่อมต่อขาดหาย - สามารถดำเนินการต่อได้'
                });
              }
            }
          }
        };
        
        // Set up timeout monitoring
        const timeoutCheck = setInterval(() => {
          const timeSinceLastEvent = Date.now() - lastEventTime;
          if (timeSinceLastEvent > 30000 && checking) {  // 30 seconds timeout
            console.log('No events received for 30 seconds, attempting reconnect...');
            clearInterval(timeoutCheck);
            newEventSource.close();
            
            if (reconnectAttempts < maxReconnects) {
              reconnectAttempts++;
              connectEventSource();
            } else {
              setError('Connection timeout - ลองใหม่อีกครั้ง');
              setLoading(false);
              setChecking(false);
            }
          }
        }, 5000);  // Check every 5 seconds
        
        // Store cleanup function
        return () => {
          clearInterval(timeoutCheck);
          if (newEventSource) {
            newEventSource.close();
          }
        };
      } catch (err) {
        setError(err.message || 'ไม่สามารถเชื่อมต่อกับ Server ได้');
        setLoading(false);
        setChecking(false);
      }
    };
    
    connectEventSource();
  };
  
  // Stop checking function
  const handleStop = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setChecking(false);
    setLoading(false);
    setProgress(prev => ({ ...prev, status: 'หยุดการตรวจสอบ' }));
    setLogs(prev => [...prev, '⏸️ หยุดการตรวจสอบ - ความคืบหน้าถูกบันทึกไว้']);
  };

  // Clear saved progress
  const handleClearProgress = () => {
    setSavedProgress(null);
    setResumeToken(null);
    localStorage.removeItem(`resume_${sitemapUrl}`);
    localStorage.removeItem(`progress_${sitemapUrl}`);
    setLogs([]);
    setProgress({ status: '', current: 0, total: 0 });
  };

  const exportResults = (format = 'csv', exportType = 'all') => {
    if (!results) return;

    let dataToExport = [];
    let filename = '';

    if (exportType === 'all') {
      dataToExport = results.results || [];
      filename = `all_links_report_${new Date().toISOString().split('T')[0]}`;
    } else {
      dataToExport = results.broken_links || [];
      filename = `broken_links_report_${new Date().toISOString().split('T')[0]}`;
    }

    if (format === 'csv') {
      const csvContent = [
        ['Blog Post', 'Blog Post URL', 'Link URL', 'Link Type', 'Status', 'Error'],
        ...dataToExport.map(link => {
          const blogPath = new URL(link.found_in).pathname;
          return [
            blogPath,
            link.found_in,
            link.url,
            link.link_type === 'internal' ? 'ภายใน' : 'ภายนอก',
            link.status_code || (link.error ? 'Error' : 'OK'),
            link.error || ''
          ];
        })
      ];

      const csv = csvContent.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonData = {
        summary: results.summary,
        blog_posts: results.blog_urls?.map(blogUrl => {
          const blogLinks = dataToExport.filter(link => link.found_in === blogUrl);
          return {
            blog_url: blogUrl,
            total_links: blogLinks.length,
            internal_links: blogLinks.filter(l => l.link_type === 'internal').length,
            external_links: blogLinks.filter(l => l.link_type === 'external').length,
            broken_links: blogLinks.filter(l => l.is_broken).length,
            links: blogLinks
          };
        }) || []
      };

      const json = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="blog-link-checker">
      <div className="checker-header">
        <div className="header-content">
          <div className="header-icon">
            <Link size={24} />
          </div>
          <div>
            <h1>Blog Link Checker</h1>
            <p>ตรวจสอบลิงก์ที่เสียในบทความบล็อกจาก Sitemap</p>
          </div>
        </div>
      </div>

      <div className="checker-content">
        {!results ? (
          <div className="input-section">
            <div className="sitemap-input-card">
              <div className="card-header">
                <Globe size={20} />
                <h3>ใส่ URL ของ Sitemap</h3>
              </div>
              
              <div className="input-group">
                <input
                  type="text"
                  className="sitemap-input"
                  placeholder="https://example.com/sitemap.xml"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="options-group">
                <div className="path-input-group">
                  <label htmlFor="blog-path">Path ที่ต้องการตรวจสอบ:</label>
                  <input
                    id="blog-path"
                    type="text"
                    className="path-input"
                    placeholder="/blog/"
                    value={blogPath}
                    onChange={(e) => setBlogPath(e.target.value)}
                    disabled={loading}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '14px',
                      width: '150px',
                      marginLeft: '8px'
                    }}
                  />
                  <span style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)', 
                    marginLeft: '8px'
                  }}>
                    (เช่น /articles/, /news/, /posts/)
                  </span>
                </div>
                
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={checkExternal}
                    onChange={(e) => setCheckExternal(e.target.checked)}
                    disabled={loading}
                  />
                  <span>ตรวจสอบลิงก์ภายนอกด้วย</span>
                </label>
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              
              {savedProgress && !loading && (
                <div className="resume-section">
                  <div className="resume-info">
                    <AlertCircle size={16} className="info-icon" />
                    <div className="resume-details">
                      <span className="resume-title">{savedProgress.message}</span>
                      <span className="resume-progress">ความคืบหน้า: {savedProgress.progress || 0}%</span>
                    </div>
                  </div>
                  <div className="resume-actions">
                    <button
                      className="btn btn-success"
                      onClick={() => handleCheck(true)}
                    >
                      <Play size={16} />
                      ดำเนินการต่อ
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={handleClearProgress}
                    >
                      <RotateCcw size={16} />
                      เริ่มใหม่
                    </button>
                  </div>
                </div>
              )}

              <div className="button-group">
                <button
                  className="btn btn-primary btn-large"
                  onClick={() => handleCheck(false)}
                  disabled={loading || !sitemapUrl.trim()}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      กำลังตรวจสอบ...
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      เริ่มตรวจสอบ
                    </>
                  )}
                </button>
                
                {checking && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleStop}
                  >
                    <Pause size={16} />
                    หยุดชั่วคราว
                  </button>
                )}
              </div>

              {loading && progress.status && (
                <div className="progress-container">
                  <div className="progress-status">{progress.status}</div>
                  <div className="progress-bar-wrapper">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${progress.current}%` }}
                      ></div>
                    </div>
                    {progress.total > 0 && (
                      <span className="progress-text">
                        {progress.current}%
                      </span>
                    )}
                  </div>
                  
                  {logs.length > 0 && (
                    <div className="logs-container">
                      <div className="logs-header">📋 บันทึกการทำงาน</div>
                      <div className="logs-list">
                        {logs.map((log, idx) => (
                          <div key={idx} className="log-item">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="info-box">
                <AlertCircle size={16} />
                <div>
                  <p>ระบบจะตรวจสอบเฉพาะ URL ที่มี "{blogPath || '/blog/'}" ใน path จาก Sitemap ของคุณ</p>
                  <p style={{marginTop: '8px', fontSize: '12px', opacity: 0.8}}>
                    💡 Tip: หาก sitemap มีขนาดใหญ่ (มากกว่า 100 URLs) การตรวจสอบอาจใช้เวลานาน
                  </p>
                </div>
              </div>
              
              {/* Quick test button */}
              <button
                className="btn btn-outline"
                style={{marginTop: '12px'}}
                onClick={() => {
                  setSitemapUrl('https://example.com/sitemap.xml');
                  setCheckExternal(false);
                }}
              >
                ใช้ตัวอย่าง Sitemap ทดสอบ
              </button>
            </div>
          </div>
        ) : (
          <div className="results-section">
            <div className="results-header">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setResults(null);
                  setSitemapUrl('');
                  setError(null);
                  handleClearProgress();
                }}
              >
                ตรวจสอบใหม่
              </button>
              
              <div className="export-buttons">
                <div className="export-group">
                  <span className="export-label">Export ทั้งหมด:</span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => exportResults('csv', 'all')}
                    disabled={!results.results || results.results.length === 0}
                  >
                    <Download size={16} />
                    CSV
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => exportResults('json', 'all')}
                    disabled={!results.results || results.results.length === 0}
                  >
                    <Download size={16} />
                    JSON
                  </button>
                </div>
                {results.broken_links && results.broken_links.length > 0 && (
                  <div className="export-group">
                    <span className="export-label">Export เฉพาะที่เสีย:</span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => exportResults('csv', 'broken')}
                    >
                      <Download size={16} />
                      CSV
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => exportResults('json', 'broken')}
                    >
                      <Download size={16} />
                      JSON
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-icon blue">
                  <Globe size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">{results.summary.total_blog_posts}</div>
                  <div className="card-label">บทความทั้งหมด</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon purple">
                  <Link size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">{results.summary.total_links_checked}</div>
                  <div className="card-label">ลิงก์ที่ตรวจสอบ</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon green">
                  <CheckCircle size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">{results.summary.working_links}</div>
                  <div className="card-label">ลิงก์ที่ใช้งานได้</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon red">
                  <XCircle size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">{results.summary.broken_links}</div>
                  <div className="card-label">ลิงก์ที่เสีย</div>
                </div>
              </div>
            </div>

            {results.broken_links && results.broken_links.length > 0 && (
              <div className="broken-links-section">
                <h2>
                  <AlertCircle size={20} />
                  ลิงก์ที่เสีย ({results.broken_links.length})
                </h2>

                <div className="posts-with-issues">
                  {Object.entries(results.broken_by_post).map(([postUrl, links]) => (
                    <div key={postUrl} className="post-card">
                      <div 
                        className="post-header"
                        onClick={() => setSelectedPost(selectedPost === postUrl ? null : postUrl)}
                      >
                        <div className="post-info">
                          <h3>{new URL(postUrl).pathname}</h3>
                          <span className="post-url">{postUrl}</span>
                        </div>
                        <div className="post-stats">
                          <span className="badge badge-error">{links.length} ลิงก์เสีย</span>
                          <span className={`expand-icon ${selectedPost === postUrl ? 'expanded' : ''}`}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {selectedPost === postUrl && (
                        <div className="post-links">
                          <table className="links-table">
                            <thead>
                              <tr>
                                <th>URL ที่เสีย</th>
                                <th>ประเภท</th>
                                <th>Status</th>
                                <th>ข้อผิดพลาด</th>
                              </tr>
                            </thead>
                            <tbody>
                              {links.map((link, idx) => (
                                <tr key={idx}>
                                  <td className="link-url">
                                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                                      {link.url}
                                      <ExternalLink size={14} />
                                    </a>
                                  </td>
                                  <td>
                                    <span className={`link-type ${link.link_type}`}>
                                      {link.link_type === 'internal' ? 'ภายใน' : 'ภายนอก'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="status-code">
                                      {link.status_code || 'Error'}
                                    </span>
                                  </td>
                                  <td className="error-text">
                                    {link.error || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.broken_links && results.broken_links.length === 0 && (
              <div className="no-issues">
                <CheckCircle size={48} />
                <h2>ไม่พบลิงก์ที่เสีย!</h2>
                <p>ลิงก์ทั้งหมดในบทความบล็อกของคุณทำงานได้ปกติ</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BlogLinkChecker;