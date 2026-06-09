// scripts/upload.js
// 微信小程序 CI 自动上传脚本
// 使用 miniprogram-ci 实现命令行上传/预览

const ci = require('miniprogram-ci')
const path = require('path')
const fs = require('fs')

// ============ 配置 ============

const PROJECT_DIR = path.resolve(__dirname, '..')

// 从 ci-config.json 读取敏感配置（不进 Git）
const CONFIG_PATH = path.join(PROJECT_DIR, 'ci-config.json')
const ENV_PATH = path.join(PROJECT_DIR, '.env.ci')

function loadConfig() {
  // 优先从环境变量读取（GitHub Actions 场景）
  const envConfig = {
    appid: process.env.MP_APPID,
    privateKeyPath: process.env.MP_PRIVATE_KEY_PATH,
    privateKey: process.env.MP_PRIVATE_KEY,  // 直接传密钥内容
  }

  if (envConfig.appid && (envConfig.privateKeyPath || envConfig.privateKey)) {
    return envConfig
  }

  // 其次从 ci-config.json 读取（本地开发场景）
  if (fs.existsSync(CONFIG_PATH)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    return config
  }

  console.error('❌ 未找到 CI 配置！')
  console.error('')
  console.error('请创建 ci-config.json 或设置环境变量：')
  console.error('')
  console.error('方式1：创建 ci-config.json')
  console.error('  {')
  console.error('    "appid": "wx1234567890abcdef",')
  console.error('    "privateKeyPath": "./private.wx1234567890abcdef.key"')
  console.error('  }')
  console.error('')
  console.error('方式2：设置环境变量')
  console.error('  MP_APPID=wx1234567890abcdef')
  console.error('  MP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."')
  console.error('')
  process.exit(1)
}

// ============ 解析参数 ============

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    preview: false,
    env: 'dev',
    ci: false,
    desc: ''
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--preview':
        options.preview = true
        break
      case '--env':
        options.env = args[++i] || 'dev'
        break
      case '--ci':
        options.ci = true
        break
      case '--desc':
        options.desc = args[++i] || ''
        break
    }
  }

  return options
}

// ============ 主流程 ============

async function main() {
  const options = parseArgs()
  const config = loadConfig()

  console.log('📦 额度追踪小程序 - CI 上传')
  console.log(`   模式: ${options.preview ? '预览' : '上传'}`)
  console.log(`   环境: ${options.env}`)
  console.log(`   AppID: ${config.appid}`)
  console.log('')

  // 处理私钥
  let privateKeyContent
  if (config.privateKey) {
    // 直接传密钥内容
    privateKeyContent = config.privateKey
  } else if (config.privateKeyPath) {
    const keyPath = path.resolve(PROJECT_DIR, config.privateKeyPath)
    if (!fs.existsSync(keyPath)) {
      console.error(`❌ 密钥文件不存在: ${keyPath}`)
      console.error('请参照 CI-SETUP.md 获取上传密钥')
      process.exit(1)
    }
    privateKeyContent = fs.readFileSync(keyPath, 'utf-8')
  } else {
    console.error('❌ 未配置 privateKeyPath 或 privateKey')
    process.exit(1)
  }

  // 创建项目实例
  const project = new ci.Project({
    appid: config.appid,
    type: 'miniProgram',
    projectPath: PROJECT_DIR,
    privateKey: privateKeyContent,
    ignores: [
      'node_modules/**/*',
      'scripts/**/*',
      'ci-config.json',
      '*.key',
      '.env.ci',
      'DEPLOY.md',
      'CI-SETUP.md',
      'package.json',
      'package-lock.json',
      '.gitignore',
      '.github/**/*'
    ]
  })

  // 生成版本号
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const version = `${options.env === 'prod' ? '1.0' : '0.0'}.${dateStr.slice(2)}`
  const desc = options.desc || `${options.env}@${dateStr}.${timeStr}`

  try {
    if (options.preview) {
      // ===== 预览模式 =====
      console.log('🔍 生成预览二维码...')
      const previewResult = await ci.preview({
        project,
        desc,
        qrcodeFormat: 'image',
        qrcodeOutputDest: path.join(PROJECT_DIR, 'preview-qrcode.png'),
        setting: {
          es6: true,
          minify: true,
          autoPrefixWxml: true,
        },
        robot: options.env === 'prod' ? 1 : 2,
      })
      console.log('✅ 预览码已生成: preview-qrcode.png')
      console.log('   用微信扫描此二维码即可预览')

      // 在 CI 环境中输出二维码路径
      if (options.ci) {
        const qrPath = path.join(PROJECT_DIR, 'preview-qrcode.png')
        if (fs.existsSync(qrPath)) {
          console.log(`::set-output name=qrcode-path::${qrPath}`)
        }
      }
    } else {
      // ===== 上传模式 =====
      console.log('📤 上传小程序代码...')
      const uploadResult = await ci.upload({
        project,
        version,
        desc,
        setting: {
          es6: true,
          minify: true,
          autoPrefixWxml: true,
        },
        robot: options.env === 'prod' ? 1 : 2,
      })

      console.log('✅ 上传成功！')
      console.log(`   版本: ${version}`)
      console.log(`   描述: ${desc}`)
      console.log('')
      console.log('📋 后续步骤：')
      console.log('   1. 登录 mp.weixin.qq.com')
      console.log('   2. 进入「管理 → 版本管理」')
      console.log('   3. 将开发版设为体验版或提交审核')

      // 输出上传信息
      if (uploadResult.subPackageInfo) {
        console.log('')
        console.log('📊 包信息：')
        uploadResult.subPackageInfo.forEach(pkg => {
          console.log(`   ${pkg.name}: ${(pkg.size / 1024).toFixed(1)} KB`)
        })
      }
    }
  } catch (err) {
    console.error('❌ 操作失败:', err.message)

    // 常见错误提示
    if (err.message.includes('not in whitelist')) {
      console.error('')
      console.error('💡 当前 IP 不在白名单中！')
      console.error('   请在 mp.weixin.qq.com → 开发设置 → IP 白名单中添加当前 IP')
      console.error('   或关闭 IP 白名单（仅建议开发环境）')
    } else if (err.message.includes('invalid key')) {
      console.error('')
      console.error('💡 密钥无效！请确认：')
      console.error('   1. 密钥对应的 AppID 正确')
      console.error('   2. 密钥未过期')
      console.error('   3. 密钥文件内容完整（包含 BEGIN/END 行）')
    }

    process.exit(1)
  }
}

main()
