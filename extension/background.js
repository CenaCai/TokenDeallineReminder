// background.js - Chrome Extension Service Worker (Manifest V3)
// Handles periodic alarm checks and notification delivery

const ALARM_NAME = 'check-reminders'
const CHECK_INTERVAL_MINUTES = 60 // Check every hour

// Install / startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('[要到期啦] Extension installed')
  // Set up periodic alarm
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1, // First check after 1 minute
    periodInMinutes: CHECK_INTERVAL_MINUTES,
  })
})

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES,
  })
})

// Alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await checkAndNotify()
  }
})

// Main check function
async function checkAndNotify() {
  const config = await getConfig()
  if (!config.supabase_url || !config.supabase_anon_key || !config.supabase_auth_token) {
    return
  }

  try {
    const subs = await fetchSubscriptions(config)
    const today = new Date().toISOString().split('T')[0]

    // Check which subscriptions need notification today
    for (const sub of subs) {
      if (!sub.expire_date) continue

      const days = daysUntil(sub.expire_date)
      const lastNotified = await getLastNotified(sub.id)

      // Skip if already notified today
      if (lastNotified === today) continue

      // Get reminder policy
      const policies = await fetchReminderPolicies(config, sub.id)
      if (!policies || policies.length === 0) continue

      const policy = policies[0]
      if (!policy.is_enabled) continue

      // Check if should notify
      const shouldNotify = policy.days_before.some(d => {
        if (d === 0) return days === 0
        if (d === -1) return days < 0
        return days === d
      })

      if (!shouldNotify) continue

      // Check channel includes chrome
      if (!policy.channels.includes('chrome')) continue

      // Send Chrome notification
      const daysText = days < 0
        ? `已过期 ${Math.abs(days)} 天`
        : days === 0
          ? '今天到期'
          : `${days} 天后到期`

      chrome.notifications.create(`sub-${sub.id}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `🔔 ${sub.name} 到期提醒`,
        message: `你的 ${sub.name} 订阅${daysText}，请及时处理。`,
        priority: 2,
      })

      // Record notification
      await setLastNotified(sub.id, today)
    }
  } catch (err) {
    console.error('[要到期啦] Check error:', err)
  }
}

// Helper: get config from storage
function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['supabase_url', 'supabase_anon_key', 'supabase_auth_token'],
      (result) => resolve(result)
    )
  })
}

// Helper: fetch subscriptions
async function fetchSubscriptions(config) {
  const url = `${config.supabase_url}/rest/v1/subscriptions?status=neq.cancelled&order=expire_date.asc`
  const res = await fetch(url, {
    headers: {
      apikey: config.supabase_anon_key,
      Authorization: `Bearer ${config.supabase_auth_token}`,
    },
  })
  if (!res.ok) return []
  return res.json()
}

// Helper: fetch reminder policy
async function fetchReminderPolicies(config, subId) {
  const url = `${config.supabase_url}/rest/v1/reminder_policies?subscription_id=eq.${subId}`
  const res = await fetch(url, {
    headers: {
      apikey: config.supabase_anon_key,
      Authorization: `Bearer ${config.supabase_auth_token}`,
    },
  })
  if (!res.ok) return []
  return res.json()
}

// Helper: days until
function daysUntil(dateStr) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// Helper: get/set last notified date
async function getLastNotified(subId) {
  return new Promise((resolve) => {
    chrome.storage.local.get([`notified_${subId}`], (result) => {
      resolve(result[`notified_${subId}`] || null)
    })
  })
}

async function setLastNotified(subId, date) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [`notified_${subId}`]: date }, resolve)
  })
}

// Notification click handler
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('sub-')) {
    const webUrl = 'http://localhost:3000' // Configurable
    chrome.tabs.create({ url: `${webUrl}/dashboard` })
  }
})
