const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Fix Thai encoding
function fixThaiEncoding(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Fix mojibake patterns
  if (text.includes('à¸') || text.includes('à¹')) {
    try {
      // Try to fix UTF-8 interpreted as Latin-1
      const buffer = Buffer.from(text, 'latin1');
      const fixed = buffer.toString('utf8');
      if (/[\u0E00-\u0E7F]/.test(fixed)) {
        return fixed;
      }
    } catch (e) {
      // If conversion fails, return original
    }
  }
  
  // Fix Unicode escape sequences
  if (text.includes('\\u0e')) {
    try {
      return JSON.parse('"' + text + '"');
    } catch (e) {
      // If parsing fails, return original
    }
  }
  
  return text;
}

// Process schema data recursively
function processSchemaData(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => processSchemaData(item));
  } else if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processSchemaData(value);
    }
    return result;
  } else if (typeof obj === 'string') {
    return fixThaiEncoding(obj);
  }
  return obj;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  // Handle preflight
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
    const { urls, max_workers = 5 } = JSON.parse(event.body);
    
    if (!urls || !Array.isArray(urls)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URLs array required' })
      };
    }

    const results = [];
    
    // Process URLs
    for (const url of urls.slice(0, 10)) { // Limit to 10 URLs for Netlify timeout
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 5000
        });

        const html = await response.text();
        const $ = cheerio.load(html);
        
        const schemas = [];
        const schemaTypes = new Set();
        
        // Extract JSON-LD schemas
        $('script[type="application/ld+json"]').each((i, elem) => {
          try {
            const rawContent = $(elem).html();
            let schemaData = JSON.parse(rawContent);
            
            // Fix Thai encoding
            schemaData = processSchemaData(schemaData);
            
            if (Array.isArray(schemaData)) {
              schemaData.forEach(item => {
                if (item['@type']) {
                  schemaTypes.add(item['@type']);
                  schemas.push({
                    format: 'JSON-LD',
                    type: item['@type'],
                    data: item
                  });
                }
              });
            } else if (schemaData['@type']) {
              schemaTypes.add(schemaData['@type']);
              schemas.push({
                format: 'JSON-LD',
                type: schemaData['@type'],
                data: schemaData
              });
            }
          } catch (e) {
            console.error('Error parsing JSON-LD:', e.message);
          }
        });
        
        // Check for Microdata
        $('[itemscope]').each((i, elem) => {
          const itemtype = $(elem).attr('itemtype');
          if (itemtype && itemtype.includes('schema.org')) {
            const schemaType = itemtype.split('/').pop();
            schemaTypes.add(schemaType);
            
            const properties = {};
            $(elem).find('[itemprop]').each((j, prop) => {
              const propName = $(prop).attr('itemprop');
              const propValue = $(prop).attr('content') || $(prop).text().trim();
              properties[propName] = fixThaiEncoding(propValue);
            });
            
            schemas.push({
              format: 'Microdata',
              type: schemaType,
              data: properties
            });
          }
        });
        
        // Calculate score and recommendations
        let score = 0;
        const recommendations = [];
        
        if (schemas.length === 0) {
          recommendations.push('ไม่พบ Schema Markup - ควรเพิ่ม JSON-LD Schema');
        } else {
          score += 30;
        }
        
        const essentialTypes = ['Article', 'Product', 'Organization', 'WebPage', 'BreadcrumbList'];
        const foundEssential = [...schemaTypes].some(type => essentialTypes.includes(type));
        if (foundEssential) {
          score += 30;
        } else {
          recommendations.push('เพิ่ม Schema ประเภทหลักเช่น Article, Product, Organization');
        }
        
        if (!schemaTypes.has('BreadcrumbList')) {
          recommendations.push('เพิ่ม BreadcrumbList สำหรับ navigation');
        } else {
          score += 20;
        }
        
        if (schemaTypes.has('FAQPage')) {
          score += 20;
        }
        
        results.push({
          url,
          has_schema: schemas.length > 0,
          schema_types: Array.from(schemaTypes),
          schema_count: schemas.length,
          schemas: schemas.slice(0, 3), // Limit to 3 schemas in response
          ai_search_optimized: score >= 50,
          recommendations: recommendations.slice(0, 3),
          score: Math.min(score, 100),
          checked_at: new Date().toISOString()
        });
        
      } catch (error) {
        results.push({
          url,
          has_schema: false,
          schema_types: [],
          schema_count: 0,
          schemas: [],
          ai_search_optimized: false,
          recommendations: ['ไม่สามารถเข้าถึง URL'],
          score: 0,
          error: error.message
        });
      }
    }
    
    // Calculate summary
    const summary = {
      total_urls: results.length,
      with_schema: results.filter(r => r.has_schema).length,
      without_schema: results.filter(r => !r.has_schema).length,
      ai_optimized: results.filter(r => r.ai_search_optimized).length,
      average_score: Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ results, summary })
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