import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText } from 'lucide-react'
import Papa from 'papaparse'

function FileUpload({ onUrlsLoaded }) {
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    
    if (file && file.type === 'text/csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const urls = results.data
            .filter(row => row.URL)
            .map(row => row.URL)
          
          if (urls.length > 0) {
            onUrlsLoaded(urls)
          } else {
            alert('ไม่พบ URLs ในไฟล์ CSV')
          }
        },
        error: (error) => {
          alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + error.message)
        }
      })
    } else {
      alert('กรุณาอัพโหลดไฟล์ CSV เท่านั้น')
    }
  }, [onUrlsLoaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  })

  return (
    <div className="file-upload">
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload size={48} className="upload-icon" />
        <h2>อัพโหลดไฟล์ CSV</h2>
        <p>ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
        <div className="file-info">
          <FileText size={20} />
          <span>รองรับไฟล์ .csv เท่านั้น</span>
        </div>
      </div>
    </div>
  )
}

export default FileUpload