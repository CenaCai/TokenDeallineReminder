// pages/index/index.js
const db = wx.cloud.database()

Page({
  data: {
    products: [],
    filteredProducts: [],
    filter: 'all',
    loading: true,
    totalCount: 0,
    warningCount: 0,
    expiredCount: 0,
    showReminder: false,
    reminders: []
  },

  onLoad() {
    this.loadProducts()
  },

  onShow() {
    // 每次显示时刷新数据（从添加/编辑页返回）
    this.loadProducts()
  },

  onPullDownRefresh() {
    this.loadProducts().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载产品列表
  async loadProducts() {
    this.setData({ loading: true })
    try {
      const res = await db.collection('products')
        .where({ _openid: '{openid}' })
        .orderBy('updatedAt', 'desc')
        .get()

      const products = res.data
      const stats = this.calcStats(products)
      const reminders = this.checkReminders(products)

      this.setData({
        products,
        filteredProducts: this.applyFilter(products, this.data.filter),
        ...stats,
        reminders,
        showReminder: reminders.length > 0,
        loading: false
      })
    } catch (err) {
      console.error('加载产品失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 统计数据
  calcStats(products) {
    const now = new Date()
    let warningCount = 0
    let expiredCount = 0

    products.forEach(p => {
      // 额度告急
      if (p.quotaTotal > 0) {
        const remaining = (p.quotaTotal - p.quotaUsed) / p.quotaTotal * 100
        if (remaining <= 30) warningCount++
      }
      // 已过期
      if (p.expireDate) {
        const daysLeft = Math.ceil((new Date(p.expireDate) - now) / 86400000)
        if (daysLeft < 0) expiredCount++
        else if (daysLeft <= 7) warningCount++
      }
    })

    return {
      totalCount: products.length,
      warningCount,
      expiredCount
    }
  },

  // 检查提醒
  checkReminders(products) {
    const now = new Date()
    const reminders = []

    products.forEach(p => {
      if (p.quotaTotal > 0) {
        const remaining = (p.quotaTotal - p.quotaUsed) / p.quotaTotal * 100
        if (remaining <= 20) {
          reminders.push({
            type: 'quota_low',
            product: p.name,
            productId: p._id,
            message: `${p.name} 额度仅剩 ${remaining.toFixed(1)}%，请及时续费`
          })
        }
      }

      if (p.expireDate) {
        const daysLeft = Math.ceil((new Date(p.expireDate) - now) / 86400000)
        if (daysLeft >= 0 && daysLeft <= 7) {
          reminders.push({
            type: 'expiring',
            product: p.name,
            productId: p._id,
            message: `${p.name} 将在 ${daysLeft} 天后到期`
          })
        } else if (daysLeft < 0) {
          reminders.push({
            type: 'expired',
            product: p.name,
            productId: p._id,
            message: `${p.name} 已过期 ${Math.abs(daysLeft)} 天`
          })
        }
      }
    })

    return reminders
  },

  // 筛选
  applyFilter(products, filter) {
    const now = new Date()
    switch (filter) {
      case 'warning':
        return products.filter(p => {
          if (p.quotaTotal > 0) {
            const remaining = (p.quotaTotal - p.quotaUsed) / p.quotaTotal * 100
            if (remaining <= 30) return true
          }
          return false
        })
      case 'expiring':
        return products.filter(p => {
          if (!p.expireDate) return false
          const daysLeft = Math.ceil((new Date(p.expireDate) - now) / 86400000)
          return daysLeft >= 0 && daysLeft <= 7
        })
      case 'synced':
        return products.filter(p => p.apiProvider && p.apiProvider !== '')
      default:
        return products
    }
  },

  onFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({
      filter,
      filteredProducts: this.applyFilter(this.data.products, filter)
    })
  },

  // 跳转添加产品
  onAddProduct() {
    wx.navigateTo({ url: '/pages/add/add' })
  },

  // 跳转产品详情
  onProductTap(e) {
    const id = e.detail.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  // 提醒操作
  dismissReminder() {
    this.setData({ showReminder: false })
  },

  goToProduct() {
    this.setData({ showReminder: false })
    // 跳转到第一个提醒的产品
    if (this.data.reminders.length > 0) {
      const id = this.data.reminders[0].productId
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
    }
  }
})
