// options.js - Chrome Extension Options Page
(function () {
  const FIELDS = {
    'supabase-url': 'supabase_url',
    'supabase-key': 'supabase_anon_key',
    'web-url': 'web_app_url',
  }

  // Load saved config
  chrome.storage.local.get(
    ['supabase_url', 'supabase_anon_key', 'web_app_url', 'supabase_auth_token'],
    (result) => {
      document.getElementById('supabase-url').value = result.supabase_url || ''
      document.getElementById('supabase-key').value = result.supabase_anon_key || ''
      document.getElementById('web-url').value = result.web_app_url || 'http://localhost:3000'

      // Auth status
      const statusEl = document.getElementById('auth-status')
      if (result.supabase_auth_token) {
        statusEl.textContent = '✅ 已登录'
        statusEl.style.color = '#2e7d32'
      } else {
        statusEl.textContent = '❌ 未登录 — 请先在 Web 面板登录，扩展会自动同步认证状态'
        statusEl.style.color = '#c62828'
      }
    }
  )

  // Save
  document.getElementById('save-btn').addEventListener('click', () => {
    const data = {}
    for (const [elId, storageKey] of Object.entries(FIELDS)) {
      data[storageKey] = document.getElementById(elId).value.trim()
    }

    chrome.storage.local.set(data, () => {
      const statusEl = document.getElementById('save-status')
      statusEl.textContent = '✅ 配置已保存'
      statusEl.className = 'status success'
      setTimeout(() => { statusEl.style.display = 'none' }, 3000)
    })
  })
})()
