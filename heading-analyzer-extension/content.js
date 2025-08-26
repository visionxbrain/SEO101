// Content script that runs on every page
let overlayActive = false;
let overlayElement = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'activate') {
    activateOverlay(request.url);
    analyzeHeadings().then(data => {
      sendResponse({ data });
    });
    return true; // Keep message channel open for async response
  } else if (request.action === 'deactivate') {
    deactivateOverlay();
    sendResponse({ success: true });
  }
});

async function analyzeHeadings() {
  // Get all headings
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingData = [];
  let h1Count = 0;
  const issues = [];
  
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName[1]);
    const text = heading.textContent.trim();
    
    if (level === 1) h1Count++;
    
    headingData.push({
      level,
      tag: heading.tagName,
      text: text || '(empty)',
      element: heading
    });
    
    // Check for issues
    if (level === 1 && !text) {
      issues.push({
        type: 'empty_heading',
        severity: 'critical',
        message: 'พบ H1 ที่ไม่มีข้อความ',
        element: heading
      });
    }
    
    if (text.length > 70) {
      issues.push({
        type: 'too_long',
        severity: 'medium',
        message: `${heading.tagName} ยาวเกินไป (${text.length} ตัวอักษร)`,
        element: heading
      });
    }
  });
  
  // Check for missing H1
  if (h1Count === 0) {
    issues.push({
      type: 'missing_h1',
      severity: 'critical',
      message: 'ไม่พบ H1 ในหน้าเว็บ'
    });
  }
  
  // Check for multiple H1
  if (h1Count > 1) {
    issues.push({
      type: 'multiple_h1',
      severity: 'high',
      message: `พบ H1 มากกว่า 1 แท็ก (${h1Count} แท็ก)`
    });
  }
  
  // Calculate score
  let score = 100;
  issues.forEach(issue => {
    if (issue.severity === 'critical') score -= 20;
    else if (issue.severity === 'high') score -= 10;
    else if (issue.severity === 'medium') score -= 5;
  });
  score = Math.max(0, score);
  
  return {
    score,
    h1Count,
    totalHeadings: headings.length,
    issues,
    headingData
  };
}

function activateOverlay(url) {
  if (overlayActive) return;
  
  // Create overlay element
  overlayElement = document.createElement('div');
  overlayElement.id = 'heading-analyzer-overlay';
  overlayElement.innerHTML = `
    <div class="ha-panel">
      <div class="ha-panel-header">
        <h3>📊 Heading Analyzer</h3>
        <button class="ha-close-btn">×</button>
      </div>
      <div class="ha-panel-content">
        <div class="ha-loading">
          <div class="ha-spinner"></div>
          <p>กำลังวิเคราะห์...</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlayElement);
  overlayActive = true;
  
  // Add close button handler
  const closeBtn = overlayElement.querySelector('.ha-close-btn');
  closeBtn.addEventListener('click', deactivateOverlay);
  
  // Analyze and update panel
  analyzeHeadings().then(data => {
    updatePanel(data);
    highlightHeadings(data);
  });
}

function updatePanel(data) {
  if (!overlayElement) return;
  
  const content = overlayElement.querySelector('.ha-panel-content');
  content.innerHTML = `
    <div class="ha-score">
      <div class="ha-score-value ${getScoreClass(data.score)}">${data.score}/100</div>
      <div class="ha-score-label">SEO Score</div>
    </div>
    
    <div class="ha-stats">
      <div class="ha-stat">
        <span class="ha-stat-value">${data.h1Count}</span>
        <span class="ha-stat-label">H1 Tags</span>
      </div>
      <div class="ha-stat">
        <span class="ha-stat-value">${data.totalHeadings}</span>
        <span class="ha-stat-label">Total</span>
      </div>
      <div class="ha-stat">
        <span class="ha-stat-value">${data.issues.length}</span>
        <span class="ha-stat-label">Issues</span>
      </div>
    </div>
    
    <div class="ha-issues">
      <h4>ปัญหาที่พบ</h4>
      ${data.issues.length > 0 ? 
        data.issues.map(issue => `
          <div class="ha-issue ${issue.severity}">
            <span class="ha-issue-icon">${getIssueIcon(issue.severity)}</span>
            <span class="ha-issue-text">${issue.message}</span>
          </div>
        `).join('') :
        '<p class="ha-no-issues">✅ ไม่พบปัญหา</p>'
      }
    </div>
    
    <button class="ha-toggle-highlights">
      🎯 Toggle Highlights
    </button>
  `;
  
  // Add toggle highlights handler
  const toggleBtn = content.querySelector('.ha-toggle-highlights');
  toggleBtn.addEventListener('click', () => toggleHighlights(data));
}

function highlightHeadings(data) {
  // Remove existing highlights
  document.querySelectorAll('.ha-heading-highlight').forEach(el => {
    el.classList.remove('ha-heading-highlight', 'ha-critical', 'ha-warning', 'ha-info');
  });
  
  // Add highlights to problematic headings
  data.headingData.forEach(heading => {
    const element = heading.element;
    if (!element) return;
    
    element.classList.add('ha-heading-highlight');
    
    // Add severity class based on issues
    const hasIssue = data.issues.find(i => i.element === element);
    if (hasIssue) {
      if (hasIssue.severity === 'critical') {
        element.classList.add('ha-critical');
      } else if (hasIssue.severity === 'high') {
        element.classList.add('ha-warning');
      } else {
        element.classList.add('ha-info');
      }
    }
  });
}

function toggleHighlights(data) {
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    heading.classList.toggle('ha-heading-highlight');
  });
}

function deactivateOverlay() {
  if (overlayElement) {
    overlayElement.remove();
    overlayElement = null;
  }
  
  // Remove all highlights
  document.querySelectorAll('.ha-heading-highlight').forEach(el => {
    el.classList.remove('ha-heading-highlight', 'ha-critical', 'ha-warning', 'ha-info');
  });
  
  overlayActive = false;
}

function getScoreClass(score) {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

function getIssueIcon(severity) {
  if (severity === 'critical') return '🔴';
  if (severity === 'high') return '🟠';
  if (severity === 'medium') return '🟡';
  return '🔵';
}