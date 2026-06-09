// app.js - 要到期啦小程序
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        traceUser: true,
      })
    }
    this.globalData = {
      userInfo: null,
      supabaseUrl: 'YOUR_SUPABASE_URL',
      supabaseKey: 'YOUR_SUPABASE_ANON_KEY',
    }
  },

  globalData: {
    userInfo: null,
  }
})
