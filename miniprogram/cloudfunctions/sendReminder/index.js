// cloudfunctions/sendReminder/index.js
// 定时触发器：每天 9:00 检查所有用户的产品额度与到期情况
// 通过微信订阅消息推送提醒

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 订阅消息模板 ID（需在微信公众平台申请）
const TEMPLATE_ID = '你的模板ID'  // ← 替换

exports.main = async (event, context) => {
  console.log('定时检查触发:', new Date().toISOString())

  const now = new Date()
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  try {
    // 1. 查询所有开启提醒的用户
    const usersRes = await db.collection('users')
      .where({
        'settings.notificationsEnabled': true
      })
      .get()

    for (const user of usersRes.data) {
      const openid = user._openid
      const threshold = user.settings.quotaThreshold || 20
      const warningDays = user.settings.expireWarningDays || 7
      const warningDate = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000)

      // 2. 查询该用户的产品
      const productsRes = await db.collection('products')
        .where({ _openid: openid })
        .get()

      const reminders = []

      for (const product of productsRes.data) {
        // 额度不足检查
        if (product.quotaTotal > 0) {
          const remaining = (product.quotaTotal - product.quotaUsed) / product.quotaTotal * 100
          if (remaining <= threshold) {
            reminders.push({
              type: 'quota_low',
              name: product.name,
              message: `${product.name} 额度仅剩 ${remaining.toFixed(1)}%`
            })
          }
        }

        // 到期检查
        if (product.expireDate) {
          const expireDate = new Date(product.expireDate)
          const daysLeft = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24))
          if (daysLeft >= 0 && daysLeft <= warningDays) {
            reminders.push({
              type: 'expiring',
              name: product.name,
              message: `${product.name} 将在 ${daysLeft} 天后到期`
            })
          } else if (daysLeft < 0) {
            reminders.push({
              type: 'expired',
              name: product.name,
              message: `${product.name} 已过期`
            })
          }
        }
      }

      // 3. 发送订阅消息（一次性订阅，需用户授权）
      // 注意：微信订阅消息需要用户主动触发授权，每次授权只能发一条
      // 这里记录需要发送的提醒，实际发送依赖用户之前的授权
      if (reminders.length > 0) {
        console.log(`用户 ${openid} 有 ${reminders.length} 条提醒`)

        // 尝试发送订阅消息
        // 实际项目中，需要维护每个用户对每个模板的授权记录
        // 这里仅做示例
        try {
          const topReminder = reminders[0]
          await cloud.openapi.subscribeMessage.send({
            touser: openid,
            templateId: TEMPLATE_ID,
            page: 'pages/index/index',
            data: {
              thing1: { value: topReminder.name },         // 产品名称
              thing2: { value: topReminder.message },       // 提醒内容
              time3: { value: now.toLocaleString('zh-CN') } // 提醒时间
            }
          })
          console.log(`已发送提醒给 ${openid}`)
        } catch (err) {
          console.error(`发送提醒给 ${openid} 失败:`, err.message)
          // 常见错误：用户未授权、授权已用完等
        }
      }
    }

    return { success: true, checkedUsers: usersRes.data.length }
  } catch (err) {
    console.error('定时检查失败:', err)
    return { success: false, error: err.message }
  }
}
