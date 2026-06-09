// pages/detail/detail.js
var api = require('../../utils/api.js')
var util = require('../../utils/util.js')

Page({
  data: {
    subscription: {},
    daysText: '',
  },

  onLoad: function (options) {
    if (options.id) {
      this.loadSubscription(options.id)
    }
  },

  loadSubscription: function (id) {
    var that = this
    api.getSubscription(id).then(function (res) {
      if (res && res.length > 0) {
        var sub = res[0]
        sub.status = util.calcStatus(sub.expire_date)
        var d = util.daysUntil(sub.expire_date)
        var daysText = ''
        if (d !== null) {
          if (d < 0) daysText = '已过期 ' + Math.abs(d) + ' 天'
          else if (d === 0) daysText = '今天到期'
          else daysText = d + ' 天后到期'
        }
        that.setData({ subscription: sub, daysText: daysText })
      }
    })
  },

  goEdit: function () {
    wx.navigateTo({ url: '/pages/edit/edit?id=' + this.data.subscription.id })
  },

  handleDelete: function () {
    var that = this
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除吗？',
      confirmColor: '#dc2626',
      success: function (res) {
        if (res.confirm) {
          api.deleteSubscription(that.data.subscription.id).then(function () {
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(function () { wx.navigateBack() }, 1500)
          })
        }
      },
    })
  },

  formatCurrency: util.formatCurrency,
  statusLabel: util.statusLabel,
  statusClass: util.statusClass,
  cycleLabel: util.cycleLabel,
})
