// cloudfunctions/checkQuota/index.js
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// ============ API 提供商查询逻辑 ============

const PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/user/balance',
    headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
    parse: (data) => {
      var infos = data.balance_infos || []
      var info = infos[0] || {}
      return {
        success: true,
        data: {
          balance: parseFloat(info.available_balance || 0),
          total: parseFloat(info.total_balance || 0),
          used: parseFloat(info.total_balance || 0) - parseFloat(info.available_balance || 0),
          unit: '元'
        }
      }
    }
  },
  // 更多提供商可在此扩展
  minimax: {
    name: 'MiniMax',
    url: '',
    headers: () => ({}),
    parse: () => ({ success: false, message: '暂不支持 MiniMax 余额查询' })
  },
  openai: {
    name: 'OpenAI',
    url: '',
    headers: () => ({}),
    parse: () => ({ success: false, message: 'OpenAI 余额查询需自建代理' })
  }
}

// 查询 API 额度
async function fetchQuota(provider, apiKey) {
  const config = PROVIDERS[provider]
  if (!config) {
    return { success: false, message: `不支持的提供商: ${provider}` }
  }

  if (!config.url) {
    return { success: false, message: `${config.name} 暂不支持自动查询，请手动录入` }
  }

  try {
    const response = await axios.get(config.url, {
      headers: config.headers(apiKey),
      timeout: 10000
    })

    return config.parse(response.data)
  } catch (err) {
    console.error(`查询 ${provider} 失败:`, err.message)
    return {
      success: false,
      message: '查询失败: ' + (err.response ? err.response.status : err.message)
    }
  }
}

// ============ OCR 识别（服务端微信 API） ============

async function serverOcr(fileID) {
  try {
    // 下载文件到临时路径
    const fileRes = await cloud.downloadFile({ fileID })
    const fileBuffer = fileRes.fileContent

    // 调用微信 OCR API（需要开通）
    // 注意：实际使用需要在微信公众平台开通「文字识别」接口
    const result = await cloud.openapi.ocr.printedText({
      type: 'photo',
      img: {
        contentType: 'image/jpeg',
        value: fileBuffer
      }
    })

    // 解析 OCR 结果
    const items = result.items || []
    const text = items.map(item => item.text).join('\n')

    return {
      success: true,
      data: text
    }
  } catch (err) {
    console.error('OCR 失败:', err)
    return {
      success: false,
      message: `OCR 识别失败: ${err.message}`
    }
  }
}

// ============ 云函数入口 ============

exports.main = async (event, context) => {
  const { action, provider, apiKey, fileID } = event

  // OCR 模式
  if (action === 'ocr' && fileID) {
    return await serverOcr(fileID)
  }

  // API 额度查询
  if (provider && apiKey) {
    return await fetchQuota(provider, apiKey)
  }

  return { success: false, message: '缺少参数' }
}
