// utils/api.js - Supabase API 封装
const app = getApp()

const BASE_URL = 'https://nvgirjjogtctgwybbkyu.supabase.co'
const ANON_KEY = 'sb_publishable_WmPeiENItuf6SVqEkzvppA_uWFVFLbB'

function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Prefer': 'return=representation',
  }
}

async function getToken() {
  // 从缓存获取 token，如未登录则先登录
  let token = wx.getStorageSync('supabase_token')
  if (token) return token

  // 微信登录换取 Supabase token
  const { code } = await wx.login()
  const res = await wx.cloud.callFunction({
    name: 'wechatLogin',
    data: { code },
  })
  if (res.result && res.result.access_token) {
    token = res.result.access_token
    wx.setStorageSync('supabase_token', token)
    wx.setStorageSync('supabase_refresh_token', res.result.refresh_token)
    wx.setStorageSync('user_id', res.result.user.id)
    return token
  }
  throw new Error('登录失败')
}

async function request(method, table, options = {}) {
  const token = await getToken()
  let url = `${BASE_URL}/rest/v1/${table}`

  if (options.id) {
    url += `?id=eq.${options.id}`
  } else if (options.query) {
    const params = Object.entries(options.query)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    url += `?${params}`
  }

  const header = getHeaders(token)
  if (options.select) header['Prefer'] = 'return=representation'

  const res = await new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data: options.data || {},
      header,
      success: resolve,
      fail: reject,
    })
  })

  if (res.statusCode >= 200 && res.statusCode < 300) {
    return res.data
  }
  throw new Error(`API Error: ${res.statusCode} ${JSON.stringify(res.data)}`)
}

module.exports = {
  // 订阅 CRUD
  getSubscriptions(userId) {
    return request('GET', 'subscriptions', {
      query: `user_id=eq.${userId}&order=expire_date.asc&select=*,category:categories(*)`,
    })
  },
  getSubscription(id) {
    return request('GET', 'subscriptions', {
      query: `id=eq.${id}&select=*,category:categories(*)`,
    })
  },
  createSubscription(data) {
    return request('POST', 'subscriptions', { data, select: true })
  },
  updateSubscription(id, data) {
    return request('PATCH', 'subscriptions', {
      query: `id=eq.${id}`,
      data,
    })
  },
  deleteSubscription(id) {
    return request('DELETE', 'subscriptions', { query: `id=eq.${id}` })
  },

  // 分类
  getCategories(userId) {
    return request('GET', 'categories', { query: `user_id=eq.${userId}&order=sort_order` })
  },

  // 标签
  getTags(userId) {
    return request('GET', 'tags', { query: `user_id=eq.${userId}` })
  },

  // 模板
  getTemplates() {
    return request('GET', 'templates', { query: 'order=name' })
  },

  // 提醒策略
  createReminderPolicy(data) {
    return request('POST', 'reminder_policies', { data })
  },

  // Profile
  getProfile(userId) {
    return request('GET', 'profiles', { query: `id=eq.${userId}` })
  },
  updateProfile(userId, data) {
    return request('PATCH', 'profiles', { query: `id=eq.${userId}`, data })
  },
}
