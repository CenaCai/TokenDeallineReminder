"use client"

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoginPage from '@/components/auth/login-page'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const redirect = searchParams.get('redirect') || '/dashboard'
          router.replace(redirect)
          return
        }
      } catch {
        // Supabase not configured yet, that's okay
        console.log('Auth check skipped (Supabase not configured)')
      }
      setChecking(false)
    }
    checkAuth()
  }, [router, searchParams, supabase.auth])

  const authError = searchParams.get('error')

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-400" />
          <p className="text-sm text-gray-400">正在检查登录状态...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {authError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          登录失败：{
            authError === 'wechat_no_code' ? '微信授权码缺失' :
            authError === 'wechat_auth_failed' ? '微信认证失败' :
            authError === 'wechat_not_configured' ? '微信登录未配置' :
            authError === 'signup_failed' ? '注册失败' :
            authError === 'login_failed' ? '登录失败' :
            authError === 'wechat_callback_error' ? '微信回调异常' :
            decodeURIComponent(authError)
          }
        </div>
      )}
      <LoginPage />
    </>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-400" />
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
