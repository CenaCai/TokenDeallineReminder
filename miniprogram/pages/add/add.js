// pages/add/add.js
var api = require('../../utils/api.js')

Page({
  data: {
    name: '',
    provider: '',
    amount: '',
    currency: 'CNY',
    billingCycle: 'monthly',
    startDate: '',
    expireDate: '',
    remark: '',
    autoRenew: false,
    categories: [],
    categoryNames: [],
    categoryIndex: 0,
    tags: [],
    currencies: [
      { value: 'CNY', label: 'CNY ¥' },
      { value: 'USD', label: 'USD $' },
      { value: 'EUR', label: 'EUR €' },
    ],
    currencyIndex: 0,
    cycles: [
      { value: 'monthly', label: '月付' },
      { value: 'quarterly', label: '季付' },
      { value: 'yearly', label: '年付' },
      { value: 'lifetime', label: '终身' },
    ],
    cycleIndex: 0,
    reminderOptions: [
      { value: 30, label: '30天', selected: false },
      { value: 15, label: '15天', selected: false },
      { value: 7, label: '7天', selected: true },
      { value: 3, label: '3天', selected: true },
      { value: 1, label: '1天', selected: true },
      { value: 0, label: '当天', selected: true },
    ],
    channelOptions: [
      { value: 'wechat', label: '微信', selected: true },
      { value: 'chrome', label: 'Chrome', selected: false },
      { value: 'email', label: '邮件', selected: false },
    ],
    submitting: false,
  },

  onLoad: function () {
    this.setData({ startDate: this.formatDate(new Date()) })
    this.loadCategories()
    this.loadTags()
  },

  formatDate: function (d) {
    var y = d.getFullYear()
    var m = ('0' + (d.getMonth() + 1)).slice(-2)
    var day = ('0' + d.getDate()).slice(-2)
    return y + '-' + m + '-' + day
  },

  loadCategories: function () {
    var that = this
    var userId = wx.getStorageSync('user_id')
    api.getCategories(userId).then(function (cats) {
      var names = cats.map(function (c) { return c.name })
      that.setData({ categories: cats, categoryNames: names })
    })
  },

  loadTags: function () {
    var that = this
    var userId = wx.getStorageSync('user_id')
    api.getTags(userId).then(function (tags) {
      tags = tags.map(function (t) {
        t.selected = false
        return t
      })
      that.setData({ tags: tags })
    })
  },

  onNameInput: function (e) { this.setData({ name: e.detail.value }) },
  onProviderInput: function (e) { this.setData({ provider: e.detail.value }) },
  onAmountInput: function (e) { this.setData({ amount: e.detail.value }) },

  onCategoryChange: function (e) { this.setData({ categoryIndex: e.detail.value }) },
  onCurrencyChange: function (e) { this.setData({ currencyIndex: e.detail.value, currency: this.data.currencies[e.detail.value].value }) },
  onCycleChange: function (e) { this.setData({ cycleIndex: e.detail.value, billingCycle: this.data.cycles[e.detail.value].value }) },
  onStartDateChange: function (e) { this.setData({ startDate: e.detail.value }) },
  onExpireDateChange: function (e) { this.setData({ expireDate: e.detail.value }) },
  onRemarkInput: function (e) { this.setData({ remark: e.detail.value }) },

  toggleAutoRenew: function () { this.setData({ autoRenew: !this.data.autoRenew }) },

  toggleTag: function (e) {
    var idx = e.currentTarget.dataset.index
    var key = 'tags[' + idx + '].selected'
    this.setData({ [key]: !this.data.tags[idx].selected })
  },

  toggleReminderDay: function (e) {
    var idx = e.currentTarget.dataset.index
    var key = 'reminderOptions[' + idx + '].selected'
    this.setData({ [key]: !this.data.reminderOptions[idx].selected })
  },

  toggleChannel: function (e) {
    var idx = e.currentTarget.dataset.index
    var key = 'channelOptions[' + idx + '].selected'
    this.setData({ [key]: !this.data.channelOptions[idx].selected })
  },

  handleSubmit: function () {
    if (!this.data.name) {
      wx.showToast({ title: '请输入订阅名称', icon: 'none' })
      return
    }

    var that = this
    this.setData({ submitting: true })

    var userId = wx.getStorageSync('user_id')
    var categories = this.data.categories
    var catId = categories.length > 0 ? categories[this.data.categoryIndex].id : null
    var selectedTags = this.data.tags.filter(function (t) { return t.selected }).map(function (t) { return t.id })
    var selectedDays = this.data.reminderOptions.filter(function (r) { return r.selected }).map(function (r) { return r.value })
    var selectedChannels = this.data.channelOptions.filter(function (c) { return c.selected }).map(function (c) { return c.value })

    var data = {
      user_id: userId,
      name: this.data.name,
      category_id: catId,
      provider: this.data.provider || null,
      amount: parseFloat(this.data.amount) || 0,
      currency: this.data.currency,
      billing_cycle: this.data.billingCycle,
      start_date: this.data.startDate,
      expire_date: this.data.expireDate || null,
      remark: this.data.remark || null,
      auto_renew: this.data.autoRenew,
      status: 'active',
    }

    api.createSubscription(data).then(function (res) {
      if (res && res.length > 0) {
        var subId = res[0].id
        // 保存标签关联
        if (selectedTags.length > 0) {
          // 通过 API 批量插入 subscription_tags
        }
        // 保存提醒策略
        if (selectedDays.length > 0) {
          api.createReminderPolicy({
            user_id: userId,
            subscription_id: subId,
            days_before: selectedDays,
            channels: selectedChannels,
            repeat_type: 'none',
            is_enabled: true,
          })
        }
      }
      wx.showToast({ title: '添加成功', icon: 'success' })
      setTimeout(function () { wx.navigateBack() }, 1500)
    }).catch(function (err) {
      wx.showToast({ title: '添加失败', icon: 'none' })
      that.setData({ submitting: false })
    })
  },
})
