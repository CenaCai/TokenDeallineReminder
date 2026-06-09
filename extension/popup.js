// popup.js - Chrome Extension Popup
(function () {
  const SUPABASE_URL_KEY = 'supabase_url'
  const SUPABASE_KEY_KEY = 'supabase_anon_key'
  const AUTH_TOKEN_KEY = 'supabase_auth_token'
  const WEB_URL_KEY = 'web_app_url'

  // Default web URL
  const DEFAULT_WEB_URL = 'http://localhost:3000'

  // Get config
  async function getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        [SUPABASE_URL_KEY, SUPABASE_KEY_KEY, AUTH_TOKEN_KEY, WEB_URL_KEY],
        (result) => resolve(result)
      )
    })
  }

  // Fetch subscriptions from Supabase
  async function fetchSubscriptions(config) {
    if (!config[SUPABASE_URL_KEY] || !config[SUPABASE_KEY_KEY]) {
      return []
    }

    const token = config[AUTH_TOKEN_KEY]
    if (!token) return []

    const url = `${config[SUPABASE_URL_KEY]}/rest/v1/subscriptions?order=expire_date.asc&select=*,category:categories(*)`

    const res = await fetch(url, {
      headers: {
        apikey: config[SUPABASE_KEY_KEY],
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) return []
    return res.json()
  }

  // Calculate status
  function calcStatus(expireDate) {
    if (!expireDate) return 'active'
    const now = new Date()
    const exp = new Date(expireDate)
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (diff < 0) return 'expired'
    if (diff <= 7) return 'expiring_soon'
    return 'active'
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  function formatCurrency(amount, currency) {
    const symbols = { CNY: '¥', USD: '$', EUR: '€', GBP: '£' }
    return `${symbols[currency] || currency} ${parseFloat(amount).toFixed(2)}`
  }

  // Render
  async function render() {
    const config = await getConfig()
    const subs = await fetchSubscriptions(config)

    // Re-calculate status
    const processed = subs.map(s => ({
      ...s,
      status: calcStatus(s.expire_date),
      days: daysUntil(s.expire_date),
    }))

    // Stats
    const total = processed.length
    const expiring = processed.filter(s => s.status === 'expiring_soon').length
    const expired = processed.filter(s => s.status === 'expired').length

    document.getElementById('total-count').textContent = total
    document.getElementById('expiring-count').textContent = expiring
    document.getElementById('expired-count').textContent = expired

    // Expiring soon list
    const expiringList = document.getElementById('expiring-list')
    const expiringItems = processed.filter(s => s.status === 'expiring_soon')
    if (expiringItems.length === 0) {
      expiringList.innerHTML = '<p class="empty-text">暂无即将到期的订阅 🎉</p>'
    } else {
      expiringList.innerHTML = expiringItems.map(s => `
        <div class="sub-item">
          <div>
            <div class="sub-name">${s.name}</div>
            <div class="sub-meta">${s.days}天后到期 · ${formatCurrency(s.amount, s.currency)}</div>
          </div>
          <span class="sub-badge badge-warning">即将到期</span>
        </div>
      `).join('')
    }

    // Expired list
    const expiredList = document.getElementById('expired-list')
    const expiredItems = processed.filter(s => s.status === 'expired')
    if (expiredItems.length === 0) {
      expiredList.innerHTML = '<p class="empty-text">暂无已过期的订阅</p>'
    } else {
      expiredList.innerHTML = expiredItems.map(s => `
        <div class="sub-item">
          <div>
            <div class="sub-name">${s.name}</div>
            <div class="sub-meta">已过期${Math.abs(s.days)}天 · ${formatCurrency(s.amount, s.currency)}</div>
          </div>
          <span class="sub-badge badge-danger">已过期</span>
        </div>
      `).join('')
    }

    // Open web button
    document.getElementById('open-web').addEventListener('click', (e) => {
      e.preventDefault()
      chrome.tabs.create({ url: config[WEB_URL_KEY] || DEFAULT_WEB_URL })
    })

    // Open settings
    document.getElementById('open-settings').addEventListener('click', (e) => {
      e.preventDefault()
      chrome.runtime.openOptionsPage()
    })
  }

  render()
})()
