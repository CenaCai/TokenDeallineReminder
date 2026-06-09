"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Profile } from '@/lib/types'
import { Settings as SettingsIcon, User, Bell, Monitor, Mail, Save } from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data as Profile)
      setNickname(data.nickname)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({ nickname }).eq('id', user.id)
    setSaving(false)
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>

        {/* Profile */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" />
              个人信息
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold">
                {nickname ? nickname[0].toUpperCase() : 'H'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{profile?.nickname || 'helloworld'}</p>
                <p className="text-sm text-gray-500">{profile?.email || '未设置邮箱'}</p>
              </div>
            </div>
            <Input
              label="昵称"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入昵称"
            />
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleSaveProfile} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />
              通知设置
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.127 6.127 0 0 1-.253-1.734c0-3.74 3.568-6.768 7.967-6.768.393 0 .779.034 1.158.088C17.846 4.497 13.694 2.188 8.691 2.188z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">微信订阅消息</p>
                  <p className="text-xs text-gray-500">通过微信服务通知推送</p>
                </div>
              </div>
              <Badge variant="success">已启用</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Monitor className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Chrome 桌面通知</p>
                  <p className="text-xs text-gray-500">浏览器推送通知</p>
                </div>
              </div>
              <Badge variant="success">已启用</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">邮件通知</p>
                  <p className="text-xs text-gray-500">发送提醒邮件到绑定邮箱</p>
                </div>
              </div>
              <Badge variant="default">待配置</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-orange-500" />
              数据管理
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">导出数据 (JSON)</Button>
            <Button variant="outline" className="w-full justify-start">导入数据</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
