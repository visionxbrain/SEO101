import { useState } from 'react';
import { Globe, Info, Link, FileText, CheckCircle, XCircle, Loader } from 'lucide-react';
import axios from 'axios';
import config from '../config';

function SitemapInput({ sitemapUrl, setSitemapUrl }) {
  const [localSitemapUrl, setLocalSitemapUrl] = useState('');
  const [useCustomSitemap, setUseCustomSitemap] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showError, setShowError] = useState(false);
  
  const handleToggle = (e) => {
    setUseCustomSitemap(e.target.checked);
    if (!e.target.checked) {
      setLocalSitemapUrl('');
      setSitemapUrl('');
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setLocalSitemapUrl(url);
    setTestResult(null);
    setShowError(false);
    // Don't update parent until tested
  };

  const applyExample = (value) => {
    setLocalSitemapUrl(value);
    setTestResult(null);
    setShowError(false);
  };

  const testSitemap = async () => {
    if (!localSitemapUrl) return;
    
    setTesting(true);
    setTestResult(null);
    setShowError(false);
    
    try {
      const response = await axios.post(config.endpoints.testSitemap, {
        sitemap_url: localSitemapUrl,
        sample_url: sitemapUrl ? sitemapUrl : 'https://example.com'
      });
      
      setTestResult(response.data);
      
      if (response.data.success) {
        // Only update parent if successful
        setSitemapUrl(localSitemapUrl);
      } else {
        setShowError(true);
        setSitemapUrl(''); // Clear parent sitemap
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: 'ไม่สามารถทดสอบ sitemap ได้',
        suggestion: 'ตรวจสอบการเชื่อมต่อและลองใหม่'
      });
      setShowError(true);
      setSitemapUrl('');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="sitemap-input-section">
      <div className="sitemap-toggle-container">
        <label className="sitemap-toggle">
          <input
            type="checkbox"
            checked={useCustomSitemap}
            onChange={handleToggle}
            className="toggle-checkbox"
          />
          <span className="toggle-slider"></span>
          <div className="toggle-label">
            <Globe size={18} />
            <span>กำหนด Sitemap URL เอง</span>
          </div>
        </label>
        
        <button 
          className="info-button"
          onClick={() => setShowInfo(!showInfo)}
          type="button"
        >
          <Info size={18} />
        </button>
      </div>

      {showInfo && (
        <div className="sitemap-info-box">
          <div className="info-content">
            <h4>📍 Sitemap URL คืออะไร?</h4>
            <p>Sitemap เป็นไฟล์ที่รวบรวม URL ทั้งหมดในเว็บไซต์ ระบบจะใช้ข้อมูลนี้เพื่อหา URL ที่เหมาะสมสำหรับการ redirect</p>
            <ul>
              <li>✅ หากไม่ระบุ: ใช้ /sitemap.xml อัตโนมัติ</li>
              <li>✅ ระบุเป็น path: /custom-sitemap.xml</li>
              <li>✅ ระบุ URL เต็ม: https://example.com/sitemap.xml</li>
            </ul>
          </div>
        </div>
      )}

      {useCustomSitemap && (
        <div className="sitemap-input-container">
          <div className="input-field-wrapper">
            <div className="input-icon">
              <Link size={18} />
            </div>
            <input
              type="text"
              className="sitemap-url-input"
              placeholder="กรอก Sitemap URL... เช่น /sitemap.xml"
              value={localSitemapUrl}
              onChange={handleUrlChange}
            />
          </div>
          
          <div className="quick-examples">
            <span className="examples-label">คลิกเพื่อใช้:</span>
            <div className="example-buttons">
              <button 
                className="example-btn" 
                onClick={() => applyExample('/sitemap.xml')}
                type="button"
              >
                <FileText size={14} />
                /sitemap.xml
              </button>
              <button 
                className="example-btn" 
                onClick={() => applyExample('/sitemap_index.xml')}
                type="button"
              >
                <FileText size={14} />
                /sitemap_index.xml
              </button>
              <button 
                className="example-btn" 
                onClick={() => applyExample('https://example.com/post-sitemap.xml')}
                type="button"
              >
                <Globe size={14} />
                URL เต็ม
              </button>
            </div>
          </div>

          {localSitemapUrl && (
            <div className="sitemap-test-section">
              <button 
                className="test-btn"
                onClick={testSitemap}
                disabled={testing}
                type="button"
              >
                {testing ? (
                  <>
                    <Loader size={16} className="spin" />
                    กำลังทดสอบ...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    ทดสอบ Sitemap
                  </>
                )}
              </button>
              
              {testResult && (
                <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                  {testResult.success ? (
                    <>
                      <div className="result-header">
                        <CheckCircle size={18} />
                        <span>Sitemap ใช้งานได้!</span>
                      </div>
                      <div className="result-details">
                        <p>พบ {testResult.total_items} รายการ</p>
                        {testResult.url_count > 0 && (
                          <p>• URLs: {testResult.url_count} รายการ</p>
                        )}
                        {testResult.sitemap_index_count > 0 && (
                          <p>• Sitemap Index: {testResult.sitemap_index_count} รายการ</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="result-header">
                        <XCircle size={18} />
                        <span>Sitemap มีปัญหา</span>
                      </div>
                      <div className="result-details">
                        <p className="error-message">{testResult.error}</p>
                        <p className="suggestion">💡 {testResult.suggestion}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          {showError && (
            <div className="sitemap-error-alert">
              <div className="alert-content">
                <XCircle size={20} />
                <div>
                  <p className="alert-title">ไม่สามารถใช้ Sitemap นี้ได้</p>
                  <p className="alert-desc">กรุณาเลือก sitemap path อื่น หรือปล่อยว่างเพื่อใช้ค่า default</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SitemapInput;