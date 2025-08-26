#!/bin/bash

# แทนที่ YOUR_GITHUB_USERNAME ด้วย username ของคุณ
GITHUB_USERNAME="YOUR_GITHUB_USERNAME"

echo "Pushing to GitHub..."
git remote add origin https://github.com/${GITHUB_USERNAME}/seo101-backend.git
git branch -M main
git push -u origin main

echo "✅ Done! Code pushed to GitHub"