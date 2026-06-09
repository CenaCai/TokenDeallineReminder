// pages/settings/settings.js
var api = require('../../utils/api.js')

Page({
  data: {
    nickname: 'helloworld',
    email: '',
    wechatEnabled: true,
    chromeEnabled: false,
    emailEnabled: false,
  },

  onLoad: function () {
    this.loadProfile()
  },

  loadProfile: function () {
    var that = this
    var userId = wx.getStorageSync('user_id')
    if (!userId) return

    api.getProfile(userId).then(function (res) {
      if (res && res.length > 0) {
        that.setData({
          nickname: res[0].nickname || 'helloworld',
          email: res[0].email || '',
        })
      }
    })
  },

  toggleWechat: function () { this.setData({ wechatEnabled: !this.data.wechatEnabled }) },
  toggleChrome: function () { this.setData({ chromeEnabled: !this.data.chromeEnabled }) },
  toggleEmail: function () { this.setData({ emailEnabled: !this.data.emailEnabled }) },

  exportData: function () {
    wx.showToast({ title: '开发中', icon: 'none' })
  },

  importData: function () {
    wx.showToast({ title: '开发中', icon: 'none' })
  },

  requestSubscribe: function () {
    wx.requestSubscribeMessage({
      tmplIds: ['YOUR_TEMPLATE_ID'],
      success: function (res) {
        wx.showToast({ title: '授权成功', icon: 'success' })
      },
      fail: function (err) {
        wx.showToast({ title: '授权失败', icon: 'none' })
      },
    })
  },
})
