# คู่มือ Deploy SEO101 สำหรับใช้งานจากทุกที่

## ปัญหาปัจจุบัน
- Frontend อยู่บน Netlify (https://seotar.netlify.app)
- Backend อยู่บน localhost (เครื่อง Mac)
- Windows/เครื่องอื่นๆ ไม่สามารถใช้งานได้

## วิธีแก้ไข: Deploy Backend ไปที่ Cloud

### Option 1: Deploy ที่ Render.com (แนะนำ - ฟรี!)

#### ขั้นตอน:

1. **สร้างบัญชี Render.com**
   - ไปที่ [render.com](https://render.com)
   - Sign up ด้วย GitHub

2. **เตรียม Backend สำหรับ Deploy**
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Prepare backend for deployment"
   ```

3. **Push Backend ไปที่ GitHub**
   - สร้าง repo ใหม่ชื่อ `seo101-backend`
   - Push code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/seo101-backend.git
   git push -u origin main
   ```

4. **Deploy บน Render**
   - Login Render.com
   - Click "New +" → "Web Service"
   - Connect GitHub repo `seo101-backend`
   - Settings:
     - Name: `seo101-backend`
     - Runtime: `Python 3`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `python app.py`
   - Click "Create Web Service"

5. **รอ Deploy เสร็จ**
   - Render จะให้ URL เช่น: `https://seo101-backend.onrender.com`

6. **อัพเดท Frontend**
   - แก้ไขไฟล์ `.env.production`:
   ```
   VITE_API_URL=https://seo101-backend.onrender.com
   ```

7. **Build และ Deploy Frontend ใหม่**
   ```bash
   cd url-checker-app
   npm run build
   # Commit และ Push ไป GitHub
   # Netlify จะ auto deploy
   ```

### Option 2: Deploy ที่ Railway.app

1. **สร้างบัญชี Railway**
   - ไปที่ [railway.app](https://railway.app)
   - Sign up ด้วย GitHub

2. **Deploy จาก GitHub**
   - Click "New Project"
   - Deploy from GitHub repo
   - Railway จะ auto detect Python
   - รอ deploy เสร็จ
   - ได้ URL เช่น: `https://seo101-backend.up.railway.app`

3. **อัพเดท Frontend เหมือน Option 1**

### Option 3: ใช้ Ngrok (ชั่วคราว - สำหรับทดสอบ)

1. **ติดตั้ง Ngrok บน Mac**
   ```bash
   brew install ngrok
   ```

2. **รัน Backend**
   ```bash
   cd backend
   python app.py
   ```

3. **เปิด Tunnel**
   ```bash
   ngrok http 8000
   ```
   - จะได้ URL เช่น: `https://abc123.ngrok.io`

4. **ใช้ URL นี้ในการทดสอบ**
   - แต่ URL จะเปลี่ยนทุกครั้งที่รัน ngrok ใหม่

## สรุป: สิ่งที่ต้องทำเพื่อให้ Windows ใช้งานได้

### ✅ วิธีที่ดีที่สุด (Production)
1. Deploy Backend ไปที่ Render.com/Railway
2. อัพเดท Frontend ให้ใช้ URL ของ Backend บน Cloud
3. Re-deploy Frontend บน Netlify

### ⚡ วิธีทดสอบเร็วๆ (Development)
1. ใช้ Ngrok สร้าง public URL ชั่วคราว
2. แชร์ URL ให้คนที่จะทดสอบ

## Environment Variables

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend.onrender.com
```

### Backend (ถ้าใช้ Render/Railway)
ตั้งค่าใน Dashboard:
```
PORT=10000  # Render
หรือ
# Railway จะตั้งค่า PORT อัตโนมัติ
```

## Testing

หลังจาก deploy เสร็จ ทดสอบด้วย:

1. **Test Backend**
   ```
   https://your-backend.onrender.com/
   ```
   ควรเห็น: `{"message": "404 URL Checker API"}`

2. **Test จาก Windows**
   - เปิด https://seotar.netlify.app
   - ลองใช้งาน Schema Checker
   - ควรทำงานได้ปกติ!

## หมายเหตุ
- Render.com free tier อาจ sleep หลังไม่มีการใช้งาน 15 นาที
- ครั้งแรกที่เรียกใช้อาจช้าหน่อย (cold start ~30 วินาที)
- ถ้าต้องการ always-on ต้องอัพเกรดเป็น paid plan