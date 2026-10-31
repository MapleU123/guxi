import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
// 微信公众号登录（website-to-wechat）：vendored 算法模块（内部 @ts-nocheck）
import { createWebhookHandler } from './wechat/webhook.ts'; // @ts-ignore
import { issueLoginCode, consumeLoginCode, createLoginPair, claimLoginPair, pairLogin } from './wechat/pairing.ts'; // @ts-ignore
import { siteSubject } from './wechat/wechat-crypto.ts'; // @ts-ignore
// @ts-ignore - replies is JSON, bundled by esbuild
import replies from './wechat/replies.zh-CN.json';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

// 辅助函数：根据 6 位数字代码或带前缀代码生成腾讯行情标准代码
function formatTencentCode(rawCode: string): string {
  const code = rawCode.trim().toLowerCase();
  if (code.startsWith('sh') || code.startsWith('sz') || code.startsWith('bj')) {
    return code;
  }
  const cleanCode = code.replace(/\D/g, '');
  if (cleanCode.startsWith('60') || cleanCode.startsWith('68') || cleanCode.startsWith('90')) {
    return `sh${cleanCode}`;
  }
  if (cleanCode.startsWith('00') || cleanCode.startsWith('30') || cleanCode.startsWith('20')) {
    return `sz${cleanCode}`;
  }
  if (cleanCode.startsWith('8') || cleanCode.startsWith('4') || cleanCode.startsWith('92')) {
    return `bj${cleanCode}`;
  }
  return `sh${cleanCode}`;
}

// 格式化时间戳 YYYYMMDDHHMMSS -> YYYY-MM-DD HH:mm:ss
function formatQuoteTime(rawTime: string): string {
  if (!rawTime || rawTime.length < 14) {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }
  const y = rawTime.slice(0, 4);
  const m = rawTime.slice(4, 6);
  const d = rawTime.slice(6, 8);
  const hh = rawTime.slice(8, 10);
  const mm = rawTime.slice(10, 12);
  const ss = rawTime.slice(12, 14);
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

// 核心解析器：解析腾讯行情字符串
function parseTencentQuote(line: string) {
  const match = line.match(/v_(.*?)=\"(.*?)\"/);
  if (!match) return null;
  const fullCode = match[1];
  const parts = match[2].split('~');
  if (parts.length < 30) return null;

  const code = parts[2] || fullCode.replace(/^(sh|sz|bj)/i, '');
  const name = parts[1] || '';
  const price = parseFloat(parts[3]) || 0;
  const prevClose = parseFloat(parts[4]) || 0;
  const open = parseFloat(parts[5]) || 0;
  const change = parseFloat(parts[31]) || (price && prevClose ? +(price - prevClose).toFixed(2) : 0);
  const changePercent = parseFloat(parts[32]) || (prevClose ? +(((price - prevClose) / prevClose) * 100).toFixed(2) : 0);
  const high = parseFloat(parts[33]) || price;
  const low = parseFloat(parts[34]) || price;
  const volume = parseFloat(parts[36]) || parseFloat(parts[6]) || 0; // 手
  const turnover = parseFloat(parts[37]) || 0; // 万元
  const turnoverRate = parseFloat(parts[38]) || 0; // %
  const pe = parseFloat(parts[39]) || 0; // 动态 PE
  const pb = parseFloat(parts[46]) || 0; // PB
  const marketCap = parseFloat(parts[45]) || 0; // 总市值 (亿元)
  const floatMarketCap = parseFloat(parts[44]) || 0; // 流通市值 (亿元)
  const rawTime = parts[30] || '';
  const formattedTime = formatQuoteTime(rawTime);

  let market: 'SH' | 'SZ' | 'BJ' = 'SH';
  if (fullCode.startsWith('sz')) market = 'SZ';
  else if (fullCode.startsWith('bj')) market = 'BJ';

  return {
    code,
    fullCode,
    name,
    market,
    price,
    prevClose,
    open,
    change,
    changePercent,
    high,
    low,
    volume,
    turnover,
    turnoverRate,
    pe,
    pb,
    marketCap,
    floatMarketCap,
    rawTime,
    updateTime: formattedTime,
    queryTimestamp: Date.now()
  };
}

// 1. 单只股票真实行情 API
app.get('/api/quote/:code', async (req, res) => {
  try {
    const rawCode = req.params.code;
    const formatted = formatTencentCode(rawCode);
    
    const response = await fetch(`https://qt.gtimg.cn/q=${formatted}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch quote from upstream' });
    }

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder('gbk').decode(buffer);
    const quote = parseTencentQuote(text);

    if (!quote || quote.price === 0) {
      return res.status(404).json({ error: 'Stock code not found or quote unavailable' });
    }

    res.json({ success: true, data: quote });
  } catch (err: any) {
    console.error('Error fetching single quote:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 2. 批量股票当天真实行情 API
app.get('/api/quotes', async (req, res) => {
  try {
    const codesParam = (req.query.codes as string) || '';
    if (!codesParam) {
      return res.status(400).json({ error: 'Missing codes parameter' });
    }

    const codesList = codesParam
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 150); // 单次最多批量获取 150 支

    const formattedCodes = codesList.map(formatTencentCode);
    const url = `https://qt.gtimg.cn/q=${formattedCodes.join(',')}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch batch quotes from upstream' });
    }

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder('gbk').decode(buffer);
    const lines = text.trim().split(';').filter((l) => l.trim().length > 0);

    const quotes: Record<string, any> = {};
    for (const line of lines) {
      const q = parseTencentQuote(line);
      if (q && q.code) {
        quotes[q.code] = q;
      }
    }

    res.json({
      success: true,
      count: Object.keys(quotes).length,
      data: quotes,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error fetching batch quotes:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 辅助函数：反转义 Unicode 字符 (\u8d64\u5929\u5316 -> 赤天化)
function decodeUnicodeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/%u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// 3. 全市场 A 股智能搜索 API (支持名称、拼音首字母、6位代码任意检索)
app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const url = `https://smartbox.gtimg.cn/s3/?t=all&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to search from upstream' });
    }

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder('gbk').decode(buffer);
    const match = text.match(/v_hint=\"(.*?)\"/);
    
    if (!match || !match[1]) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const rawItems = match[1].split('^');
    const results = rawItems
      .map((item) => {
        const parts = item.split('~');
        const rawMarket = (parts[0] || 'sh').toLowerCase();
        let market: 'SH' | 'SZ' | 'BJ' = 'SH';
        if (rawMarket === 'sz') market = 'SZ';
        else if (rawMarket === 'bj') market = 'BJ';

        const code = parts[1] || '';
        const rawName = parts[2] || '';
        const name = decodeUnicodeString(rawName);
        const pinyin = parts[3] || '';
        const type = parts[4] || '';

        return {
          market,
          code,
          name,
          pinyin,
          type,
          fullCode: `${market.toLowerCase()}${code}`
        };
      })
      // 优先保留 A 股核心股票与主要标的 (GP-A 或 6位数字代码)
      .filter((item) => {
        return (
          item.code &&
          item.name &&
          (/^\d{6}$/.test(item.code) || item.type.includes('GP-A') || item.type.includes('GP'))
        );
      });

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err: any) {
    console.error('Error in /api/search:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 4. 健康检查 API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ===== 微信公众号登录（website-to-wechat）：webhook + 配对 + 验证 =====
// 注意：配对状态为内存存储，必须单实例部署（Cloud Run max-instances=1）。
const SITE_URL = process.env.APP_URL || process.env.SITE_URL || 'https://a-studio-1816.ai.studio';
const WECHAT_WEBHOOK_ENABLED = process.env.WECHAT_MP_WEBHOOK_ENABLED !== 'false';
const WECHAT_LOGIN_ENABLED = process.env.WECHAT_MP_LOGIN_ENABLED === 'true';

const wechatConfig = {
  appId: process.env.WECHAT_MP_APP_ID || '',
  originalId: process.env.WECHAT_MP_ORIGINAL_ID || 'gh_7d39de02f610',
  token: process.env.WECHAT_MP_TOKEN || '',
  aesKey: process.env.WECHAT_MP_AES_KEY || '',
  codeSecret: process.env.WECHAT_MP_CODE_SECRET || '',
  namespace: '',
};
wechatConfig.namespace = `${wechatConfig.appId}:a-studio`;

const ONE_TAP_PATH = '/?wechat_login'; // SPA：前端用 query 参数接管一键登录

const webhook = createWebhookHandler({
  config: wechatConfig as any,
  replies: replies as any,
  loginKeywords: ['股息'],
  async onLoginKeyword(message: any) {
    if (!WECHAT_LOGIN_ENABLED) return '登录功能即将开放，敬请期待～';
    const code = issueLoginCode(wechatConfig, message);
    if (!code) return '请求太频繁，请 5 分钟后再试。';
    return `登录验证码：${code}（5 分钟有效）\n\n在微信里浏览网站？直接点：${SITE_URL}${ONE_TAP_PATH}=${code}`;
  },
  async onPairCode(message: any, code: string) {
    return pairLogin(wechatConfig, code, message)
      ? '已登录，回到网页即可。'
      : '登录码无效或已过期，请在网页上获取新的登录码。';
  },
  routes: [{
    test: (t: string) => t === '下载' || t === 'download',
    reply: async () => process.env.DOWNLOAD_REPLY || `${SITE_URL}/download`,
  }],
});

// 把 WHATWG Request/Response 适配到 Express
async function handleWebRequest(webHandler: (r: any) => Promise<any>, req: any, res: any) {
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const init: any = { method: req.method, headers: req.headers as any };
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = req.body ?? '';
  try {
    const webRes = await webHandler(new Request(url, init));
    const buf = Buffer.from(await webRes.arrayBuffer());
    webRes.headers.forEach((v: string, k: string) => res.setHeader(k, v));
    res.status(webRes.status).send(buf);
  } catch {
    res.status(500).send('error');
  }
}

app.all('/api/wechat/webhook', express.text({ type: () => true }), (req, res) => {
  if (!WECHAT_WEBHOOK_ENABLED) return res.status(404).send('not found');
  return handleWebRequest(webhook, req, res);
});

app.post('/api/wechat/pair', express.json(), async (req, res) => {
  const { action, browserKey } = (req.body || {}) as any;
  if (!WECHAT_LOGIN_ENABLED) return res.status(403).json({ ok: false, reason: 'login_disabled' });
  if (action === 'create') {
    const pair = createLoginPair(wechatConfig, browserKey);
    if (!pair) return res.status(429).json({ ok: false, reason: 'rate_limited' });
    return res
      .cookie('wx_pair', pair.request, { maxAge: pair.expiresIn * 1000, path: '/api/wechat/pair', httpOnly: true, secure: true, sameSite: 'lax' })
      .set('Cache-Control', 'no-store')
      .json({ ok: true, code: pair.code, expiresIn: pair.expiresIn });
  }
  if (action === 'claim') {
    const secret = (req.headers.cookie || '').match(/(?:^|; )wx_pair=([^;]+)/)?.[1];
    const result = claimLoginPair(wechatConfig, secret);
    if (result.status !== 'paired') return res.set('Cache-Control', 'no-store').json({ ok: true, ...result });
    const subject = siteSubject(wechatConfig.codeSecret, wechatConfig.namespace, (result as any).openid);
    res.cookie('wechat_session', subject, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    return res.set('Cache-Control', 'no-store').json({ ok: true, status: 'paired', openid: (result as any).openid });
  }
  return res.status(400).json({ ok: false });
});

app.post('/api/wechat/verify', express.json(), async (req, res) => {
  const { code, browserKey } = (req.body || {}) as any;
  if (!WECHAT_LOGIN_ENABLED) return res.status(403).json({ ok: false, reason: 'login_disabled' });
  const openid = consumeLoginCode(wechatConfig, code, browserKey);
  if (!openid) return res.status(400).json({ ok: false, reason: 'invalid_or_expired' });
  const subject = siteSubject(wechatConfig.codeSecret, wechatConfig.namespace, openid);
  res.cookie('wechat_session', subject, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  return res.json({ ok: true, status: 'paired', openid });
});

// Vite middleware configuration for Full-Stack
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
