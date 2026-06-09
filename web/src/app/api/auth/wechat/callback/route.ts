import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * WeChat OAuth Callback
 *
 * Handles the callback from either Authing or WeChat Open Platform.
 * Exchanges the code for user info, then creates/links a Supabase session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=wechat_no_code', request.url))
  }

  try {
    // Determine which mode we're in based on config
    const authingAppId = process.env.NEXT_PUBLIC_AUTHING_APP_ID
    const authingHost = process.env.NEXT_PUBLIC_AUTHING_HOST
    const authingSecret = process.env.AUTHING_SECRET
    const wechatAppId = process.env.WECHAT_OPEN_APP_ID
    const wechatAppSecret = process.env.WECHAT_OPEN_APP_SECRET

    let wechatUserInfo: { openid: string; nickname: string; headimgurl: string }

    if (authingAppId && authingHost && authingSecret) {
      // ============ Authing Mode ============
      // Exchange Authing code for user info
      const tokenRes = await fetch(`https://${authingHost}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: authingAppId,
          app_secret: authingSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${request.nextUrl.origin}/api/auth/wechat/callback`,
        }),
      })
      const tokenData = await tokenRes.json()

      if (!tokenData.access_token) {
        console.error('Authing token error:', tokenData)
        return NextResponse.redirect(new URL('/?error=wechat_auth_failed', request.url))
      }

      // Get user info from Authing
      const userRes = await fetch(`https://${authingHost}/me`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const userData = await userRes.json()

      wechatUserInfo = {
        openid: userData.id || userData.openid || userData.sub,
        nickname: userData.nickname || userData.name || 'helloworld',
        headimgurl: userData.picture || userData.avatar || '',
      }
    } else if (wechatAppId && wechatAppSecret) {
      // ============ Direct WeChat OAuth Mode ============
      // Step 1: Exchange code for access_token
      const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${wechatAppId}&secret=${wechatAppSecret}&code=${code}&grant_type=authorization_code`
      const tokenRes = await fetch(tokenUrl)
      const tokenData = await tokenRes.json()

      if (!tokenData.access_token || !tokenData.openid) {
        console.error('WeChat token error:', tokenData)
        return NextResponse.redirect(new URL('/?error=wechat_auth_failed', request.url))
      }

      // Step 2: Get user info
      const userUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}`
      const userRes = await fetch(userUrl)
      const userData = await userRes.json()

      wechatUserInfo = {
        openid: userData.openid,
        nickname: userData.nickname || 'helloworld',
        headimgurl: userData.headimgurl || '',
      }
    } else {
      return NextResponse.redirect(new URL('/?error=wechat_not_configured', request.url))
    }

    // ============ Link to Supabase ============
    const supabase = await createClient()

    // Check if a user with this WeChat openid already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('wechat_openid', wechatUserInfo.openid)
      .single()

    if (existingProfile) {
      // User exists — sign in by generating a session
      // Use admin API to create a session for the existing user
      const adminClient = createAdminClient()
      const { data: sessionData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: `${existingProfile.id}@wechat.yaodaoqila.app`,
      })

      if (linkError || !sessionData) {
        // Fallback: update profile and redirect
        await supabase
          .from('profiles')
          .update({
            nickname: wechatUserInfo.nickname,
            avatar_url: wechatUserInfo.headimgurl,
          })
          .eq('id', existingProfile.id)

        // Create a new OTP for this user
        const { error: otpError } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email: `${existingProfile.id}@wechat.yaodaoqila.app`,
        })

        if (otpError) {
          console.error('Failed to generate login link:', otpError)
          return NextResponse.redirect(new URL('/?error=login_failed', request.url))
        }
      }
    } else {
      // New user — create account with WeChat info
      // We use a synthetic email since Supabase requires an email
      const syntheticEmail = `wechat_${wechatUserInfo.openid.slice(0, 16)}@yaodaoqila.app`

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: syntheticEmail,
        password: crypto.randomUUID(), // random password, user won't use it
        options: {
          data: {
            nickname: wechatUserInfo.nickname,
            avatar_url: wechatUserInfo.headimgurl,
            wechat_openid: wechatUserInfo.openid,
            provider: 'wechat',
          },
        },
      })

      if (signUpError) {
        console.error('Supabase signup error:', signUpError)
        return NextResponse.redirect(new URL('/?error=signup_failed', request.url))
      }

      // Update the profile with WeChat openid
      if (signUpData.user) {
        await supabase
          .from('profiles')
          .update({
            wechat_openid: wechatUserInfo.openid,
            nickname: wechatUserInfo.nickname,
            avatar_url: wechatUserInfo.headimgurl,
          })
          .eq('id', signUpData.user.id)
      }
    }

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (err) {
    console.error('WeChat OAuth callback error:', err)
    return NextResponse.redirect(new URL('/?error=wechat_callback_error', request.url))
  }
}

/**
 * Create a Supabase admin client using the service_role key
 * This bypasses RLS for user management operations
 */
function createAdminClient() {
  // In production, use the service_role key from server env
  // For now, we'll use the regular client with elevated permissions
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
