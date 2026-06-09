// pages/index/index.js
var api = require('../../utils/api.js')
var util = require('../../utils/util.js')

Page({
  data: {
    statCards: [],
    timelineGroups: [],
    subscriptions: [],
  },

  onShow: function () {
    this.loadData()
  },

  loadData: function () {
    var that = this
    var userId = wx.getStorageSync('user_id')
    if (!userId) {
      // 需要登录
      this.doLogin()
      return
    }

    api.getSubscriptions(userId).then(function (subs) {
      // 重新计算状态
      subs = subs.map(function (s) {
        s.status = util.calcStatus(s.expire_date)
        s.daysUntil = util.daysUntil(s.expire_date)
        return s
      })

      // 统计卡片
      var monthlyExpense = subs.filter(function (s) { return s.billing_cycle === 'monthly' && s.currency === 'CNY' })
        .reduce(function (sum, s) { return sum + Number(s.amount) }, 0)
      var expiringSoon = subs.filter(function (s) { return s.status === 'expiring_soon' }).length
      var expired = subs.filter(function (s) { return s.status === 'expired' }).length

      var statCards = [
        { label: '总订阅', value: subs.length, emoji: '📊', colorClass: 'blue' },
        { label: '月支出', value: '¥' + monthlyExpense.toFixed(0), emoji: '💰', colorClass: 'orange' },
        { label: '即将到期', value: expiringSoon, emoji: '⚠️', colorClass: 'amber' },
        { label: '已过期', value: expired, emoji: '❌', colorClass: 'red' },
      ]

      // 时间轴分组
      var today = subs.filter(function (s) { return s.daysUntil !== null && s.daysUntil <= 0 })
      var week = subs.filter(function (s) { return s.daysUntil !== null && s.daysUntil > 0 && s.daysUntil <= 7 })
      var month = subs.filter(function (s) { return s.daysUntil !== null && s.daysUntil > 7 && s.daysUntil <= 30 })
      var quarter = subs.filter(function (s) { return s.daysUntil !== null && s.daysUntil > 30 && s.daysUntil <= 90 })

      var timelineGroups = [
        { key: 'today', label: '今天/已过期', items: today },
        { key: 'week', label: '7天内', items: week },
        { key: 'month', label: '30天内', items: month },
        { key: 'quarter', label: '90天内', items: quarter },
      ]

      that.setData({
        subscriptions: subs,
        statCards: statCards,
        timelineGroups: timelineGroups,
      })
    }).catch(function (err) {
      console.error('加载失败:', err)
    })
  },

  doLogin: function () {
    var that = this
    wx.login({
      success: function (res) {
        wx.cloud.callFunction({
          name: 'wechatLogin',
          data: { code: res.code },
          success: function (cloudRes) {
            if (cloudRes.result && cloudRes.result.access_token) {
              wx.setStorageSync('supabase_token', cloudRes.result.access_token)
              wx.setStorageSync('user_id', cloudRes.result.user.id)
              that.loadData()
            }
          },
        })
      },
    })
  },

  goAdd: function () {
    wx.navigateTo({ url: '/pages/add/add' })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  goTemplates: function () {
    wx.switchTab({ url: '/pages/templates/templates' })
  },

  // 供 wxml 调用的辅助函数（通过 WXS 或 data 映射）
  formatCurrency: util.formatCurrency,
  statusLabel: util.statusLabel,
  statusClass: util.statusClass,
  cycleLabel: util.cycleLabel,
})
