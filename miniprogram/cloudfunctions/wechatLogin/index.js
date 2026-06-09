// cloudfunctions/wechatLogin/index.js
// 微信登录换取 Supabase token
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const axios = require('axios')

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''

exports.main = async (event, context) => {
  const { code } = event

  if (!code) {
    return { error: 'Missing code parameter' }
  }

  try {
    // 1. 用 code 换取 openid 和 session_key
    const wxAppId = process.env.WX_APPID || ''
    const wxAppSecret = process.env.WX_APP_SECRET || ''

    const wxRes = await axios.get(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${wxAppId}&secret=${wxAppSecret}&js_code=${code}&grant_type=authorization_code`
    )

    const { openid, session_key, errcode, errmsg } = wxRes.data
    if (errcode) {
      return { error: `WeChat login failed: ${errmsg}` }
    }

    // 2. 使用 openid 在 Supabase 中查找或创建用户
    // 先查找是否已存在该 openid 对应的用户
    const { data: existingProfile } = await axios.get(
      `${SUPABASE_URL}/rest/v1/profiles?wechat_openid=eq.${openid}&select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    )

    if (existingProfile && existingProfile.length > 0) {
      // 用户已存在，返回用户信息
      return {
        user: { id: existingProfile[0].id },
        openid: openid,
      }
    }

    // 3. 新用户 - 通过 Supabase Auth Admin API 创建
    // 注意：这需要 service_role key，建议通过云函数安全代理
    return {
      openid: openid,
      isNewUser: true,
    }
  } catch (err) {
    console.error('Login error:', err)
    return { error: err.message }
  }
}
