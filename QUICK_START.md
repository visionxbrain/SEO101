# 🚀 วิธีใช้งาน SEO101 แบบเร็วที่สุด

## สำหรับ Windows Users

### Option 1: ใช้ Replit (แนะนำ - ไม่ต้องติดตั้งอะไร)
1. ไปที่ [replit.com](https://replit.com)
2. Import repo: `https://github.com/visionxbrain/SEO101`
3. คลิก Run
4. Copy URL ที่ได้ (เช่น `https://seo101-username.repl.co`)
5. เปิด https://seotar.netlify.app ใช้งานได้เลย!

### Option 2: รัน Backend บนเครื่องตัวเอง
1. ติดตั้ง Python 3.8+
2. Download project จาก GitHub
3. เปิด Command Prompt:
```batch
cd backend
pip install -r requirements.txt
python app.py
```
4. Backend จะรันที่ http://localhost:8000
5. เปิด https://seotar.netlify.app ใช้งานได้เลย

## สำหรับ Mac Users

1. Clone project:
```bash
git clone https://github.com/visionxbrain/SEO101.git
cd SEO101/backend
```

2. ติดตั้งและรัน:
```bash
pip3 install -r requirements.txt
python3 app.py
```

3. เปิด https://seotar.netlify.app

## ⚠️ หมายเหตุสำคัญ

**ตอนนี้ Frontend (Netlify) ยังใช้ localhost:8000 เป็น backend**
- ต้องรัน backend บนเครื่องก่อนใช้งาน
- หรือใช้ Replit สำหรับ backend แทน

## 📱 การใช้งานจากมือถือ/แท็บเล็ต

ต้อง deploy backend บน cloud ก่อน:
- Replit.com (ง่ายที่สุด)
- Railway.app
- Render.com

## 🎯 Features ที่ใช้งานได้

✅ Schema Markup Checker - ตรวจสอบ Schema.org
✅ Blog Link Checker - ตรวจสอบ broken links
✅ Heading Structure - วิเคราะห์ H1-H6
✅ รองรับภาษาไทย 100%

## 🐛 แจ้งปัญหา

หากพบปัญหา กรุณาแจ้งที่:
- GitHub Issues
- หรือ run backend locally ตาม option 2