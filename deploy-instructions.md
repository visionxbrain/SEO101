# คำแนะนำการ Deploy Frontend บน Vercel

## วิธีที่ 1: Deploy ผ่าน Vercel Dashboard (แนะนำ)

1. ไปที่ https://vercel.com และ login
2. คลิก "Add New..." > "Project"
3. Import Git Repository > เลือก repo `SEO101`
4. ตั้งค่าดังนี้:
   - Framework Preset: Vite
   - Root Directory: `url-checker-app`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. เพิ่ม Environment Variables:
   - Name: `VITE_API_URL`
   - Value: `https://web-production-b3213.up.railway.app`
6. คลิก "Deploy"

## วิธีที่ 2: Deploy ผ่าน CLI

1. ติดตั้ง Vercel CLI:
```bash
npm install -g vercel
```

2. Login:
```bash
vercel login
```

3. Deploy:
```bash
cd url-checker-app
vercel --prod
```

4. เมื่อถาม:
   - Set up and deploy: Y
   - Which scope: เลือก account ของคุณ
   - Link to existing project: N
   - Project name: seo101-checker (หรือชื่อที่ต้องการ)
   - Directory: ./
   - Override settings: N

## หลังจาก Deploy สำเร็จ

- Vercel จะให้ URL เช่น: `https://seo101-checker.vercel.app`
- Frontend จะเชื่อมต่อกับ Railway API อัตโนมัติ
- ทดสอบการทำงานทุก feature

## การ Update ในอนาคต

เมื่อ push code ไป GitHub, Vercel จะ auto deploy ให้อัตโนมัติ