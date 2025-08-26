// Popup script for Chrome Extension
let isActive = false;

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const toggleBtn = document.getElementById('toggleBtn');
  const toggleText = document.getElementById('toggleText');
  const toggleIcon = document.getElementById('toggleIcon');
  const statsEl = document.getElementById('stats');
  const issuesListEl = document.getElementById('issuesList');
  const loadingEl = document.getElementById('loading');
  
  // Check current status
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.storage.local.get(['active', 'data'], (result) => {
    isActive = result.active || false;
    updateUI(isActive, result.data);
  });
  
  // Toggle button click
  toggleBtn.addEventListener('click', async () => {
    isActive = !isActive;
    
    if (isActive) {
      // Show loading
      loadingEl.style.display = 'block';
      statsEl.style.display = 'none';
      issuesListEl.style.display = 'none';
      
      // Analyze current page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script to activate
      chrome.tabs.sendMessage(tab.id, { 
        action: 'activate',
        url: tab.url 
      }, (response) => {
        if (response && response.data) {
          updateUI(true, response.data);
          chrome.storage.local.set({ 
            active: true, 
            data: response.data 
          });
        }
        loadingEl.style.display = 'none';
      });
    } else {
      // Deactivate
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'deactivate' });
      chrome.storage.local.set({ active: false, data: null });
      updateUI(false, null);
    }
  });
  
  function updateUI(active, data) {
    if (active) {
      statusEl.textContent = 'เปิดใช้งาน';
      statusEl.className = 'status-value status-active';
      toggleBtn.className = 'toggle-btn deactivate';
      toggleText.textContent = 'ปิด Live Mode';
      toggleIcon.textContent = '🛑';
      
      if (data) {
        // Update stats
        document.getElementById('scoreValue').textContent = data.score || '0';
        document.getElementById('h1Count').textContent = data.h1Count || '0';
        document.getElementById('totalHeadings').textContent = data.totalHeadings || '0';
        document.getElementById('issuesCount').textContent = data.issues ? data.issues.length : '0';
        
        // Show issues
        const issuesContent = document.getElementById('issuesContent');
        if (data.issues && data.issues.length > 0) {
          issuesContent.innerHTML = data.issues.slice(0, 5).map(issue => `
            <div class="issue-item ${issue.severity || 'medium'}">
              <span>${issue.message}</span>
            </div>
          `).join('');
          issuesListEl.style.display = 'block';
        } else {
          issuesContent.innerHTML = '<p style="color: #16a34a; text-align: center;">✅ ไม่พบปัญหา</p>';
          issuesListEl.style.display = 'block';
        }
        
        statsEl.style.display = 'grid';
      }
    } else {
      statusEl.textContent = 'ปิดใช้งาน';
      statusEl.className = 'status-value status-inactive';
      toggleBtn.className = 'toggle-btn activate';
      toggleText.textContent = 'เปิด Live Mode';
      toggleIcon.textContent = '🚀';
      statsEl.style.display = 'none';
      issuesListEl.style.display = 'none';
    }
  }
});