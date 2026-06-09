// cloudfunctions/sendWechatMsg/index.js
// 发送微信订阅消息
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { touser, templateId, page, data } = event

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser,
      templateId,
      page,
      data,
      miniprogramState: 'formal'
    })
    return { success: true, msgId: result.msgid }
  } catch (err) {
    console.error('发送订阅消息失败:', err)
    return { success: false, error: err.message || JSON.stringify(err) }
  }
}
