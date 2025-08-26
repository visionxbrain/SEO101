import { useState } from 'react';
import { Link, ExternalLink, Search, AlertCircle, CheckCircle, XCircle, Download, Globe } from 'lucide-react';
import './BlogLinkChecker.css';

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

  const handleCheck = async () => {
    if (!sitemapUrl.trim()) {
      setError('กรุณาใส่ URL ของ Sitemap');
      return;
    }

    setLoading(true);
    setChecking(true);
    setError(null);
    setResults(null);
    setLogs([]);
    setProgress({ status: 'กำลังเชื่อมต่อกับ Server...', current: 0, total: 100 });

    let eventSource = null;
    let reconnectAttempts = 0;
    const maxReconnects = 3;

    const connectEventSource = () => {
      try {
        eventSource = new EventSource(
          `http://localhost:8000/api/check-blog-links-stream?` + 
          new URLSearchParams({
            sitemap_url: sitemapUrl,
            check_external: checkExternal.toString(),
            max_workers: '5'  // Reduced for stability
          })
        );

        let lastEventTime = Date.now();
        
        eventSource.onopen = () => {
          console.log('EventSource connected');
          reconnectAttempts = 0;
        };

        eventSource.onmessage = (event) => {
          lastEventTime = Date.now();
          
          // Handle keep-alive messages
          if (event.data.trim().startsWith(':')) {
            return;
          }
          
          try {
            const data = JSON.parse(event.data);
            
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
                break;
                
              case 'log':
                setLogs(prev => {
                  const newLogs = [...prev];
                  // Keep only last 10 logs
                  if (newLogs.length > 10) {
                    newLogs.shift();
                  }
                  newLogs.push(`📝 ${data.message}`);
                  return newLogs;
                });
                break;
                
              case 'progress':
                setProgress(prev => ({ ...prev, current: data.progress }));
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
              
              case 'summary':
                // Pre-update summary before complete data
                setProgress({ status: 'กำลังสรุปผล...', current: data.progress, total: 100 });
                break;
                
              case 'complete':
                setResults(data);
                setProgress({ status: 'เสร็จสิ้น!', current: 100, total: 100 });
                setLogs(prev => [...prev, `✅ ตรวจสอบเสร็จสิ้น - พบลิงก์เสีย ${data.summary.broken_links} จาก ${data.summary.total_links_checked} ลิงก์`]);
                eventSource.close();
                setLoading(false);
                setChecking(false);
                break;
                
              case 'error':
                setError(data.message);
                eventSource.close();
                setLoading(false);
                setChecking(false);
                break;
            }
          } catch (parseError) {
            console.error('Error parsing event data:', parseError);
          }
        };

        eventSource.onerror = (err) => {
          console.error('EventSource error:', err);
          
          // Check if this is a connection issue that can be retried
          if (eventSource.readyState === EventSource.CLOSED) {
            if (reconnectAttempts < maxReconnects && checking) {
              reconnectAttempts++;
              setLogs(prev => [...prev, `⚠️ การเชื่อมต่อขาดหาย ลองเชื่อมต่อใหม่ครั้งที่ ${reconnectAttempts}/${maxReconnects}...`]);
              
              // Attempt to reconnect after a delay
              setTimeout(() => {
                if (checking) {
                  eventSource.close();
                  connectEventSource();
                }
              }, 2000 * reconnectAttempts);  // Exponential backoff
            } else {
              setError('การเชื่อมต่อขาดหาย หากต้องการลองใหม่ กรุณากดตรวจสอบอีกครั้ง');
              eventSource.close();
              setLoading(false);
              setChecking(false);
            }
          }
        };
        
        // Set up timeout monitoring
        const timeoutCheck = setInterval(() => {
          const timeSinceLastEvent = Date.now() - lastEventTime;
          if (timeSinceLastEvent > 30000 && checking) {  // 30 seconds timeout
            console.log('No events received for 30 seconds, attempting reconnect...');
            clearInterval(timeoutCheck);
            eventSource.close();
            
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
        
        // Clean up on unmount or when stopping
        return () => {
          clearInterval(timeoutCheck);
          if (eventSource) {
            eventSource.close();
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

  const exportResults = (format = 'csv', exportType = 'all') => {
    if (!results) return;

    let dataToExport = [];
    let filename = '';

    if (exportType === 'all') {
      // Export all links grouped by blog post
      dataToExport = results.results || [];
      filename = `all_links_report_${new Date().toISOString().split('T')[0]}`;
    } else {
      // Export only broken links
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
      // Export as JSON with grouped structure
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

              <button
                className="btn btn-primary btn-large"
                onClick={handleCheck}
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
                <p>ระบบจะตรวจสอบเฉพาะ URL ที่มี /blog/ ใน path จาก Sitemap ของคุณ</p>
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
                  setSitemapUrl('');
                  setError(null);
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
              <>
                <div className="no-issues">
                  <CheckCircle size={48} />
                  <h2>ไม่พบลิงก์ที่เสีย!</h2>
                  <p>ลิงก์ทั้งหมดในบทความบล็อกของคุณทำงานได้ปกติ</p>
                </div>

                {results.results && results.results.length > 0 && (
                  <div className="all-links-section">
                    <h2>
                      <Link size={20} />
                      รายการลิงก์ทั้งหมดที่ตรวจสอบ ({results.results.length})
                    </h2>

                    {/* Group links by blog post */}
                    {results.blog_urls && results.blog_urls.map((blogUrl, blogIdx) => {
                      const blogLinks = results.results.filter(link => link.found_in === blogUrl);
                      if (blogLinks.length === 0) return null;
                      
                      const internalLinks = blogLinks.filter(l => l.link_type === 'internal');
                      const externalLinks = blogLinks.filter(l => l.link_type === 'external');
                      const brokenLinks = blogLinks.filter(l => l.is_broken);
                      
                      return (
                        <div key={blogIdx} className="blog-post-links">
                          <div className="blog-post-header">
                            <div className="blog-post-title">
                              <span className="blog-number">บทความที่ {blogIdx + 1}</span>
                              <a href={blogUrl} target="_blank" rel="noopener noreferrer">
                                {new URL(blogUrl).pathname}
                                <ExternalLink size={14} />
                              </a>
                            </div>
                            <div className="blog-post-stats">
                              <span className="stat-badge">
                                ภายใน: {internalLinks.length}
                              </span>
                              <span className="stat-badge">
                                ภายนอก: {externalLinks.length}
                              </span>
                              {brokenLinks.length > 0 && (
                                <span className="stat-badge error">
                                  เสีย: {brokenLinks.length}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="links-table-wrapper">
                            <table className="all-links-table">
                              <thead>
                                <tr>
                                  <th>URL</th>
                                  <th>ประเภท</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {blogLinks.map((link, idx) => (
                                  <tr key={idx} className={link.is_broken ? 'broken-row' : ''}>
                                    <td className="link-url">
                                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                                        {link.url.length > 80 ? link.url.substring(0, 80) + '...' : link.url}
                                        <ExternalLink size={14} />
                                      </a>
                                    </td>
                                    <td>
                                      <span className={`link-type ${link.link_type}`}>
                                        {link.link_type === 'internal' ? 'ภายใน' : 'ภายนอก'}
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`status-badge ${link.is_broken ? 'status-error' : 'status-ok'}`}>
                                        {link.status_code || (link.error ? 'Error' : 'OK')}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BlogLinkChecker;