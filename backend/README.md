# SEO101 Backend API

Backend service for SEO101 - A comprehensive SEO analysis toolkit.

## Features

- 🔍 **Schema Markup Checker** - Analyze Schema.org markup with Thai language support
- 🔗 **Blog Link Checker** - Check broken links in blog posts with streaming support  
- 📊 **Heading Structure Analyzer** - Analyze H1-H6 structure for SEO optimization
- 🏗️ **Schema Generator V2** - Generate optimized Schema markup
- 🌏 **Thai Language Support** - Full support for Thai text encoding

## Tech Stack

- FastAPI
- Python 3.11
- BeautifulSoup4
- Uvicorn

## API Endpoints

- `GET /` - Health check
- `POST /api/check-schema-markup` - Check Schema markup
- `GET /api/check-schema-markup-stream` - Stream Schema checking for sitemaps
- `POST /api/check-blog-links` - Check blog links
- `GET /api/check-blog-links-stream` - Stream blog link checking
- `POST /api/analyze-headings` - Analyze heading structure
- `POST /api/generate-schema-v2` - Generate Schema markup

## Deployment

Deployed on Render.com with automatic deploys from main branch.

## Local Development

```bash
pip install -r requirements.txt
python app.py
```

Server runs on http://localhost:8000

## License

Private repository - All rights reserved