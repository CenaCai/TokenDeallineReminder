import { NextRequest, NextResponse } from 'next/server'

/**
 * WeChat OAuth Entry Point
 *
 * Supports two modes:
 * 1. Authing bridge mode (NEXT_PUBLIC_AUTHING_APP_ID configured)
 *    → Redirects to Authing's WeChat login page
 * 2. Direct WeChat OAuth mode (NEXT_PUBLIC_WECHAT_APP_ID configured)
 *    → Redirects to WeChat's QR code login page
 * 3. Fallback mode (neither configured)
 *    → Shows setup instructions
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const callbackUrl = searchParams.get('callbackUrl') || `${request.nextUrl.origin}/api/auth/wechat/callback`
  const state = crypto.randomUUID().replace(/-/g, '')

  // Mode 1: Authing bridge
  const authingAppId = process.env.NEXT_PUBLIC_AUTHING_APP_ID
  const authingHost = process.env.NEXT_PUBLIC_AUTHING_HOST

  if (authingAppId && authingHost) {
    const authingUrl = `https://${authingHost}/login/profile?app_id=${authingAppId}&redirect_uri=${encodeURIComponent(callbackUrl)}&identity=wechat:qrconnect&state=${state}`
    return NextResponse.redirect(authingUrl)
  }

  // Mode 2: Direct WeChat Open Platform OAuth
  const wechatAppId = process.env.WECHAT_OPEN_APP_ID
  if (wechatAppId) {
    const wechatUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${wechatAppId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`
    return NextResponse.redirect(wechatUrl)
  }

  // Mode 3: Not configured - show setup guide
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>微信登录配置</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 520px; margin: 80px auto; padding: 0 20px; color: #333; }
  h1 { font-size: 20px; color: #E8703A; }
  .step { background: #FFF8F0; border-radius: 12px; padding: 16px; margin: 12px 0; }
  .step h3 { margin: 0 0 8px; font-size: 15px; }
  .step p { margin: 0; font-size: 13px; color: #666; line-height: 1.6; }
  code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  .back { display: inline-block; margin-top: 20px; color: #E8703A; text-decoration: none; }
</style></head><body>
<h1>🔧 微信登录需要配置</h1>
<p>当前未配置微信登录服务，请选择以下方式之一：</p>

<div class="step">
  <h3>方案 A：Authing 桥接（推荐，免费）</h3>
  <p>1. 注册 <a href="https://www.authing.cn" target="_blank">authing.cn</a> 免费账号</p>
  <p>2. 创建应用，开启微信登录</p>
  <p>3. 在 <code>.env.local</code> 中配置：</p>
  <p><code>NEXT_PUBLIC_AUTHING_APP_ID=你的AppID</code></p>
  <p><code>NEXT_PUBLIC_AUTHING_HOST=你的域名.authing.cn</code></p>
</div>

<div class="step">
  <h3>方案 B：微信开放平台（需企业认证）</h3>
  <p>1. 在 <a href="https://open.weixin.qq.com" target="_blank">open.weixin.qq.com</a> 注册并创建网站应用</p>
  <p>2. 在 <code>.env.local</code> 中配置：</p>
  <p><code>WECHAT_OPEN_APP_ID=你的AppID</code></p>
  <p><code>WECHAT_OPEN_APP_SECRET=你的AppSecret</code></p>
</div>

<a href="/" class="back">← 返回登录页</a>
</body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
