import { useState, useEffect } from 'react';
import { Code, Search, AlertCircle, CheckCircle, XCircle, Download, TrendingUp, FileCode, Award, FileText, Globe, ExternalLink, ArrowUp, WifiOff } from 'lucide-react';
import { API_URL, handleApiError, testConnection } from '../../config/api';
import './SchemaChecker.css';

function SchemaChecker() {
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [inputMode, setInputMode] = useState('urls'); // 'urls' or 'sitemap'
  const [urlLimit, setUrlLimit] = useState(50); // Default limit for sitemap
  const [progress, setProgress] = useState({ status: '', current: 0, total: 100 });
  const [logs, setLogs] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // Test connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      const result = await testConnection();
      if (!result.success) {
        setConnectionError(true);
        setError(result.error.message);
      } else {
        setConnectionError(false);
      }
    };
    checkConnection();
  }, []);

  const handleCheck = async () => {
    if (inputMode === 'sitemap') {
      // Use streaming for sitemap
      const sitemapUrl = urls.trim();
      if (!sitemapUrl) {
        setError('กรุณาใส่ URL ของ sitemap.xml');
        return;
      }
      
      setLoading(true);
      setStreaming(true);
      setError(null);
      setResults(null);
      setLogs([]);
      setProgress({ status: 'กำลังเชื่อมต่อกับ Server...', current: 0, total: 100 });

      try {
        const eventSource = new EventSource(
          `${API_URL}/api/check-schema-markup-stream?` + 
          new URLSearchParams({
            sitemap_url: sitemapUrl,
            limit: urlLimit.toString(),
            max_workers: '5'
          })
        );

        eventSource.onmessage = (event) => {
          if (event.data.trim().startsWith(':')) {
            return; // Keep-alive message
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
                if (data.total_urls) {
                  setLogs(prev => [...prev, `✓ ${data.message}`]);
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
                break;
                
              case 'found':
                setLogs(prev => {
                  const newLogs = [...prev];
                  if (newLogs.length > 15) {
                    newLogs.shift();
                  }
                  newLogs.push(`✅ พบ Schema: ${data.url.substring(data.url.lastIndexOf('/') + 1)} (${data.schema_count} schemas)`);
                  return newLogs;
                });
                break;
                
              case 'not_found':
                setLogs(prev => {
                  const newLogs = [...prev];
                  if (newLogs.length > 15) {
                    newLogs.shift();
                  }
                  newLogs.push(`⚠️ ไม่พบ Schema: ${data.url.substring(data.url.lastIndexOf('/') + 1)}`);
                  return newLogs;
                });
                break;
                
              case 'complete':
                setResults(data);
                setProgress({ status: 'เสร็จสิ้น!', current: 100, total: 100 });
                setLogs(prev => [...prev, `✅ ตรวจสอบเสร็จสิ้น - พบ Schema ${data.summary.with_schema}/${data.summary.total_urls} URLs`]);
                eventSource.close();
                setLoading(false);
                setStreaming(false);
                break;
                
              case 'error':
                setError(data.message);
                eventSource.close();
                setLoading(false);
                setStreaming(false);
                break;
            }
          } catch (parseError) {
            console.error('Error parsing event data:', parseError);
          }
        };

        eventSource.onerror = (err) => {
          console.error('EventSource error:', err);
          setError('การเชื่อมต่อขาดหาย กรุณาลองใหม่');
          eventSource.close();
          setLoading(false);
          setStreaming(false);
        };
        
      } catch (err) {
        const errorDetails = handleApiError(err);
        setError(errorDetails.message);
        setLoading(false);
        setStreaming(false);
      }
      
    } else {
      // Manual URLs mode - use normal API
      const urlList = urls.split('\n').map(url => url.trim()).filter(url => url);
      if (urlList.length === 0) {
        setError('กรุณาใส่ URL อย่างน้อย 1 รายการ');
        return;
      }
      
      const requestData = {
        urls: urlList,
        max_workers: 5
      };

      setLoading(true);
      setError(null);
      setResults(null);

      try {
        const endpoint = API_URL.includes('netlify') ? `${API_URL}/check-schema-markup` : `${API_URL}/api/check-schema-markup`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'เกิดข้อผิดพลาดในการตรวจสอบ');
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        const errorDetails = handleApiError(err);
        setError(errorDetails.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const exportResults = (format = 'json') => {
    if (!results) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const source = results.summary.source === 'sitemap' ? 'sitemap' : 'manual';
    const filename = `schema_report_${source}_${timestamp}`;

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
      // CSV export with additional info and generated schemas
      const csvHeader = ['URL', 'Has Schema', 'Schema Types', 'Count', 'AI Optimized', 'Score', 'Recommendations', 'Generated Schema Script'];
      
      // Add summary info at the top
      const summaryInfo = [
        ['Schema Markup Report'],
        ['Generated:', new Date().toLocaleString('th-TH')],
        ['Source:', results.summary.source === 'sitemap' ? `Sitemap: ${results.summary.sitemap_url}` : 'Manual URLs'],
        ['Total URLs:', results.summary.total_urls],
        ['With Schema:', results.summary.with_schema],
        ['Without Schema:', results.summary.without_schema],
        ['Average Score:', results.summary.average_score],
        [''],
        csvHeader
      ];
      
      const csvData = results.results.map(r => {
        // Format generated schema as a script tag if available
        let schemaScript = '';
        if (r.generated_schema) {
          const schemaJson = JSON.stringify(r.generated_schema, null, 2);
          schemaScript = `<script type="application/ld+json">\n${schemaJson}\n</script>`;
        }
        
        return [
          r.url,
          r.has_schema ? 'Yes' : 'No',
          r.schema_types.join(', ') || 'None',
          r.schema_count,
          r.ai_search_optimized ? 'Yes' : 'No',
          r.score,
          r.recommendations.join('; ') || 'No recommendations',
          schemaScript || 'N/A'
        ];
      });

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
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'ดีเยี่ยม';
    if (score >= 60) return 'ดี';
    if (score >= 40) return 'พอใช้';
    return 'ต้องปรับปรุง';
  };

  return (
    <div className="schema-checker">
      <div className="checker-header">
        <div className="header-content">
          <div className="header-icon">
            <Code size={24} />
          </div>
          <div>
            <h1>Schema Markup Checker</h1>
            <p>ตรวจสอบ Schema.org Markup สำหรับ AI Search Optimization</p>
          </div>
        </div>
      </div>

      <div className="checker-content">
        {!results ? (
          <div className="input-section">
            <div className="url-input-card">
              <div className="card-header">
                <FileCode size={20} />
                <h3>เลือกวิธีการตรวจสอบ Schema Markup</h3>
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
                    <span>ระบบจะดึง URLs ทั้งหมดจาก sitemap และตรวจสอบ Schema ทุกหน้า</span>
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
                    ตรวจสอบ Schema
                  </>
                )}
              </button>

              {streaming && progress.status && (
                <div className="progress-container">
                  <div className="progress-status">{progress.status}</div>
                  <div className="progress-bar-wrapper">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${progress.current}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {progress.current}%
                    </span>
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
                  <p>ระบบจะตรวจสอบ:</p>
                  <ul>
                    <li>JSON-LD, Microdata, และ RDFa Schema</li>
                    <li>ความเหมาะสมสำหรับ AI Search (Google, Bing)</li>
                    <li>คำแนะนำในการปรับปรุง Schema</li>
                    <li>คะแนนความสมบูรณ์ของ Schema</li>
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
                  <FileCode size={20} />
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
                  <div className="card-value">{results.summary.with_schema}</div>
                  <div className="card-label">มี Schema</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon purple">
                  <TrendingUp size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">{results.summary.ai_optimized}</div>
                  <div className="card-label">AI Optimized</div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon orange">
                  <Award size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">{results.summary.average_score}</div>
                  <div className="card-label">คะแนนเฉลี่ย</div>
                </div>
              </div>
            </div>

            {/* Common Schema Types */}
            {Object.keys(results.summary.common_types).length > 0 && (
              <div className="common-types">
                <h3>Schema Types ที่พบบ่อย</h3>
                <div className="type-badges">
                  {Object.entries(results.summary.common_types).map(([type, count]) => (
                    <span key={type} className="type-badge">
                      {type} ({count})
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
                className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                รายละเอียด Schema
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
                          <span className="stat-label">Schema:</span>
                          <span className={result.has_schema ? 'has-schema' : 'no-schema'}>
                            {result.has_schema ? `มี (${result.schema_count})` : 'ไม่มี'}
                          </span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">AI Ready:</span>
                          <span className={result.ai_search_optimized ? 'ai-ready' : 'not-ready'}>
                            {result.ai_search_optimized ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>

                      {result.schema_types.length > 0 && (
                        <div className="schema-types">
                          {result.schema_types.slice(0, 3).map((type, i) => (
                            <span key={i} className="mini-badge">{type}</span>
                          ))}
                          {result.schema_types.length > 3 && (
                            <span className="mini-badge">+{result.schema_types.length - 3}</span>
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
                          {result.score === 0 ? '⚠️ ' : ''}
                          {getScoreLabel(result.score)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'details' && (
                <div className="details-section">
                  {results.results.map((result, idx) => (
                    <div key={idx} className="detail-card">
                      <h3>
                        <a href={result.url} target="_blank" rel="noopener noreferrer" style={{display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'inherit', textDecoration: 'none'}}>
                          {result.url}
                          <ExternalLink size={14} style={{opacity: 0.6}} />
                        </a>
                      </h3>
                      
                      {result.schemas.length > 0 ? (
                        result.schemas.map((schema, sIdx) => (
                          <div key={sIdx} className="schema-detail">
                            <div className="schema-header">
                              <span className="schema-format">{schema.format}</span>
                              <span className="schema-type">{schema.type}</span>
                            </div>
                            <pre className="schema-data">
                              {JSON.stringify(schema.data, null, 2)}
                            </pre>
                          </div>
                        ))
                      ) : (
                        <p className="no-schema-message">ไม่พบ Schema Markup ใน URL นี้</p>
                      )}
                      
                      {/* Always show generated schema for comparison */}
                      {result.generated_schema && (
                        <div className={`generated-schema ${result.has_schema && result.score < 80 ? 'upgrade-recommended' : ''}`}>
                          {result.has_schema && result.score < 80 && (
                            <div className="upgrade-alert">
                              <ArrowUp size={20} />
                              <div>
                                <strong>🎯 แนะนำให้อัปเกรด Schema!</strong>
                                <p>Schema ของเราดีกว่าและครอบคลุมมากกว่า - คัดลอกโค้ดด้านล่างไปแทนที่ Schema เดิมในเว็บของคุณ</p>
                              </div>
                            </div>
                          )}
                          <div className="generated-header">
                            <Award size={20} />
                            <h4>
                              {result.has_schema 
                                ? result.score < 80 
                                  ? '🚀 Schema ใหม่ที่ดีกว่า (แนะนำให้ใช้แทนของเดิม)'
                                  : '✨ Schema ที่ปรับปรุงแล้ว (เปรียบเทียบกับของเดิม)'
                                : '📝 Schema Script ที่แนะนำสำหรับหน้านี้'}
                            </h4>
                            {result.has_schema && result.score < 80 && (
                              <span className="upgrade-badge">
                                <ArrowUp size={12} />
                                อัปเกรดเลย!
                              </span>
                            )}
                          </div>
                          <p className="generated-desc">
                            {result.has_schema
                              ? result.score < 80 
                                ? '⚠️ Schema เดิมของคุณได้ Score เพียง ' + result.score + '/100 - คัดลอก Schema ใหม่ด้านล่างไปแทนที่เพื่อเพิ่ม Score เป็น ~95/100:'
                                : 'Schema ด้านล่างได้รับการปรับปรุงให้ดีขึ้น คุณสามารถเปรียบเทียบและเลือกใช้ได้:'
                              : 'คัดลอกโค้ดด้านล่างไปวางใน <head> ของหน้าเว็บ:'}
                          </p>
                          {result.has_schema && result.score < 80 && (
                            <div className="improvement-note">
                              <TrendingUp size={16} />
                              <span>
                                <strong>การปรับปรุงที่สำคัญ:</strong> Schema ใหม่มี E-E-A-T signals, AI Search optimization, 
                                Breadcrumbs, FAQ Schema และ structured data ที่ครบถ้วนกว่า
                              </span>
                            </div>
                          )}
                          <div className="schema-code">
                            <button 
                              className={`copy-btn ${result.has_schema && result.score < 80 ? 'copy-upgrade' : ''}`}
                              onClick={() => {
                                const script = `<script type="application/ld+json">\n${JSON.stringify(result.generated_schema, null, 2)}\n</script>`;
                                navigator.clipboard.writeText(script);
                                alert(result.has_schema && result.score < 80 
                                  ? '✅ คัดลอก Schema ใหม่แล้ว! นำไปแทนที่ Schema เดิมในเว็บของคุณ' 
                                  : 'คัดลอก Schema Script แล้ว!');
                              }}
                            >
                              <FileCode size={16} />
                              {result.has_schema && result.score < 80 ? 'คัดลอกเพื่ออัปเกรด' : 'Copy Script'}
                            </button>
                            <pre className="schema-script">
{`<script type="application/ld+json">
${JSON.stringify(result.generated_schema, null, 2)}
</script>`}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div className="recommendations-section">
                  {results.results.map((result, idx) => (
                    <div key={idx} className="recommendation-card">
                      <div className="rec-header">
                        <h3>
                          <a href={result.url} target="_blank" rel="noopener noreferrer" style={{color: 'inherit', textDecoration: 'none'}}>
                            {new URL(result.url).pathname || '/'}
                          </a>
                        </h3>
                        <span className={`score-badge ${getScoreColor(result.score)}`}>
                          {result.score}/100
                        </span>
                      </div>
                      
                      {result.recommendations.length > 0 ? (
                        <ul className="recommendations-list">
                          {result.recommendations.map((rec, rIdx) => (
                            <li key={rIdx}>
                              <AlertCircle size={16} />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="perfect-score">
                          <CheckCircle size={20} />
                          Schema Markup ของคุณอยู่ในสภาพดีเยี่ยม!
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

export default SchemaChecker;