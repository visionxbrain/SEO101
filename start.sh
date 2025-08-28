#!/bin/bash
echo "Starting SEO101 API..."
echo "Python version:"
python --version
echo "Port: ${PORT:-8000}"
echo "Starting gunicorn..."
exec gunicorn backend.app:app --config gunicorn_config.py