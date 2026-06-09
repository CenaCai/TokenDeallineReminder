/**
 * ocr.js — 截图识别模块
 * 使用 Tesseract.js 做客户端 OCR，再用规则提取关键字段
 */

const OCR = {

  /* ---- 加载 Tesseract ---- */
  _worker: null,
  _loaded: false,

  async ensureLoaded() {
    if (this._loaded) return;
    // 动态加载 Tesseract.js CDN
    await this._loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    this._loaded = true;
  },

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('加载 OCR 库失败，请检查网络连接'));
      document.head.appendChild(s);
    });
  },

  /* ---- 识别图片 ---- */
  async recognize(imageFile) {
    await this.ensureLoaded();

    App.toast('正在加载识别引擎…', 'ok');

    // Tesseract v5 API
    const { createWorker } = Tesseract;
    const worker = await createWorker(['chi_sim', 'eng'], 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          // 可在此更新进度
        }
      },
      // 使用 CDN 语言包
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    });

    try {
      const result = await worker.recognize(imageFile);
      const text = result.data.text;
      await worker.terminate();
      return this.extractInfo(text);
    } catch (e) {
      await worker.terminate();
      throw e;
    }
  },

  /* ---- 从 OCR 文本中提取结构化信息 ---- */
  extractInfo(rawText) {
    const text = rawText.replace(/\s+/g, ' ').trim();
    const result = {
      raw_text: text,
      name: '',
      expire_date: '',
      quota_total: 0,
      quota_used: 0,
      quota_unit: '元',
      renew_price: 0,
      note: '',
      confidence: 0
    };

    let hits = 0;

    // ---- 识别到期日期 ----
    const datePatterns = [
      /到期[时日]间[：:]\s*([\d]{4}[-\/年]([\d]{1,2})[-\/月]([\d]{1,2}))/,
      /有效期[至到][：:]\s*([\d]{4}[-\/年][\d]{1,2}[-\/月][\d]{1,2})/,
      /过期时间[：:]\s*([\d]{4}[-\/年][\d]{1,2}[-\/月][\d]{1,2})/,
      /([\d]{4})[-\/年]([\d]{1,2})[-\/月]([\d]{1,2})[日号]/,
      /expires?:?\s*(\d{4}-\d{2}-\d{2})/i,
    ];
    for (const pat of datePatterns) {
      const m = text.match(pat);
      if (m) {
        let dateStr = m[1] || m[0];
        dateStr = dateStr.replace(/年/, '-').replace(/月/, '-').replace(/日|号/, '');
        // 格式化为 YYYY-MM-DD
        const parts = dateStr.split(/[-\/]/);
        if (parts.length >= 3) {
          result.expire_date = `${parts[0]}-${String(parts[1]).padStart(2,'0')}-${String(parts[2]).padStart(2,'0')}`;
          hits++;
        }
        break;
      }
    }

    // ---- 识别余额/额度 ----
    const balancePatterns = [
      /余额[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)\s*(元|USD|\$)?/,
      /可用余额[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)/,
      /账户余额[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)/,
      /balance[：:]\s*\$?([\d,.]+)/i,
      /剩余额度[：:]\s*([\d,]+\.?\d*)\s*(元|次|token|GB)?/i,
      /可用额度[：:]\s*([\d,]+\.?\d*)\s*(元|次|token|GB)?/i,
      /剩余[：:]\s*([\d,]+\.?\d*)\s*(元|次|token|GB)?/i,
    ];
    for (const pat of balancePatterns) {
      const m = text.match(pat);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(val)) {
          result.quota_total = val;
          result.quota_unit = m[2] || '元';
          hits++;
        }
        break;
      }
    }

    // ---- 识别产品名称 ----
    const namePatterns = [
      /产品名称[：:]\s*(.+?)(?:\s|$)/,
      /服务名称[：:]\s*(.+?)(?:\s|$)/,
      /套餐[：:]\s*(.+?)(?:\s|$)/,
      /(ChatGPT|Claude|DeepSeek|MiniMax|智谱|通义|文心|腾讯云|阿里云|华为云)\s*(Plus|Pro|Max|Lite|Standard)?\s*(套餐|订阅|会员)?/i,
    ];
    for (const pat of namePatterns) {
      const m = text.match(pat);
      if (m) {
        result.name = m[1]?.trim() || m[0]?.trim();
        hits++;
        break;
      }
    }

    // ---- 识别价格 ----
    const pricePatterns = [
      /(?:价格|费用|金额)[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)\s*元/,
      /[¥￥]([\d,]+\.?\d*)\/?(月|年|m|y)?/,
      /\$([\d,]+\.?\d*)\/?(month|year|mo|yr)?/i,
    ];
    for (const pat of pricePatterns) {
      const m = text.match(pat);
      if (m) {
        result.renew_price = parseFloat(m[1].replace(/,/g,''));
        hits++;
        break;
      }
    }

    result.confidence = Math.round(hits / 4 * 100);
    result.note = `由截图自动识别（置信度 ${result.confidence}%）`;

    return result;
  },

  /* ---- 将识别结果填入手动表单 ---- */
  fillForm(info) {
    if (info.name && document.getElementById('m-name')) {
      document.getElementById('m-name').value = info.name;
    }
    if (info.expire_date && document.getElementById('m-expire')) {
      document.getElementById('m-expire').value = info.expire_date;
    }
    if (info.quota_total && document.getElementById('m-quota-total')) {
      document.getElementById('m-quota-total').value = info.quota_total;
    }
    if (info.quota_unit && document.getElementById('m-quota-unit')) {
      const sel = document.getElementById('m-quota-unit');
      Array.from(sel.options).forEach(opt => {
        if (opt.value === info.quota_unit) opt.selected = true;
      });
    }
    if (info.renew_price && document.getElementById('m-renew-price')) {
      document.getElementById('m-renew-price').value = info.renew_price;
    }
    if (document.getElementById('m-note')) {
      document.getElementById('m-note').value = info.note;
    }
  }
};
