# Heading Analyzer Chrome Extension

Extension สำหรับวิเคราะห์โครงสร้าง Heading (H1-H6) แบบ Real-time บนหน้าเว็บใดๆ

## 🚀 คุณสมบัติ

- ✅ **Live Mode อัตโนมัติ** - เปิดใช้งานได้ทันทีด้วยคลิกเดียว
- 📊 **แสดง SEO Score** - คะแนนการจัดโครงสร้าง Heading
- 🎯 **Highlight Headings** - แสดงกรอบสีรอบ heading ที่มีปัญหา
- 📋 **Panel แสดงปัญหา** - รายละเอียดปัญหาและคำแนะนำ
- 🔄 **Auto-refresh** - อัปเดตอัตโนมัติเมื่อเปลี่ยนหน้า

## 📦 การติดตั้ง

### วิธีที่ 1: โหลดแบบ Developer Mode

1. เปิด Chrome แล้วไปที่ `chrome://extensions/`
2. เปิด **Developer mode** (สวิตช์ขวาบน)
3. คลิก **Load unpacked**
4. เลือกโฟลเดอร์ `/Users/tanakitchaithip/Documents/Projects/404/heading-analyzer-extension`
5. Extension จะปรากฏในแถบ Extension ของ Chrome

### วิธีที่ 2: ติดตั้งจาก Chrome Web Store (ในอนาคต)

*Coming soon...*

## 🎯 วิธีใช้งาน

### แบบที่ 1: ใช้ผ่าน Popup
1. คลิกไอคอน Extension บนแถบเครื่องมือ
2. คลิกปุ่ม **"เปิด Live Mode"**
3. Panel จะปรากฏที่มุมขวาบนของหน้าเว็บ
4. คลิก **"Toggle Highlights"** เพื่อแสดง/ซ่อนกรอบสี

### แบบที่ 2: Quick Toggle
1. คลิกไอคอน Extension + กด `Alt` ค้างไว้
2. Live Mode จะเปิด/ปิดทันที

## 🎨 ความหมายของสี

### กรอบ Heading
- 🔴 **แดง** - H1 (ควรมีเพียง 1 ต่อหน้า)
- 🔵 **น้ำเงิน** - H2 (หัวข้อหลัก)
- 🟢 **เขียว** - H3 (หัวข้อย่อย)
- 🟣 **ม่วง** - H4
- ⚫ **เทา** - H5, H6

### Severity ของปัญหา
- **Critical** (แดง) - ต้องแก้ไขด่วน
- **High** (ส้ม) - ควรแก้ไข
- **Medium** (เหลือง) - แนะนำให้ปรับปรุง
- **Low** (น้ำเงิน) - ปรับปรุงเพิ่มเติม

## 🔧 การตั้งค่า

Extension จะจำสถานะการใช้งาน:
- หากเปิด Live Mode ไว้ เมื่อเปลี่ยนหน้าจะเปิดอัตโนมัติ
- ปิด Live Mode เมื่อปิด Browser

## 📱 Keyboard Shortcuts

- `Alt + H` - Toggle Live Mode
- `Alt + Shift + H` - Toggle Highlights only
- `Esc` - ปิด Panel

## 🐛 การแก้ปัญหา

### Panel ไม่แสดง
1. Refresh หน้าเว็บ
2. ตรวจสอบว่า Extension เปิดใช้งานอยู่
3. ดู Console (F12) หากมี errors

### Highlights ไม่แสดง
1. คลิก "Toggle Highlights" อีกครั้ง
2. ตรวจสอบว่าหน้าเว็บมี Heading tags

## 📄 Permissions ที่ใช้

- `activeTab` - เข้าถึงแท็บที่กำลังใช้งาน
- `storage` - บันทึกสถานะการใช้งาน
- `scripting` - inject script เพื่อวิเคราะห์ heading

## 🔗 Links

- Dashboard หลัก: http://localhost:5175
- Backend API: http://localhost:8000

## 📝 Version History

### v1.0.0 (Current)
- ✅ Live Mode with auto-injection
- ✅ Real-time heading analysis
- ✅ Visual highlights
- ✅ Popup interface
- ✅ Persistent state

### Roadmap
- [ ] Export report to PDF
- [ ] Sync with main dashboard
- [ ] Custom rules configuration
- [ ] Multiple language support

---

**Developer:** SEO Tools Team
**License:** MIT