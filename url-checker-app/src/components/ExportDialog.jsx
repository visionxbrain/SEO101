import { useState } from 'react';
import { Download, X, FileText, FileJson, ArrowRight } from 'lucide-react';

function ExportDialog({ isOpen, onClose, onExport, resultCount, selectedCount = 0 }) {
  const [filename, setFilename] = useState('');
  const [exportType, setExportType] = useState('csv-all');
  
  const getDefaultFilename = () => {
    const today = new Date().toISOString().split('T')[0];
    switch(exportType) {
      case 'redirect-csv':
        return `redirect-map-${today}`;
      case 'csv-404':
        return `404-urls-${today}`;
      case 'json':
        return `results-${today}`;
      default:
        return `url-check-results-${today}`;
    }
  };

  const handleExport = () => {
    const finalFilename = filename || getDefaultFilename();
    onExport(exportType, finalFilename);
    onClose();
    setFilename('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Export ผลการตรวจสอบ {selectedCount > 0 && <span style={{color: 'var(--cf-blue)', fontSize: '14px'}}>({selectedCount} รายการที่เลือก)</span>}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>เลือกประเภทการ Export:</label>
            <div className="export-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="exportType"
                  value="csv-all"
                  checked={exportType === 'csv-all'}
                  onChange={(e) => setExportType(e.target.value)}
                />
                <div className="radio-content">
                  <FileText size={20} />
                  <div>
                    <span className="radio-title">CSV - ทั้งหมด</span>
                    <span className="radio-desc">Export {selectedCount > 0 ? `${selectedCount} รายการที่เลือก` : `ผลลัพธ์ทั้งหมด ${resultCount} รายการ`}</span>
                  </div>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="exportType"
                  value="csv-404"
                  checked={exportType === 'csv-404'}
                  onChange={(e) => setExportType(e.target.value)}
                />
                <div className="radio-content">
                  <FileText size={20} className="text-red" />
                  <div>
                    <span className="radio-title">CSV - 404 Only</span>
                    <span className="radio-desc">Export เฉพาะ URL ที่เป็น 404</span>
                  </div>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="exportType"
                  value="redirect-csv"
                  checked={exportType === 'redirect-csv'}
                  onChange={(e) => setExportType(e.target.value)}
                />
                <div className="radio-content">
                  <ArrowRight size={20} className="text-green" />
                  <div>
                    <span className="radio-title">Redirect Map CSV</span>
                    <span className="radio-desc">สร้างไฟล์ mapping สำหรับ redirect (source, target)</span>
                  </div>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="exportType"
                  value="json"
                  checked={exportType === 'json'}
                  onChange={(e) => setExportType(e.target.value)}
                />
                <div className="radio-content">
                  <FileJson size={20} className="text-blue" />
                  <div>
                    <span className="radio-title">JSON Format</span>
                    <span className="radio-desc">Export ในรูปแบบ JSON สำหรับ API</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="filename">ชื่อไฟล์ (ไม่ต้องใส่นามสกุล):</label>
            <input
              type="text"
              id="filename"
              className="text-input"
              placeholder={getDefaultFilename()}
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
            <span className="input-hint">
              ถ้าไม่ระบุจะใช้ชื่อ: {getDefaultFilename()}.{exportType === 'json' ? 'json' : 'csv'}
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={20} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;