"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, Mail, AlertCircle, Loader2 } from 'lucide-react'

// Authing SDK - minimal inline loader (or install authing-js-sdk)
declare global {
  interface Window {
    Authing: any
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [wechatLoading, setWechatLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  // ============ Email Magic Link Login ============
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (authError) {
        setError(authError.message)
      } else {
        setSent(true)
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // ============ WeChat Login via Authing ============
  const handleWechatLogin = async () => {
    setError('')
    setWechatLoading(true)
    try {
      const authingAppId = process.env.NEXT_PUBLIC_AUTHING_APP_ID
      const authingHost = process.env.NEXT_PUBLIC_AUTHING_HOST

      if (!authingAppId || !authingHost) {
        // Fallback: redirect to a WeChat OAuth proxy endpoint
        // This endpoint handles the WeChat OAuth flow server-side
        const callbackUrl = `${window.location.origin}/api/auth/wechat/callback`
        window.location.href = `/api/auth/wechat?callbackUrl=${encodeURIComponent(callbackUrl)}`
        return
      }

      // Use Authing hosted login page
      const redirectUri = `${window.location.origin}/api/auth/wechat/callback`
      const authingUrl = `https://${authingHost}/login/profile?app_id=${authingAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&identity=wechat:qrconnect`
      window.location.href = authingUrl
    } catch (err: any) {
      setError(err.message || '微信登录失败')
    } finally {
      setWechatLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-200 mb-4">
            <Bell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">要到期啦</h1>
          <p className="text-gray-500 mt-1">订阅与续费管理平台</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {/* WeChat Login */}
          <Button
            variant="primary"
            size="lg"
            className="w-full gap-2 bg-[#07C160] hover:bg-[#06AD56] text-white"
            onClick={handleWechatLogin}
            disabled={wechatLoading}
          >
            {wechatLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.127 6.127 0 0 1-.253-1.734c0-3.74 3.568-6.768 7.967-6.768.393 0 .779.034 1.158.088C17.846 4.497 13.694 2.188 8.691 2.188zm7.308 13.026c3.718 0 6.768-2.564 6.768-5.724 0-3.161-3.05-5.725-6.768-5.725-3.718 0-6.768 2.564-6.768 5.725 0 3.16 3.05 5.724 6.768 5.724z"/>
              </svg>
            )}
            微信登录
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">或</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Email Login */}
          {sent ? (
            <div className="text-center py-4">
              <Mail className="w-10 h-10 text-orange-500 mx-auto mb-3" />
              <p className="text-sm text-gray-600">已发送验证链接到</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{email}</p>
              <p className="text-xs text-gray-400 mt-2">请查收邮件并点击链接完成登录</p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-xs text-orange-600 hover:text-orange-700 mt-3"
              >
                使用其他邮箱
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <Input
                id="email"
                type="email"
                placeholder="输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="w-full gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    邮箱验证登录
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Setup hint */}
        {!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-700">
              ⚙️ 当前为开发模式，Supabase 未配置。请参考 README 配置后重试。
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          登录即表示同意服务条款和隐私政策
        </p>
      </div>
    </div>
  )
}
