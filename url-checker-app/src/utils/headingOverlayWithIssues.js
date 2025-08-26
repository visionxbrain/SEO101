// HeadingsMap Overlay with Issues Detection and Recommendations
export const generateHeadingsMapWithIssues = (headingHierarchy, issues, score) => {
  return `
(function() {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById('headingsmap-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Analyze heading structure
  function analyzeHeadings() {
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingData = [];
    const foundIssues = [];
    
    // Convert NodeList to Array and map
    Array.from(allHeadings).forEach((h, index) => {
      const level = parseInt(h.tagName[1]);
      const text = h.textContent.trim();
      headingData.push({
        element: h,
        level: level,
        text: text,
        index: index
      });
    });

    // Check for common issues
    const h1Count = headingData.filter(h => h.level === 1).length;
    
    if (h1Count === 0) {
      foundIssues.push({
        type: 'critical',
        title: '❌ ไม่มี H1',
        message: 'ไม่พบ H1 ในหน้านี้',
        solution: 'เพิ่ม H1 ที่มี Primary Keyword เพื่อ SEO ที่ดี',
        impact: 'ส่งผลกระทบร้ายแรงต่อ SEO และ Featured Snippets'
      });
    } else if (h1Count > 1) {
      foundIssues.push({
        type: 'high',
        title: '⚠️ H1 มากกว่า 1 แท็ก',
        message: \`พบ H1 จำนวน \${h1Count} แท็ก\`,
        solution: 'ใช้ H1 เดียวและเปลี่ยนที่เหลือเป็น H2',
        impact: 'สร้างความสับสนให้ Search Engines',
        elements: headingData.filter(h => h.level === 1).slice(1)
      });
    }

    // Check for skipped levels
    let prevLevel = 0;
    headingData.forEach(h => {
      if (prevLevel > 0 && h.level > prevLevel + 1) {
        foundIssues.push({
          type: 'medium',
          title: '⚠️ ข้ามระดับ Heading',
          message: \`ข้ามจาก H\${prevLevel} ไป H\${h.level}\`,
          solution: \`ใช้ H\${prevLevel + 1} แทน H\${h.level}\`,
          impact: 'โครงสร้างไม่เป็นระเบียบ',
          element: h
        });
      }
      prevLevel = h.level;
    });

    // Check for empty headings
    headingData.forEach(h => {
      if (!h.text || h.text.length === 0) {
        foundIssues.push({
          type: 'high',
          title: '❌ Heading ว่างเปล่า',
          message: \`H\${h.level} ไม่มีข้อความ\`,
          solution: 'เพิ่มข้อความหรือลบแท็ก',
          impact: 'ไม่มีประโยชน์ต่อ SEO',
          element: h
        });
      } else if (h.text.length > 70) {
        foundIssues.push({
          type: 'low',
          title: '📏 Heading ยาวเกินไป',
          message: \`H\${h.level}: "\${h.text.substring(0, 30)}..." (\${h.text.length} ตัวอักษร)\`,
          solution: 'ย่อให้สั้นกว่า 70 ตัวอักษร',
          impact: 'อาจถูกตัดใน SERP',
          element: h
        });
      }
    });

    // Check H2 optimization
    const h2Count = headingData.filter(h => h.level === 2).length;
    if (h2Count < 2 && headingData.length > 3) {
      foundIssues.push({
        type: 'medium',
        title: '💡 H2 น้อยเกินไป',
        message: \`มี H2 เพียง \${h2Count} แท็ก\`,
        solution: 'เพิ่ม H2 อย่างน้อย 2-5 แท็กพร้อม LSI Keywords',
        impact: 'ลดโอกาสจัดอันดับ Long-tail Keywords'
      });
    }

    return { headingData, foundIssues };
  }

  const { headingData, foundIssues } = analyzeHeadings();

  // Create styles
  const styles = \`
    #headingsmap-overlay {
      position: fixed !important;
      top: 10px !important;
      left: 10px !important;
      width: 320px !important;
      max-height: 90vh !important;
      background: #1a1a2e !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }

    #headingsmap-overlay * {
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .hm-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      padding: 14px 16px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      cursor: move !important;
    }

    .hm-title {
      color: #ffffff !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    .hm-score {
      background: rgba(255, 255, 255, 0.2) !important;
      padding: 4px 12px !important;
      border-radius: 20px !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      color: #ffffff !important;
    }

    .hm-close {
      background: rgba(255, 255, 255, 0.2) !important;
      border: none !important;
      color: #ffffff !important;
      width: 24px !important;
      height: 24px !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      font-size: 16px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .hm-close:hover {
      background: rgba(255, 255, 255, 0.3) !important;
    }

    .hm-tabs {
      display: flex !important;
      background: #0f0f23 !important;
      border-bottom: 1px solid #2a2a4e !important;
    }

    .hm-tab {
      flex: 1 !important;
      padding: 10px !important;
      background: transparent !important;
      border: none !important;
      color: #9ca3af !important;
      font-size: 12px !important;
      cursor: pointer !important;
      border-bottom: 2px solid transparent !important;
      transition: all 0.2s !important;
    }

    .hm-tab.active {
      color: #ffffff !important;
      border-bottom-color: #667eea !important;
      background: #1a1a2e !important;
    }

    .hm-content {
      flex: 1 !important;
      overflow-y: auto !important;
      padding: 12px !important;
      background: #1a1a2e !important;
      max-height: calc(90vh - 100px) !important;
    }

    .hm-content::-webkit-scrollbar {
      width: 6px !important;
    }

    .hm-content::-webkit-scrollbar-track {
      background: #0f0f23 !important;
    }

    .hm-content::-webkit-scrollbar-thumb {
      background: #4a4a6e !important;
      border-radius: 3px !important;
    }

    /* Issues styles */
    .hm-issue-card {
      background: #0f0f23 !important;
      border-radius: 8px !important;
      padding: 12px !important;
      margin-bottom: 10px !important;
      border-left: 3px solid #667eea !important;
    }

    .hm-issue-card.critical {
      border-left-color: #ef4444 !important;
      background: rgba(239, 68, 68, 0.1) !important;
    }

    .hm-issue-card.high {
      border-left-color: #f59e0b !important;
      background: rgba(245, 158, 11, 0.1) !important;
    }

    .hm-issue-card.medium {
      border-left-color: #3b82f6 !important;
      background: rgba(59, 130, 246, 0.1) !important;
    }

    .hm-issue-card.low {
      border-left-color: #10b981 !important;
      background: rgba(16, 185, 129, 0.1) !important;
    }

    .hm-issue-title {
      color: #ffffff !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      margin-bottom: 6px !important;
    }

    .hm-issue-message {
      color: #d1d5db !important;
      font-size: 11px !important;
      margin-bottom: 8px !important;
      line-height: 1.4 !important;
    }

    .hm-issue-solution {
      background: rgba(16, 185, 129, 0.2) !important;
      color: #10b981 !important;
      padding: 6px 10px !important;
      border-radius: 6px !important;
      font-size: 11px !important;
      margin-bottom: 6px !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }

    .hm-issue-solution::before {
      content: "💡" !important;
    }

    .hm-issue-impact {
      color: #9ca3af !important;
      font-size: 10px !important;
      font-style: italic !important;
      margin-top: 4px !important;
    }

    .hm-issue-button {
      background: #667eea !important;
      color: white !important;
      border: none !important;
      padding: 4px 10px !important;
      border-radius: 4px !important;
      font-size: 10px !important;
      cursor: pointer !important;
      margin-top: 6px !important;
    }

    .hm-issue-button:hover {
      background: #764ba2 !important;
    }

    /* Heading tree styles */
    .hm-heading-item {
      color: #e5e7eb !important;
      padding: 8px 10px !important;
      margin: 3px 0 !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      font-size: 12px !important;
      position: relative !important;
      background: #0f0f23 !important;
    }

    .hm-heading-item:hover {
      background: #2a2a4e !important;
      transform: translateX(4px) !important;
    }

    .hm-heading-item.has-issue {
      border: 1px solid #f59e0b !important;
    }

    .hm-heading-item.level-1 {
      padding-left: 12px !important;
      font-weight: 600 !important;
      border-left: 3px solid #ef4444 !important;
    }

    .hm-heading-item.level-2 {
      padding-left: 32px !important;
      border-left: 3px solid #f59e0b !important;
      margin-left: 20px !important;
    }

    .hm-heading-item.level-3 {
      padding-left: 52px !important;
      border-left: 3px solid #10b981 !important;
      margin-left: 40px !important;
    }

    .hm-heading-item.level-4 {
      padding-left: 72px !important;
      border-left: 3px solid #3b82f6 !important;
      margin-left: 60px !important;
    }

    .hm-heading-item.level-5 {
      padding-left: 92px !important;
      border-left: 3px solid #8b5cf6 !important;
      margin-left: 80px !important;
    }

    .hm-heading-item.level-6 {
      padding-left: 112px !important;
      border-left: 3px solid #6b7280 !important;
      margin-left: 100px !important;
    }

    .hm-tag {
      background: #667eea !important;
      color: #ffffff !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      min-width: 24px !important;
      text-align: center !important;
    }

    .hm-heading-item.level-1 .hm-tag { background: #ef4444 !important; }
    .hm-heading-item.level-2 .hm-tag { background: #f59e0b !important; }
    .hm-heading-item.level-3 .hm-tag { background: #10b981 !important; }
    .hm-heading-item.level-4 .hm-tag { background: #3b82f6 !important; }
    .hm-heading-item.level-5 .hm-tag { background: #8b5cf6 !important; }
    .hm-heading-item.level-6 .hm-tag { background: #6b7280 !important; }

    .hm-text {
      flex: 1 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .hm-issue-indicator {
      width: 6px !important;
      height: 6px !important;
      background: #f59e0b !important;
      border-radius: 50% !important;
      animation: pulse 2s infinite !important;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .page-heading-highlight {
      background: rgba(102, 126, 234, 0.3) !important;
      outline: 3px solid #667eea !important;
      outline-offset: 2px !important;
      position: relative !important;
    }

    .page-heading-highlight::after {
      content: attr(data-hm-level) !important;
      position: absolute !important;
      top: -28px !important;
      left: 0 !important;
      background: #667eea !important;
      color: white !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      z-index: 2147483646 !important;
    }

    .hm-summary {
      background: #0f0f23 !important;
      padding: 12px !important;
      border-radius: 8px !important;
      margin-bottom: 12px !important;
    }

    .hm-summary-title {
      color: #9ca3af !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      margin-bottom: 8px !important;
    }

    .hm-summary-stats {
      display: flex !important;
      gap: 12px !important;
      flex-wrap: wrap !important;
    }

    .hm-stat {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      font-size: 12px !important;
    }

    .hm-stat-label {
      color: #9ca3af !important;
    }

    .hm-stat-value {
      color: #ffffff !important;
      font-weight: 600 !important;
    }

    .hm-stat-value.good { color: #10b981 !important; }
    .hm-stat-value.warning { color: #f59e0b !important; }
    .hm-stat-value.error { color: #ef4444 !important; }

    .hm-empty {
      color: #9ca3af !important;
      text-align: center !important;
      padding: 40px 20px !important;
      font-size: 13px !important;
    }
  \`;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Calculate score
  let calculatedScore = 100;
  foundIssues.forEach(issue => {
    if (issue.type === 'critical') calculatedScore -= 30;
    else if (issue.type === 'high') calculatedScore -= 15;
    else if (issue.type === 'medium') calculatedScore -= 10;
    else if (issue.type === 'low') calculatedScore -= 5;
  });
  calculatedScore = Math.max(0, calculatedScore);

  // Create overlay HTML
  const overlayHTML = \`
    <div class="hm-header">
      <div class="hm-title">
        🗂️ HeadingsMap
        <span class="hm-score">\${calculatedScore}/100</span>
      </div>
      <button class="hm-close" id="hm-close">✕</button>
    </div>
    
    <div class="hm-tabs">
      <button class="hm-tab active" data-tab="issues">ปัญหา (\${foundIssues.length})</button>
      <button class="hm-tab" data-tab="structure">โครงสร้าง</button>
    </div>
    
    <div class="hm-content" id="hm-issues-content">
      <!-- Issues content -->
    </div>
    
    <div class="hm-content" id="hm-structure-content" style="display: none;">
      <!-- Structure content -->
    </div>
  \`;

  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'headingsmap-overlay';
  overlay.innerHTML = overlayHTML;
  document.body.appendChild(overlay);

  // Populate issues tab
  const issuesContent = document.getElementById('hm-issues-content');
  
  if (foundIssues.length > 0) {
    // Add summary
    const summaryHTML = \`
      <div class="hm-summary">
        <div class="hm-summary-title">สรุปผล</div>
        <div class="hm-summary-stats">
          <div class="hm-stat">
            <span class="hm-stat-label">Score:</span>
            <span class="hm-stat-value \${calculatedScore >= 80 ? 'good' : calculatedScore >= 60 ? 'warning' : 'error'}">\${calculatedScore}/100</span>
          </div>
          <div class="hm-stat">
            <span class="hm-stat-label">H1:</span>
            <span class="hm-stat-value \${headingData.filter(h => h.level === 1).length === 1 ? 'good' : 'error'}">\${headingData.filter(h => h.level === 1).length}</span>
          </div>
          <div class="hm-stat">
            <span class="hm-stat-label">Total:</span>
            <span class="hm-stat-value">\${headingData.length}</span>
          </div>
        </div>
      </div>
    \`;
    issuesContent.innerHTML = summaryHTML;

    // Add issues
    foundIssues.forEach(issue => {
      const issueCard = document.createElement('div');
      issueCard.className = \`hm-issue-card \${issue.type}\`;
      issueCard.innerHTML = \`
        <div class="hm-issue-title">\${issue.title}</div>
        <div class="hm-issue-message">\${issue.message}</div>
        <div class="hm-issue-solution">\${issue.solution}</div>
        \${issue.impact ? \`<div class="hm-issue-impact">⚠️ \${issue.impact}</div>\` : ''}
        \${issue.element ? \`<button class="hm-issue-button" data-element-index="\${issue.element.index}">ดูตำแหน่ง</button>\` : ''}
      \`;
      issuesContent.appendChild(issueCard);
    });
  } else {
    issuesContent.innerHTML = \`
      <div class="hm-empty">
        ✅ ไม่พบปัญหาในโครงสร้าง Heading!<br>
        Score: \${calculatedScore}/100
      </div>
    \`;
  }

  // Populate structure tab
  const structureContent = document.getElementById('hm-structure-content');
  
  if (headingData.length > 0) {
    headingData.forEach((heading) => {
      const item = document.createElement('div');
      const hasIssue = foundIssues.some(issue => 
        issue.element && issue.element.index === heading.index
      );
      
      item.className = \`hm-heading-item level-\${heading.level} \${hasIssue ? 'has-issue' : ''}\`;
      item.dataset.index = heading.index;
      
      item.innerHTML = \`
        <span class="hm-tag">H\${heading.level}</span>
        <span class="hm-text">\${heading.text || '(empty)'}</span>
        \${hasIssue ? '<span class="hm-issue-indicator"></span>' : ''}
      \`;
      
      structureContent.appendChild(item);
    });
  } else {
    structureContent.innerHTML = '<div class="hm-empty">ไม่พบ Heading ในหน้านี้</div>';
  }

  // Tab switching
  document.querySelectorAll('.hm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.hm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      document.getElementById('hm-issues-content').style.display = tabName === 'issues' ? 'block' : 'none';
      document.getElementById('hm-structure-content').style.display = tabName === 'structure' ? 'block' : 'none';
    });
  });

  // Click handlers for "ดูตำแหน่ง" buttons
  document.querySelectorAll('.hm-issue-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.elementIndex);
      const heading = headingData[index];
      if (heading && heading.element) {
        // Remove previous highlights
        document.querySelectorAll('.page-heading-highlight').forEach(el => {
          el.classList.remove('page-heading-highlight');
          el.removeAttribute('data-hm-level');
        });
        
        // Highlight this heading
        heading.element.classList.add('page-heading-highlight');
        heading.element.setAttribute('data-hm-level', 'H' + heading.level + ' - ต้องแก้ไข');
        heading.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // Click handlers for structure items
  document.querySelectorAll('.hm-heading-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      const heading = headingData[index];
      if (heading && heading.element) {
        // Remove previous highlights
        document.querySelectorAll('.page-heading-highlight').forEach(el => {
          el.classList.remove('page-heading-highlight');
          el.removeAttribute('data-hm-level');
        });
        
        // Highlight this heading
        heading.element.classList.add('page-heading-highlight');
        heading.element.setAttribute('data-hm-level', 'H' + heading.level);
        heading.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // Make draggable
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  const header = document.querySelector('.hm-header');
  
  header.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    dragOffset.x = e.clientX - overlay.offsetLeft;
    dragOffset.y = e.clientY - overlay.offsetTop;
    overlay.style.cursor = 'grabbing';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    overlay.style.left = (e.clientX - dragOffset.x) + 'px';
    overlay.style.top = (e.clientY - dragOffset.y) + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    overlay.style.cursor = 'grab';
  });

  // Close button
  document.getElementById('hm-close').addEventListener('click', () => {
    overlay.remove();
    styleSheet.remove();
    document.querySelectorAll('.page-heading-highlight').forEach(el => {
      el.classList.remove('page-heading-highlight');
      el.removeAttribute('data-hm-level');
    });
  });

  console.log('✅ HeadingsMap with Issues Detection loaded!');
  console.log('📊 Score:', calculatedScore + '/100');
  console.log('⚠️ Issues found:', foundIssues.length);
})();
`;
};

// Export for use in component
export const openWithIssuesOverlay = (url, headingHierarchy, issues, score) => {
  const scriptCode = generateHeadingsMapWithIssues(headingHierarchy, issues, score);
  
  navigator.clipboard.writeText(scriptCode).then(() => {
    alert(`
🎯 HeadingsMap with Issues Detection

1. หน้าเว็บจะเปิดในแท็บใหม่
2. Script ถูกคัดลอกไปยัง clipboard แล้ว
3. กด F12 > Console
4. วาง (Ctrl+V) แล้วกด Enter

✨ Features:
• แท็บ "ปัญหา" - แสดงปัญหาและวิธีแก้ไข
• แท็บ "โครงสร้าง" - แสดง heading tree
• คลิก "ดูตำแหน่ง" เพื่อ highlight heading ที่มีปัญหา
• Score แสดงคุณภาพโครงสร้าง heading
    `);
    
    window.open(url, '_blank');
  }).catch(() => {
    console.log('Script:', scriptCode);
    window.open(url, '_blank');
  });
};