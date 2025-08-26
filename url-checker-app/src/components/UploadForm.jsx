import { useState } from 'react';
import { Upload, FileText, Plus, X } from 'lucide-react';
import Papa from 'papaparse';

function UploadForm({ onSubmit, loading }) {
  const [urls, setUrls] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (file) => {
    if (!file) return;

    Papa.parse(file, {
      complete: (result) => {
        const extractedUrls = [];
        result.data.forEach(row => {
          if (Array.isArray(row)) {
            row.forEach(cell => {
              if (typeof cell === 'string' && cell.includes('http')) {
                extractedUrls.push(cell.trim());
              }
            });
          }
        });
        setUrls(extractedUrls);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV');
      }
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleTextSubmit = () => {
    const urlList = textInput
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    setUrls(urlList);
  };

  const handleSubmit = () => {
    if (urls.length > 0) {
      onSubmit(urls);
    }
  };

  const removeUrl = (index) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  return (
    <div className="upload-form">
      {urls.length === 0 ? (
        <>
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="upload-icon">
              <Upload size={48} />
            </div>
            <h3>อัพโหลดไฟล์ CSV</h3>
            <p>ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              className="file-input"
            />
          </div>

          <div className="divider">หรือ</div>

          <div className="text-input-area">
            <div className="text-input-header">
              <FileText size={24} />
              <h3>ใส่ URL ทีละบรรทัด</h3>
            </div>
            <textarea
              className="url-textarea"
              placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={6}
            />
            <button 
              className="btn btn-secondary"
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
            >
              <Plus size={20} />
              เพิ่ม URLs
            </button>
          </div>
        </>
      ) : (
        <div className="urls-preview">
          <div className="preview-header">
            <h3>
              <FileText size={20} />
              พบ {urls.length} URLs
            </h3>
            <button 
              className="btn btn-outline-small"
              onClick={() => setUrls([])}
            >
              ล้างทั้งหมด
            </button>
          </div>
          
          <div className="url-list-preview">
            {urls.slice(0, 5).map((url, index) => (
              <div key={index} className="url-item">
                <span className="url-text">{url}</span>
                <button 
                  className="remove-btn"
                  onClick={() => removeUrl(index)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {urls.length > 5 && (
              <div className="more-urls">
                และอีก {urls.length - 5} URLs...
              </div>
            )}
          </div>

          <button 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'กำลังตรวจสอบ...' : `ตรวจสอบ ${urls.length} URLs`}
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadForm;