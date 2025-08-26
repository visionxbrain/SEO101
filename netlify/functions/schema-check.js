// Netlify Function for Schema Checker
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
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
    const { urls } = JSON.parse(event.body);
    const results = [];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Find JSON-LD Schema
        const schemas = [];
        $('script[type="application/ld+json"]').each((i, elem) => {
          try {
            const schema = JSON.parse($(elem).html());
            schemas.push(schema);
          } catch (e) {
            // Invalid JSON
          }
        });

        results.push({
          url,
          has_schema: schemas.length > 0,
          schema_count: schemas.length,
          schemas: schemas.slice(0, 3)
        });
      } catch (error) {
        results.push({
          url,
          has_schema: false,
          error: error.message
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ results })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};