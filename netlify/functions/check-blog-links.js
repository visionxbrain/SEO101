const fetch = require('node-fetch');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

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
    const { sitemap_url, check_external = true } = JSON.parse(event.body);
    
    if (!sitemap_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'sitemap_url required' })
      };
    }

    // Fetch sitemap
    const sitemapResponse = await fetch(sitemap_url);
    const sitemapXml = await sitemapResponse.text();
    
    // Parse sitemap
    const parser = new xml2js.Parser();
    const sitemap = await parser.parseStringPromise(sitemapXml);
    
    // Extract blog URLs
    const blogUrls = [];
    if (sitemap.urlset && sitemap.urlset.url) {
      sitemap.urlset.url.forEach(item => {
        const url = item.loc[0];
        if (url.includes('/blog/')) {
          blogUrls.push(url);
        }
      });
    }
    
    // Limit to 5 blog posts for Netlify timeout
    const urlsToCheck = blogUrls.slice(0, 5);
    const allLinks = [];
    const brokenLinks = [];
    
    // Extract links from each blog post
    for (const blogUrl of urlsToCheck) {
      try {
        const response = await fetch(blogUrl);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract all links
        $('a[href]').each((i, elem) => {
          const href = $(elem).attr('href');
          if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, blogUrl).toString();
            const isExternal = !fullUrl.includes(new URL(blogUrl).hostname);
            
            if (!check_external && isExternal) return;
            
            allLinks.push({
              url: fullUrl,
              type: isExternal ? 'external' : 'internal',
              found_in: blogUrl
            });
          }
        });
      } catch (error) {
        console.error(`Error extracting links from ${blogUrl}:`, error);
      }
    }
    
    // Check links (limit to 20 for performance)
    const uniqueLinks = [...new Set(allLinks.map(l => l.url))].slice(0, 20);
    
    for (const linkUrl of uniqueLinks) {
      try {
        const response = await fetch(linkUrl, {
          method: 'HEAD',
          timeout: 3000
        });
        
        const linkInfo = allLinks.find(l => l.url === linkUrl);
        if (response.status >= 400) {
          brokenLinks.push({
            ...linkInfo,
            status_code: response.status,
            is_broken: true
          });
        }
      } catch (error) {
        const linkInfo = allLinks.find(l => l.url === linkUrl);
        brokenLinks.push({
          ...linkInfo,
          is_broken: true,
          error: error.message
        });
      }
    }
    
    // Summary
    const summary = {
      total_blog_posts: urlsToCheck.length,
      total_links_checked: uniqueLinks.length,
      broken_links: brokenLinks.length,
      working_links: uniqueLinks.length - brokenLinks.length
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        blog_urls: urlsToCheck,
        broken_links: brokenLinks,
        summary
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