// HeadingsMap Overlay - Live Heading Structure Viewer
export const generateOverlayScript = (headingHierarchy) => {
  return `
(function() {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById('headingsmap-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Create styles
  const styles = \`
    #headingsmap-overlay {
      position: fixed;
      top: 10px;
      left: 10px;
      width: 260px;
      max-height: calc(100vh - 20px);
      background: #2c2c3e;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .hm-header {
      background: #1f1f2e;
      padding: 12px 16px;
      border-bottom: 1px solid #3a3a4e;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move;
    }

    .hm-title {
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hm-icon {
      width: 16px;
      height: 16px;
    }

    .hm-controls {
      display: flex;
      gap: 8px;
    }

    .hm-btn {
      background: transparent;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .hm-btn:hover {
      background: #3a3a4e;
      color: #ffffff;
    }

    .hm-tabs {
      display: flex;
      background: #1f1f2e;
      padding: 0 8px;
    }

    .hm-tab {
      flex: 1;
      padding: 8px 12px;
      background: transparent;
      border: none;
      color: #9ca3af;
      font-size: 12px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .hm-tab.active {
      color: #ffffff;
      border-bottom-color: #3b82f6;
    }

    .hm-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      max-height: calc(100vh - 120px);
      background: #2c2c3e;
    }

    .hm-content::-webkit-scrollbar {
      width: 6px;
    }

    .hm-content::-webkit-scrollbar-track {
      background: #1f1f2e;
    }

    .hm-content::-webkit-scrollbar-thumb {
      background: #4a4a5e;
      border-radius: 3px;
    }

    .hm-tree-item {
      color: #e5e7eb;
      padding: 6px 8px;
      margin: 2px 0;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      position: relative;
    }

    .hm-tree-item:hover {
      background: #3a3a4e;
    }

    .hm-tree-item.highlighted {
      background: #3b82f6;
    }

    .hm-tree-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      border-radius: 2px;
    }

    .hm-tree-item.level-1 {
      padding-left: 12px;
      font-weight: 600;
    }

    .hm-tree-item.level-1::before {
      background: #ef4444;
    }

    .hm-tree-item.level-2 {
      padding-left: 28px;
    }

    .hm-tree-item.level-2::before {
      background: #f59e0b;
      left: 16px;
    }

    .hm-tree-item.level-3 {
      padding-left: 44px;
    }

    .hm-tree-item.level-3::before {
      background: #10b981;
      left: 32px;
    }

    .hm-tree-item.level-4 {
      padding-left: 60px;
    }

    .hm-tree-item.level-4::before {
      background: #3b82f6;
      left: 48px;
    }

    .hm-tree-item.level-5 {
      padding-left: 76px;
    }

    .hm-tree-item.level-5::before {
      background: #8b5cf6;
      left: 64px;
    }

    .hm-tree-item.level-6 {
      padding-left: 92px;
    }

    .hm-tree-item.level-6::before {
      background: #6b7280;
      left: 80px;
    }

    .hm-tag {
      background: #3a3a4e;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 700;
      min-width: 24px;
      text-align: center;
    }

    .hm-tree-item.level-1 .hm-tag {
      background: #ef4444;
    }

    .hm-tree-item.level-2 .hm-tag {
      background: #f59e0b;
    }

    .hm-tree-item.level-3 .hm-tag {
      background: #10b981;
    }

    .hm-tree-item.level-4 .hm-tag {
      background: #3b82f6;
    }

    .hm-tree-item.level-5 .hm-tag {
      background: #8b5cf6;
    }

    .hm-tree-item.level-6 .hm-tag {
      background: #6b7280;
    }

    .hm-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hm-landmarks {
      padding: 8px;
      background: #1f1f2e;
      border-top: 1px solid #3a3a4e;
    }

    .hm-landmark-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      color: #9ca3af;
      font-size: 11px;
      border-radius: 4px;
      margin: 2px 0;
      cursor: pointer;
    }

    .hm-landmark-item:hover {
      background: #3a3a4e;
      color: #ffffff;
    }

    .hm-landmark-tag {
      background: #4a4a5e;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
    }

    .hm-empty {
      color: #9ca3af;
      text-align: center;
      padding: 40px 20px;
      font-size: 13px;
    }

    .page-heading-highlight {
      background: rgba(59, 130, 246, 0.3) !important;
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px;
      position: relative !important;
    }

    .page-heading-highlight::after {
      content: attr(data-hm-level);
      position: absolute;
      top: -24px;
      left: 0;
      background: #3b82f6;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 2147483646;
    }
  \`;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Create overlay HTML
  const overlayHTML = \`
    <div class="hm-header">
      <div class="hm-title">
        <svg class="hm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
        HeadingsMap
      </div>
      <div class="hm-controls">
        <button class="hm-btn" id="hm-minimize">−</button>
        <button class="hm-btn" id="hm-close">✕</button>
      </div>
    </div>
    
    <div class="hm-tabs">
      <button class="hm-tab active" data-tab="headings">Headings</button>
      <button class="hm-tab" data-tab="landmarks">Landmarks</button>
    </div>
    
    <div class="hm-content" id="hm-headings-content">
      <!-- Headings will be inserted here -->
    </div>
    
    <div class="hm-content" id="hm-landmarks-content" style="display: none;">
      <!-- Landmarks will be inserted here -->
    </div>
  \`;

  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'headingsmap-overlay';
  overlay.innerHTML = overlayHTML;
  document.body.appendChild(overlay);

  // Parse heading data
  const headings = ${JSON.stringify(headingHierarchy)};

  // Populate headings
  const headingsContent = document.getElementById('hm-headings-content');
  if (headings && headings.length > 0) {
    headings.forEach((heading, index) => {
      const item = document.createElement('div');
      item.className = \`hm-tree-item level-\${heading.level}\`;
      item.dataset.index = index;
      
      const tag = document.createElement('span');
      tag.className = 'hm-tag';
      tag.textContent = \`H\${heading.level}\`;
      
      const text = document.createElement('span');
      text.className = 'hm-text';
      text.textContent = heading.text || '(empty)';
      text.title = heading.full_text || heading.text || '(empty)';
      
      item.appendChild(tag);
      item.appendChild(text);
      headingsContent.appendChild(item);
    });
  } else {
    headingsContent.innerHTML = '<div class="hm-empty">ไม่พบ Heading ในหน้านี้</div>';
  }

  // Populate landmarks
  const landmarksContent = document.getElementById('hm-landmarks-content');
  const landmarks = [
    { tag: 'header', count: document.querySelectorAll('header').length },
    { tag: 'nav', count: document.querySelectorAll('nav').length },
    { tag: 'main', count: document.querySelectorAll('main').length },
    { tag: 'article', count: document.querySelectorAll('article').length },
    { tag: 'section', count: document.querySelectorAll('section').length },
    { tag: 'aside', count: document.querySelectorAll('aside').length },
    { tag: 'footer', count: document.querySelectorAll('footer').length }
  ];

  landmarks.forEach(landmark => {
    if (landmark.count > 0) {
      const item = document.createElement('div');
      item.className = 'hm-landmark-item';
      item.innerHTML = \`
        <span class="hm-landmark-tag">\${landmark.tag}</span>
        <span>\${landmark.count} element\${landmark.count > 1 ? 's' : ''}</span>
      \`;
      landmarksContent.appendChild(item);
    }
  });

  if (landmarksContent.children.length === 0) {
    landmarksContent.innerHTML = '<div class="hm-empty">ไม่พบ Semantic HTML5 Elements</div>';
  }

  // Tab switching
  document.querySelectorAll('.hm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.hm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      document.getElementById('hm-headings-content').style.display = tabName === 'headings' ? 'block' : 'none';
      document.getElementById('hm-landmarks-content').style.display = tabName === 'landmarks' ? 'block' : 'none';
    });
  });

  // Heading click to highlight
  document.querySelectorAll('.hm-tree-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      const heading = headings[index];
      if (!heading) return;
      
      // Remove all highlights
      document.querySelectorAll('.page-heading-highlight').forEach(el => {
        el.classList.remove('page-heading-highlight');
        el.removeAttribute('data-hm-level');
      });
      
      // Remove all highlighted class from tree items
      document.querySelectorAll('.hm-tree-item').forEach(i => i.classList.remove('highlighted'));
      
      // Highlight this tree item
      item.classList.add('highlighted');
      
      // Find and highlight the heading on page
      const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      allHeadings.forEach(el => {
        const level = parseInt(el.tagName[1]);
        const text = el.textContent.trim();
        
        if (level === heading.level && text === heading.full_text) {
          el.classList.add('page-heading-highlight');
          el.setAttribute('data-hm-level', 'H' + level);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  });

  // Landmark click to highlight
  document.querySelectorAll('.hm-landmark-item').forEach(item => {
    item.addEventListener('click', () => {
      const tagName = item.querySelector('.hm-landmark-tag').textContent;
      const elements = document.querySelectorAll(tagName);
      
      // Remove all highlights
      document.querySelectorAll('.page-heading-highlight').forEach(el => {
        el.classList.remove('page-heading-highlight');
      });
      
      // Highlight landmarks
      elements.forEach(el => {
        el.classList.add('page-heading-highlight');
        el.setAttribute('data-hm-level', tagName.toUpperCase());
      });
      
      if (elements[0]) {
        elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  // Minimize
  let isMinimized = false;
  document.getElementById('hm-minimize').addEventListener('click', () => {
    isMinimized = !isMinimized;
    if (isMinimized) {
      overlay.style.height = '40px';
      overlay.style.overflow = 'hidden';
      document.querySelector('.hm-tabs').style.display = 'none';
      document.querySelector('.hm-content').style.display = 'none';
      document.getElementById('hm-minimize').textContent = '□';
    } else {
      overlay.style.height = 'auto';
      overlay.style.overflow = 'visible';
      document.querySelector('.hm-tabs').style.display = 'flex';
      document.querySelector('.hm-content').style.display = 'block';
      document.getElementById('hm-minimize').textContent = '−';
    }
  });

  // Close
  document.getElementById('hm-close').addEventListener('click', () => {
    overlay.remove();
    styleSheet.remove();
    document.querySelectorAll('.page-heading-highlight').forEach(el => {
      el.classList.remove('page-heading-highlight');
      el.removeAttribute('data-hm-level');
    });
  });
})();
`;
};

// Function to inject the overlay into current page
export const injectOverlay = (headingHierarchy) => {
  const script = document.createElement('script');
  script.textContent = generateOverlayScript(headingHierarchy);
  document.body.appendChild(script);
};

// Function to open URL with overlay
export const openWithOverlay = (url, headingHierarchy) => {
  // Create bookmarklet code
  const scriptCode = generateOverlayScript(headingHierarchy);
  const bookmarkletCode = `javascript:(${encodeURIComponent(scriptCode)})();`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(bookmarkletCode).then(() => {
    alert(`
🎯 HeadingsMap Live Mode

1. หน้าเว็บจะเปิดในแท็บใหม่
2. โค้ดสำหรับแสดง HeadingsMap ถูกคัดลอกไปยัง clipboard แล้ว
3. วางโค้ดใน Console (F12 > Console) แล้วกด Enter
4. HeadingsMap จะแสดงที่มุมซ้ายบน

คลิกที่ heading ใดๆ เพื่อ highlight บนหน้าเว็บ!
    `);
    
    // Open URL in new tab
    window.open(url, '_blank');
  }).catch(() => {
    // Fallback if clipboard fails
    console.log('Script to paste in console:', scriptCode);
    window.open(url, '_blank');
  });
};