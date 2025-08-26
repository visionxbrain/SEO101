const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { url } = JSON.parse(event.body);
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL required' })
      };
    }

    // Fetch page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract headings
    const headings = [];
    const structure = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
    
    $('h1, h2, h3, h4, h5, h6').each((index, elem) => {
      const tagName = elem.name.toLowerCase();
      const text = $(elem).text().trim();
      
      if (text) {
        headings.push({
          level: parseInt(tagName.charAt(1)),
          tag: tagName,
          text: text.substring(0, 200),
          index
        });
        structure[tagName]++;
      }
    });
    
    // Analysis
    const issues = [];
    let score = 100;
    
    // Check H1
    if (structure.h1 === 0) {
      issues.push({ type: 'error', message: 'ไม่พบ H1 - ควรมี H1 เพียง 1 อัน' });
      score -= 30;
    } else if (structure.h1 > 1) {
      issues.push({ type: 'warning', message: `พบ H1 ${structure.h1} อัน - ควรมีเพียง 1 อัน` });
      score -= 20;
    }
    
    // Check hierarchy
    let lastLevel = 0;
    let hierarchyIssues = 0;
    
    headings.forEach((h, i) => {
      if (lastLevel > 0 && h.level > lastLevel + 1) {
        hierarchyIssues++;
      }
      lastLevel = h.level;
    });
    
    if (hierarchyIssues > 0) {
      issues.push({ 
        type: 'warning', 
        message: `พบการข้ามลำดับ heading ${hierarchyIssues} จุด` 
      });
      score -= hierarchyIssues * 5;
    }
    
    // Recommendations
    const recommendations = [];
    
    if (structure.h1 === 0) {
      recommendations.push('เพิ่ม H1 ที่มีคีย์เวิร์ดหลัก');
    }
    
    if (structure.h2 === 0) {
      recommendations.push('เพิ่ม H2 เพื่อแบ่งโครงสร้างเนื้อหา');
    }
    
    if (headings.length > 20) {
      recommendations.push('พิจารณาลดจำนวน headings หรือแบ่งเป็นหลายหน้า');
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        url,
        headings,
        structure,
        total_headings: headings.length,
        issues,
        recommendations,
        score: Math.max(0, Math.min(100, score)),
        has_h1: structure.h1 > 0,
        h1_count: structure.h1
      })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};