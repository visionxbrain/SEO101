import { useState, useEffect } from 'react';
import axios from 'axios';
import UploadForm from './UploadForm';
import Results from './Results';
import SitemapInput from './SitemapInput';
import ErrorDetails from './ErrorDetails';

function URLChecker() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

  const handleSubmit = async (urls) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setProgress(0);
    
    // Process in batches for better progress tracking
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < urls.length; i += batchSize) {
      batches.push(urls.slice(i, i + batchSize));
    }
    
    setTotalBatches(batches.length);
    const allResults = [];
    
    try {
      for (let i = 0; i < batches.length; i++) {
        setCurrentBatch(i + 1);
        const response = await axios.post('http://localhost:8000/api/check-urls', {
          urls: batches[i],
          sitemap_url: sitemapUrl
        });
        
        allResults.push(...response.data.results);
        setProgress(Math.round(((i + 1) / batches.length) * 100));
      }
      
      // Compile final results
      const summary = {
        total: allResults.length,
        status_404: allResults.filter(r => r.is_404).length,
        status_200: allResults.filter(r => r.status_code === 200).length,
        errors: allResults.filter(r => r.error).length,
        with_suggestions: allResults.filter(r => r.suggested_redirect).length
      };
      
      setResults({ results: allResults, summary });
    } catch (err) {
      console.error('Error:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('เกิดข้อผิดพลาดในการตรวจสอบ URL');
      }
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  return (
    <div className="url-checker">
      <div className="checker-header">
        <h2 className="checker-title">404 URL Checker</h2>
        <p className="checker-subtitle">
          ตรวจสอบ URL ที่เสียหายและรับคำแนะนำการ redirect อัตโนมัติ
        </p>
      </div>

      <div className="checker-content">
        <div className="upload-section">
          <SitemapInput 
            sitemapUrl={sitemapUrl}
            setSitemapUrl={setSitemapUrl}
          />
          <UploadForm onSubmit={handleSubmit} loading={loading} />
        </div>

        {loading && (
          <div className="loading-container">
            <div className="progress-container">
              <div className="progress-bar-wrapper">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="progress-text">{progress}%</span>
              </div>
              <p className="loading-text">
                กำลังตรวจสอบ URL... (ชุดที่ {currentBatch} จาก {totalBatches})
              </p>
              <p className="loading-hint">
                กำลังประมวลผล โปรดรอสักครู่...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="error-container">
            <ErrorDetails error={error} />
          </div>
        )}

        {results && (
          <Results results={results} />
        )}
      </div>
    </div>
  );
}

export default URLChecker;