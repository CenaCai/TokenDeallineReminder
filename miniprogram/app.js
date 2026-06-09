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
      supabaseUrl: 'https://nvgirjjogtctgwybbkyu.supabase.co',
      supabaseKey: 'sb_publishable_WmPeiENItuf6SVqEkzvppA_uWFVFLbB',
    }
  },

  globalData: {
    userInfo: null,
  }
})
