// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://web-production-b3213.up.railway.app';

export default {
  API_BASE_URL,
  endpoints: {
    checkUrls: `${API_BASE_URL}/api/check-urls`,
    testSitemap: `${API_BASE_URL}/api/test-sitemap`,
    checkHeadingStructure: `${API_BASE_URL}/api/check-heading-structure`,
    checkSchemaMarkup: `${API_BASE_URL}/api/check-schema-markup`,
    checkSchemaMarkupStream: `${API_BASE_URL}/api/check-schema-markup-stream`,
    checkBlogLinks: `${API_BASE_URL}/api/check-blog-links`,
    checkBlogLinksStream: `${API_BASE_URL}/api/check-blog-links-stream`
  }
};