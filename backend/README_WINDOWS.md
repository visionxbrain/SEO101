# SEO101 Backend - Windows Setup Guide

## การติดตั้งสำหรับ Windows

### ข้อกำหนดเบื้องต้น
- Windows 10/11
- Python 3.8 หรือสูงกว่า
- Git (optional)

### ขั้นตอนการติดตั้ง

#### 1. ติดตั้ง Python
ดาวน์โหลดและติดตั้ง Python จาก [python.org](https://www.python.org/downloads/)
- ✅ ติ๊กช่อง "Add Python to PATH" ตอนติดตั้ง

#### 2. ติดตั้ง Dependencies

##### วิธีที่ 1: ใช้ Batch Script (แนะนำ)
```batch
# Double-click ไฟล์ start_windows.bat
# หรือรันใน Command Prompt:
start_windows.bat
```

##### วิธีที่ 2: ติดตั้งด้วยตนเอง
```batch
# เปิด Command Prompt หรือ PowerShell
cd backend

# สร้าง virtual environment
python -m venv venv

# Activate virtual environment
# For Command Prompt:
venv\Scripts\activate

# For PowerShell:
venv\Scripts\Activate.ps1

# ติดตั้ง packages
pip install -r requirements.txt
```

### การรันเซิร์ฟเวอร์

#### วิธีที่ 1: ใช้ Batch Script
```batch
start_windows.bat
```

#### วิธีที่ 2: รันด้วยตนเอง
```batch
# Activate virtual environment ก่อน
venv\Scripts\activate

# รันเซิร์ฟเวอร์
python app.py
```

เซิร์ฟเวอร์จะรันที่: http://localhost:8000

### การทดสอบ
```batch
# รันสคริปต์ทดสอบ
python test_windows.py
```

## การแก้ปัญหาที่พบบ่อย

### 1. "Failed to fetch" Error
- **ปัญหา**: Frontend ไม่สามารถเชื่อมต่อ Backend
- **แก้ไข**:
  1. ตรวจสอบว่า Backend รันอยู่ที่ port 8000
  2. ปิด Windows Firewall ชั่วคราว หรือเพิ่ม exception
  3. ตรวจสอบ Windows Defender

### 2. Port 8000 Already in Use
- **แก้ไข**:
```batch
# หา process ที่ใช้ port 8000
netstat -ano | findstr :8000

# Kill process (แทน PID ด้วยเลขที่ได้)
taskkill /PID <PID> /F
```

### 3. SSL Certificate Error
- **แก้ไข**: อัพเดท certificates
```batch
pip install --upgrade certifi
```

### 4. Permission Denied
- **แก้ไข**: รัน Command Prompt as Administrator

### 5. Python Not Found
- **แก้ไข**: 
  1. ติดตั้ง Python ใหม่และติ๊ก "Add to PATH"
  2. หรือเพิ่ม Python path manually:
     - ไปที่ System Properties > Environment Variables
     - เพิ่ม Python path ใน PATH variable

## Windows Firewall Configuration

หากต้องการให้เครื่องอื่นในเครือข่ายเข้าถึงได้:

1. เปิด Windows Defender Firewall
2. Click "Allow an app or feature..."
3. Click "Change settings" แล้ว "Allow another app..."
4. Browse หา python.exe ใน venv\Scripts\
5. ติ๊ก Private และ Public networks

## การใช้งานกับ Frontend

Frontend ควรเชื่อมต่อไปที่:
- Development: `http://localhost:8000`
- Production: Update ใน `.env` file

## Performance Tips for Windows

1. ใช้ Windows Terminal แทน Command Prompt
2. ปิด Windows Defender Real-time scanning สำหรับ project folder (ระวังความปลอดภัย)
3. ใช้ SSD สำหรับ project files
4. ปิดโปรแกรม antivirus อื่นๆ ขณะ development

## สนับสนุน

หากพบปัญหาอื่นๆ กรุณา:
1. รัน `python test_windows.py` และแนบผลลัพธ์
2. ตรวจสอบ server.log
3. แจ้ง error message ที่แสดงใน browser console