# การ Deploy บน Railway (Backend + Frontend)

## วิธีการตั้งค่า 2 Services บน Railway

### 1. สร้าง Backend Service
1. ไปที่ Railway Dashboard
2. คลิก "New Project"
3. เลือก "Deploy from GitHub repo"
4. เลือก repo `SEO101`
5. ตั้งชื่อ service เป็น "backend"
6. ไปที่ Settings > Root Directory ใส่: `/`
7. Service จะใช้ `railway.json` และ `Procfile` ที่ root อัตโนมัติ

### 2. สร้าง Frontend Service
1. ในโปรเจ็คเดียวกัน คลิก "New" > "GitHub Repo"
2. เลือก repo `SEO101` อีกครั้ง
3. ตั้งชื่อ service เป็น "frontend"
4. ไปที่ Settings:
   - Root Directory: `url-checker-app`
   - ตั้ง Environment Variable:
     - VITE_API_URL = `[URL ของ backend service]`

### 3. เชื่อมต่อ Services
1. Backend service จะได้ URL เช่น: `https://web-production-b3213.up.railway.app`
2. Copy URL นี้ไปใส่ใน Environment Variable ของ Frontend
3. Frontend จะ build และ serve static files อัตโนมัติ

## การจัดการ Domain
- Backend: `api.yourdomain.com`
- Frontend: `app.yourdomain.com` หรือ `yourdomain.com`

## ข้อดี
- ทุกอย่างอยู่ในโปรเจ็คเดียวกัน
- Auto deploy เมื่อ push code
- จัดการ billing ที่เดียว
- ดู logs และ metrics รวมกัน