/**
 * api-providers.js — API 自动拉取余额
 * 各家平台的余额查询适配器
 */

const APIProviders = {

  /**
   * 根据服务商和 API Key 获取余额信息
   * @returns {Promise<{balance: string, expire: string, unit: string, raw: object}>}
   */
  async fetch(provider, apiKey) {
    switch (provider) {
      case 'openai':    return this.fetchOpenAI(apiKey);
      case 'anthropic': return this.fetchAnthropic(apiKey);
      case 'deepseek':  return this.fetchDeepSeek(apiKey);
      case 'zhipu':     return this.fetchZhipu(apiKey);
      case 'minimax':   return this.fetchMiniMax(apiKey);
      case 'aliyun':    return this.fetchAliyun(apiKey);
      default:
        throw new Error(`暂不支持自动获取 ${provider} 的余额，请使用截图识别或手动录入`);
    }
  },

  /* ---- OpenAI ---- */
  async fetchOpenAI(apiKey) {
    // OpenAI 目前通过 /v1/dashboard/billing/subscription 和 usage 查询
    // 注意：浏览器直接调会有 CORS，需要通过代理或设备端处理
    // 这里做模拟/说明处理
    try {
      // 尝试获取订阅信息
      const res = await fetch('https://api.openai.com/v1/dashboard/billing/subscription', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const hardLimit = data.hard_limit_usd || 0;
      const softLimit = data.soft_limit_usd || 0;

      // 获取本月已用
      const now = new Date();
      const startDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
      const endDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const usageRes = await fetch(
        `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const usage = usageRes.ok ? await usageRes.json() : { total_usage: 0 };
      const usedUSD = (usage.total_usage || 0) / 100;

      return {
        balance: `$${(hardLimit - usedUSD).toFixed(2)}`,
        expire: data.access_until ? new Date(data.access_until * 1000).toLocaleDateString('zh-CN') : '',
        unit: '元',
        quota_total: hardLimit * 7.2, // 约估人民币
        quota_used: usedUSD * 7.2,
        raw: data
      };
    } catch (e) {
      throw new Error(`OpenAI 查询失败：${e.message}。可能受 CORS 限制，建议使用截图识别`);
    }
  },

  /* ---- DeepSeek ---- */
  async fetchDeepSeek(apiKey) {
    try {
      const res = await fetch('https://api.deepseek.com/user/balance', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const info = data.balance_infos?.[0] || {};
      const total = parseFloat(info.total_balance || 0);
      const granted = parseFloat(info.granted_balance || 0);
      const topped = parseFloat(info.topped_up_balance || 0);
      return {
        balance: `¥${total.toFixed(4)}`,
        expire: '',
        quota_total: granted + topped,
        quota_used: Math.max(0, granted + topped - total),
        unit: '元',
        raw: data
      };
    } catch (e) {
      throw new Error(`DeepSeek 查询失败：${e.message}`);
    }
  },

  /* ---- 智谱 AI ---- */
  async fetchZhipu(apiKey) {
    // 智谱需要 JWT Token 认证，这里做提示
    throw new Error('智谱 AI 需要 JWT 生成，受浏览器限制，请使用截图识别或手动录入');
  },

  /* ---- MiniMax ---- */
  async fetchMiniMax(apiKey) {
    // MiniMax API 文档：余额查询接口
    try {
      const res = await fetch('https://api.minimax.chat/v1/bill/balance', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const balance = data.balance?.total_balance || 0;
      return {
        balance: `¥${parseFloat(balance).toFixed(2)}`,
        expire: '',
        quota_total: parseFloat(balance),
        quota_used: 0,
        unit: '元',
        raw: data
      };
    } catch (e) {
      throw new Error(`MiniMax 查询失败：${e.message}`);
    }
  },

  /* ---- Anthropic ---- */
  async fetchAnthropic(apiKey) {
    throw new Error('Anthropic 暂不提供公开的余额查询 API，请使用截图识别或手动录入');
  },

  /* ---- 阿里云 ---- */
  async fetchAliyun(apiKey) {
    throw new Error('阿里云余额查询需要 AccessKeyId + AccessKeySecret 签名，受浏览器安全限制，请使用截图识别或手动录入');
  },

};
