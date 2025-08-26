// Error explanations and solutions in Thai
export const getErrorExplanation = (error) => {
  if (!error) return null;
  
  const errorLower = error.toLowerCase();
  
  // Connection errors
  if (errorLower.includes('httpsconnectionpool') || errorLower.includes('max retries exceeded')) {
    return {
      type: 'connection',
      title: 'ปัญหาการเชื่อมต่อ',
      causes: [
        'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        'เซิร์ฟเวอร์ไม่ตอบสนอง',
        'ชื่อโดเมนไม่ถูกต้องหรือไม่มีอยู่จริง'
      ],
      solutions: [
        'ตรวจสอบว่า URL ถูกต้อง',
        'ตรวจสอบว่าเว็บไซต์ยังทำงานอยู่',
        'ตรวจสอบการสะกดชื่อโดเมน',
        'ลองเข้าเว็บไซต์ผ่านเบราว์เซอร์โดยตรง'
      ]
    };
  }
  
  if (errorLower.includes('nameresolutionerror') || errorLower.includes('failed to resolve')) {
    return {
      type: 'dns',
      title: 'ไม่พบโดเมน (DNS Error)',
      causes: [
        'ชื่อโดเมนไม่มีอยู่จริง',
        'DNS ไม่สามารถแปลงชื่อโดเมนได้',
        'โดเมนอาจถูกยกเลิกแล้ว'
      ],
      solutions: [
        'ตรวจสอบการสะกดชื่อโดเมน',
        'ตรวจสอบว่าโดเมนยังใช้งานอยู่',
        'ใช้ subdomain ที่ถูกต้อง (เช่น www)',
        'ติดต่อเจ้าของเว็บไซต์'
      ]
    };
  }
  
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return {
      type: 'timeout',
      title: 'หมดเวลาการเชื่อมต่อ',
      causes: [
        'เซิร์ฟเวอร์ตอบสนองช้าเกินไป',
        'เว็บไซต์มีปัญหาด้านประสิทธิภาพ',
        'การเชื่อมต่ออินเทอร์เน็ตช้า'
      ],
      solutions: [
        'ลองตรวจสอบใหม่อีกครั้ง',
        'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
        'ติดต่อผู้ดูแลเว็บไซต์'
      ]
    };
  }
  
  if (errorLower.includes('ssl') || errorLower.includes('certificate')) {
    return {
      type: 'ssl',
      title: 'ปัญหา SSL Certificate',
      causes: [
        'SSL Certificate หมดอายุ',
        'SSL Certificate ไม่ถูกต้อง',
        'ปัญหาการตั้งค่า HTTPS'
      ],
      solutions: [
        'ติดต่อผู้ดูแลเว็บไซต์ให้ต่ออายุ SSL',
        'ลองใช้ http:// แทน https://',
        'ตรวจสอบวันหมดอายุของ certificate'
      ]
    };
  }
  
  if (errorLower.includes('403') || errorLower.includes('forbidden')) {
    return {
      type: 'forbidden',
      title: 'ไม่มีสิทธิ์เข้าถึง (403)',
      causes: [
        'เซิร์ฟเวอร์ปฏิเสธการเข้าถึง',
        'ต้องการการยืนยันตัวตน',
        'IP ถูกบล็อก'
      ],
      solutions: [
        'ตรวจสอบว่าหน้านี้เปิดให้เข้าถึงได้จริง',
        'อาจต้องล็อกอินก่อนเข้าใช้งาน',
        'ติดต่อผู้ดูแลเว็บไซต์'
      ]
    };
  }
  
  if (errorLower.includes('500') || errorLower.includes('internal server error')) {
    return {
      type: 'server',
      title: 'เซิร์ฟเวอร์มีปัญหา (500)',
      causes: [
        'เซิร์ฟเวอร์เกิดข้อผิดพลาด',
        'โค้ดบนเซิร์ฟเวอร์มีปัญหา',
        'ฐานข้อมูลมีปัญหา'
      ],
      solutions: [
        'รอสักครู่แล้วลองใหม่',
        'แจ้งผู้ดูแลเว็บไซต์',
        'ตรวจสอบ status page ของเว็บไซต์'
      ]
    };
  }
  
  // Default error
  return {
    type: 'unknown',
    title: 'ข้อผิดพลาดอื่นๆ',
    causes: [
      'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
    ],
    solutions: [
      'ลองตรวจสอบใหม่อีกครั้ง',
      'ตรวจสอบ URL ให้ถูกต้อง',
      'ติดต่อผู้ดูแลระบบ'
    ]
  };
};

export const getErrorSummary = (error) => {
  if (!error) return '';
  
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('httpsconnectionpool') || errorLower.includes('max retries exceeded')) {
    return 'ไม่สามารถเชื่อมต่อได้';
  }
  
  if (errorLower.includes('nameresolutionerror') || errorLower.includes('failed to resolve')) {
    return 'ไม่พบโดเมน';
  }
  
  if (errorLower.includes('timeout')) {
    return 'หมดเวลาการเชื่อมต่อ';
  }
  
  if (errorLower.includes('ssl') || errorLower.includes('certificate')) {
    return 'ปัญหา SSL';
  }
  
  if (errorLower.includes('403')) {
    return 'ไม่มีสิทธิ์เข้าถึง';
  }
  
  if (errorLower.includes('500')) {
    return 'เซิร์ฟเวอร์มีปัญหา';
  }
  
  // Return first 50 characters of error
  return error.length > 50 ? error.substring(0, 50) + '...' : error;
};