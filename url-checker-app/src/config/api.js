// API Configuration for both Mac and Windows
const getApiUrl = () => {
  // Check multiple possible backend URLs
  const possibleUrls = [
    'http://localhost:8000',     // Windows default
    'http://127.0.0.1:8000',     // Windows alternative
    'http://0.0.0.0:8000',       // Mac/Linux default
  ];
  
  // In production, use environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For development, return localhost which works on both platforms
  return 'http://localhost:8000';
};

export const API_URL = getApiUrl();

// Helper function to handle API errors
export const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.message === 'Failed to fetch') {
    return {
      error: true,
      message: `ไม่สามารถเชื่อมต่อกับ Backend Server ได้
      
กรุณาตรวจสอบ:
1. Backend server รันอยู่หรือไม่
   - Windows: รัน start_windows.bat หรือ python app.py
   - Mac: รัน python3 app.py
   
2. ตรวจสอบ port 8000 ว่าว่างหรือไม่
   - Windows: netstat -ano | findstr :8000
   - Mac: lsof -i :8000
   
3. Windows Firewall/Antivirus อาจบล็อก connection
   - ลองปิด Windows Defender ชั่วคราว
   - เพิ่ม exception สำหรับ Python.exe

4. ทดสอบการเชื่อมต่อ:
   - เปิด browser ไปที่ ${API_URL}
   - ควรเห็น {"message": "404 URL Checker API"}`,
      details: error.toString()
    };
  }
  
  if (error.message.includes('CORS')) {
    return {
      error: true,
      message: 'CORS Error: Backend server อาจไม่อนุญาตการเชื่อมต่อจาก frontend',
      details: error.toString()
    };
  }
  
  if (error.message.includes('timeout')) {
    return {
      error: true,
      message: 'Request timeout: Server ตอบสนองช้า กรุณาลองใหม่อีกครั้ง',
      details: error.toString()
    };
  }
  
  return {
    error: true,
    message: error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
    details: error.toString()
  };
};

// Test connectivity function
export const testConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: handleApiError(error) };
  }
};

export default API_URL;