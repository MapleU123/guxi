import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { 
  getStoredSmtpConfig, 
  saveSmtpConfig, 
  sendVerificationEmail, 
  verifyEmailCode, 
  sendTestEmail 
} from './src/server/emailService';
import {
  generatePairingCode,
  checkPairingStatus,
  confirmPairing,
  getWeChatConfig,
  parseWeChatXml,
  buildWeChatReplyXml,
  buildWeChatImageReplyXml,
  getWeChatUserInfo,
  fillNickname,
  getWeChatAccessToken,
  buildSubscribeUrl,
  handleSubscribeCallback,
  sendSubscriptionMessage,
  pushToScene,
  SUBSCRIBE_SCENES
} from './src/server/wechatService';
import { createWebhookHandler } from './wechat/webhook';
import { issueLoginCode } from './wechat/pairing';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.text({ type: ['text/xml', 'application/xml'] }));

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

// 5. 真实邮箱验证码发送 API
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email, officialAccountName } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: '请提供接收验证码的邮箱地址' });
    }
    const result = await sendVerificationEmail(email, officialAccountName);
    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/auth/send-code:', err);
    res.status(500).json({ success: false, message: err.message || '内部服务错误' });
  }
});

// 6. 邮箱验证码核验与登录 API
app.post('/api/auth/verify-code', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: '请提供邮箱与 6 位数字验证码' });
    }
    const result = verifyEmailCode(email, code);
    if (!result.success) {
      return res.status(400).json(result);
    }
    const emailPrefix = email.split('@')[0] || '投资学友';
    const userSession = {
      isLoggedIn: true,
      loginMethod: 'email',
      userId: `usr_${Date.now().toString().slice(-6)}`,
      name: emailPrefix,
      avatar: '',
      account: email,
      email: email,
      loginAt: new Date().toLocaleString(),
      role: 'VIP会员 (邮箱认证)'
    };
    res.json({ success: true, message: '邮箱验证成功', session: userSession });
  } catch (err: any) {
    console.error('Error in /api/auth/verify-code:', err);
    res.status(500).json({ success: false, message: err.message || '内部服务错误' });
  }
});

// 7. 查询当前发信邮箱 (SMTP) 配置状态
app.get('/api/auth/email-config', (req, res) => {
  const config = getStoredSmtpConfig();
  if (!config) {
    return res.json({ isConfigured: false, config: null });
  }
  res.json({
    isConfigured: true,
    config: {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      pass: '••••••••',
      fromName: config.fromName,
      fromEmail: config.fromEmail
    }
  });
});

// 8. 保存发信邮箱 (SMTP) 配置
app.post('/api/auth/email-config', (req, res) => {
  try {
    const { host, port, secure, user, pass, fromName, fromEmail } = req.body;
    if (!host || !user || !pass) {
      return res.status(400).json({ success: false, message: '请完整填写 SMTP 主机、账号与授权码/密码' });
    }
    saveSmtpConfig({
      host: host.trim(),
      port: Number(port) || 465,
      secure: secure !== undefined ? Boolean(secure) : (Number(port) || 465) === 465,
      user: user.trim(),
      pass: pass.trim(),
      fromName: (fromName || '我爱这young').trim(),
      fromEmail: (fromEmail || user).trim()
    });
    res.json({ success: true, message: 'SMTP 发信配置已成功保存并立即生效！' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '保存配置失败' });
  }
});

// 9. 发送测试邮件测试 SMTP 连接与真实投递
app.post('/api/auth/test-email', async (req, res) => {
  try {
    const { toEmail, config } = req.body;
    if (!toEmail) {
      return res.status(400).json({ success: false, message: '请提供接收测试邮件的邮箱' });
    }
    const result = await sendTestEmail(toEmail, config);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '发送测试邮件失败' });
  }
});

// ==========================================
// 10. 微信公众号关注即登录 (website-to-wechat) API
// ==========================================

// 10.1 获取/生成新的微信配对码
app.get('/api/wechat/code', (req, res) => {
  const session = generatePairingCode();
  const config = getWeChatConfig();
  res.json({
    success: true,
    code: session.code,
    expiresAt: session.expiresAt,
    officialAccount: {
      name: config.name,
      wechatId: config.wechatId,
      qrImageUrl: config.qrImageUrl
    }
  });
});

// 10.2 轮询配对状态 (前端每 1.5~2 秒轮询)
app.get('/api/wechat/check-status', (req, res) => {
  const code = (req.query.code as string || '').trim();
  if (!code) {
    return res.status(400).json({ success: false, message: '缺少配对码参数' });
  }

  const result = checkPairingStatus(code);
  if (result.status === 'paired' && result.session) {
    const userSession = {
      isLoggedIn: true,
      loginMethod: 'wechat',
      userId: result.session.openid || `wx_${result.session.code}`,
      name: result.session.nickname || '我爱这young·学友',
      avatar: result.session.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      account: `wx_${result.session.code}`,
      wechatNickname: result.session.nickname || '我爱这young·学友',
      loginAt: new Date().toLocaleString(),
      role: 'VIP会员 (公众号已关注)'
    };
    return res.json({
      success: true,
      status: 'paired',
      session: userSession
    });
  }

  res.json({
    success: true,
    status: result.status,
    message: result.status === 'pending' ? '等待用户在公众号发送配对码' : '配对码无效或已过期'
  });
});

// 10.3 客户端模拟或主动确认配对
app.post('/api/wechat/pair', (req, res) => {
  const { code, nickname, avatar, openid } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: '请提供配对码' });
  }

  const result = confirmPairing(code.trim(), { nickname, avatar, openid });
  if (!result.success || !result.session) {
    return res.status(400).json({ success: false, message: result.message });
  }

  const userSession = {
    isLoggedIn: true,
    loginMethod: 'wechat',
    userId: result.session.openid || `wx_${result.session.code}`,
    name: result.session.nickname || '我爱这young·学友',
    avatar: result.session.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    account: `wx_${result.session.code}`,
    wechatNickname: result.session.nickname || '我爱这young·学友',
    loginAt: new Date().toLocaleString(),
    role: 'VIP会员 (公众号已关注)'
  };

  res.json({
    success: true,
    message: '公众号配对授权成功',
    session: userSession
  });
});

const WECHAT_MP_CONFIG = {
  appId: process.env.WECHAT_MP_APP_ID || '',
  appSecret: process.env.WECHAT_MP_APP_SECRET || '',
  originalId: process.env.WECHAT_MP_ORIGINAL_ID || 'gh_7d39de02f610',
  token: process.env.WECHAT_MP_TOKEN || process.env.WECHAT_TOKEN || 'a_share_dividend_wechat_token',
  aesKey: process.env.WECHAT_MP_AES_KEY || '',
  codeSecret: process.env.WECHAT_MP_CODE_SECRET || 'a_share_dividend_pairing_secret_key_12345',
  namespace: 'ashare-dividend'
};

let officialReplies: any = {};
try {
  const repliesRaw = fs.readFileSync(path.join(process.cwd(), 'wechat', 'replies.zh-CN.json'), 'utf-8');
  officialReplies = JSON.parse(repliesRaw);
} catch (e) {
  console.warn('Could not load wechat replies.zh-CN.json', e);
}

const officialWebhookHandler = createWebhookHandler({
  config: WECHAT_MP_CONFIG,
  loginKeywords: ['登录', '登入', 'login'],
  replies: officialReplies,
  onLoginKeyword: async (message: any) => {
    const code = issueLoginCode(WECHAT_MP_CONFIG, message);
    if (!code) return '登录请求过于频繁，请稍候再试。';
    confirmPairing(code, {
      openid: message.FromUserName,
      nickname: `微信用户_${message.FromUserName.slice(-4)}`
    });
    const siteUrl = process.env.SITE_URL || 'https://a-studio-1816.ai.studio';
    return `您的登录码为：${code}（5分钟内有效）\n\n👉 微信内一键免密登录：\n${siteUrl}/?wechat_login=${code}\n\n或者在网页直接输入该 6 位配对码完成授权。`;
  },
  onPairCode: async (message: any, code: string) => {
    confirmPairing(code, {
      openid: message.FromUserName,
      nickname: `微信用户_${message.FromUserName.slice(-4)}`
    });
    return `🎉 恭喜！配对码【${code}】验证成功！\n\n已为您解锁全站 5,652 支股票数据、理想股息率备选池测算及高清长图导出权限，立即返回浏览器即可开始使用。`;
  }
});

// 10.4 微信公众平台开发者接入验证 (GET Webhook)
app.get('/api/wechat/webhook', async (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  const config = getWeChatConfig();

  if (!signature || !timestamp || !nonce || !echostr) {
    return res.send('WeChat Webhook endpoint ready');
  }

  // 微信服务器安全加密模式 (GET echostr decrypt)
  if (req.query.msg_signature && WECHAT_MP_CONFIG.aesKey) {
    try {
      const url = `${req.protocol}://${req.get('host') || 'localhost'}${req.originalUrl}`;
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v !== undefined) {
          if (Array.isArray(v)) v.forEach(val => headers.append(k, val));
          else headers.set(k, v);
        }
      }
      const whatwgReq = new Request(url, { method: 'GET', headers });
      const whatwgRes = await officialWebhookHandler(whatwgReq);
      res.status(whatwgRes.status);
      const text = await whatwgRes.text();
      return res.send(text);
    } catch (e) {
      console.warn('Official encrypted webhook GET check failed, using fallback check', e);
    }
  }

  // 微信服务器标准 SHA-1 签名验证
  const token = WECHAT_MP_CONFIG.token || config.token;
  const arr = [token, String(timestamp), String(nonce)].sort();
  const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');

  if (sha1 === signature) {
    res.send(echostr);
  } else {
    res.status(403).send('Invalid signature');
  }
});

// 10.5 微信公众平台消息推送与自动配对 (POST Webhook - 支持 AES 安全模式与明文模式)
app.post('/api/wechat/webhook', async (req, res) => {
  try {
    const rawXml = typeof req.body === 'string' ? req.body : '';
    const isEncrypted = req.query.encrypt_type === 'aes' || req.query.msg_signature;

    if (isEncrypted && WECHAT_MP_CONFIG.aesKey) {
      try {
        const url = `${req.protocol}://${req.get('host') || 'localhost'}${req.originalUrl}`;
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v !== undefined) {
            if (Array.isArray(v)) v.forEach(val => headers.append(k, val));
            else headers.set(k, v);
          }
        }
        const whatwgReq = new Request(url, {
          method: 'POST',
          headers,
          body: rawXml
        });
        const whatwgRes = await officialWebhookHandler(whatwgReq);
        res.status(whatwgRes.status);
        whatwgRes.headers.forEach((v, k) => res.setHeader(k, v));
        const replyBody = await whatwgRes.text();
        return res.send(replyBody);
      } catch (e) {
        console.error('Official encrypted webhook POST error:', e);
      }
    }

    if (!rawXml) {
      return res.send('success');
    }

    const msg = parseWeChatXml(rawXml);
    const fromUser = msg.FromUserName || '';
    const toUser = msg.ToUserName || '';
    const msgType = msg.MsgType || '';
    const content = (msg.Content || '').trim();

    // 当用户发送 6 位数字验证码时自动配对 (支持纯文本模式)
    if (msgType === 'text' && /^\d{6}$/.test(content)) {
      const info = await getWeChatUserInfo(fromUser);
      confirmPairing(content, {
        openid: fromUser,
        nickname: info ? info.nickname : `微信用户_${fromUser.slice(-4)}`,
        avatar: info ? info.headimgurl : undefined
      });

      const namePrefix = info ? `${info.nickname}，` : '';
      const replyText = `🎉 恭喜${namePrefix}配对码【${content}】验证成功！您的微信已与网站账号绑定，之后在网站登录时可直接用微信授权。`;
      const replyXml = buildWeChatReplyXml(fromUser, toUser, replyText);
      res.type('application/xml').send(replyXml);
      return;
    }

    // 登录关键词 (网站优化中, 暂不主动推网站登录)
    if (msgType === 'text' && (content === '登录' || content.toLowerCase() === 'login')) {
      const info = await getWeChatUserInfo(fromUser);
      const namePrefix = info ? `${info.nickname}，` : '';
      const replyText = `${namePrefix}网站正在优化升级中，登录功能暂未开放，敬请期待～有高股息相关问题也可以加我微信 leungmaple 一对一交流。`;
      const replyXml = buildWeChatReplyXml(fromUser, toUser, replyText);
      res.type('application/xml').send(replyXml);
      return;
    }

    // 关注事件欢迎语 (支持 {微信名} 占位符)
    if (msgType === 'event' && msg.Event === 'subscribe') {
      const info = await getWeChatUserInfo(fromUser);
      const welcomeText = fillNickname(
        officialReplies.subscribe || `您好！欢迎关注【我爱这young】。\n\n回复「股息」拿高股息清单，回复「下载」拿资料，也可以加我微信 leungmaple 一对一交流～`,
        info ? info.nickname : null
      );
      const replyXml = buildWeChatReplyXml(fromUser, toUser, welcomeText);
      res.type('application/xml').send(replyXml);
      return;
    }

    // 关键词自动回复 (支持 图片回复 与 微信昵称个性化)
    if (msgType === 'text' && officialReplies.keywords) {
      const matched = officialReplies.keywords.find((k: any) => k.keyword && content.includes(k.keyword));
      if (matched) {
        const info = await getWeChatUserInfo(fromUser);
        const nickname = info ? info.nickname : null;
        // 图片回复: 取微信后台素材 media_id 直接下发
        if (matched.type === 'image') {
          if (matched.mediaId && !/^REPLACE_/i.test(String(matched.mediaId))) {
            const imgXml = buildWeChatImageReplyXml(fromUser, toUser, matched.mediaId);
            res.type('application/xml').send(imgXml);
          } else {
            // 未配置有效 media_id: 降级为文本提示, 避免下发无效图片导致微信报错
            const fallback = matched.fallback || '该图片尚未配置完成，请稍后再试，或回复「股息」拿清单。';
            const replyXml = buildWeChatReplyXml(fromUser, toUser, fillNickname(fallback, nickname));
            res.type('application/xml').send(replyXml);
          }
          return;
        }
        // 文本回复: 替换 {微信名} 占位符为粉丝真实昵称
        const replyText = fillNickname(matched.reply || '', nickname);
        const replyXml = buildWeChatReplyXml(fromUser, toUser, replyText);
        res.type('application/xml').send(replyXml);
        return;
      }
    }

    // 未匹配关键词: 发送默认回复 (同样支持 {微信名} 占位符)
    if (msgType === 'text' && officialReplies.default) {
      const info = await getWeChatUserInfo(fromUser);
      const replyText = fillNickname(officialReplies.default, info ? info.nickname : null);
      const replyXml = buildWeChatReplyXml(fromUser, toUser, replyText);
      res.type('application/xml').send(replyXml);
      return;
    }

    res.send('success');
  } catch (err) {
    console.error('Error handling WeChat webhook:', err);
    res.send('success');
  }
});

// 10.6 获取微信公众号公开配置
app.get('/api/wechat/config', (req, res) => {
  const config = getWeChatConfig();
  res.json({
    success: true,
    data: {
      name: config.name,
      wechatId: config.wechatId,
      qrImageUrl: config.qrImageUrl
    }
  });
});

// 10.7 生成订阅消息授权链接 (前端按钮点击后跳转微信授权)
app.get('/api/wechat/subscribe-url', (req, res) => {
  const sceneKey = (req.query.scene as string) || 'stockUpdate';
  const sceneMap = SUBSCRIBE_SCENES[sceneKey];
  if (!sceneMap || !sceneMap.templateId) {
    return res.status(400).json({
      success: false,
      message: '未配置该场景的订阅模板 template_id。请在微信后台「订阅消息 → 我的模板」创建模板,并将 template_id 填入环境变量 WECHAT_MP_SUB_TEMPLATE_STOCK'
    });
  }
  const url = buildSubscribeUrl(sceneMap.scene, sceneMap.templateId);
  res.json({ success: true, url, title: sceneMap.title });
});

// 10.8 微信订阅授权回调 (用户确认后微信重定向到此)
app.get('/api/wechat/subscribe/callback', (req, res) => {
  const r = handleSubscribeCallback(req.query as Record<string, string>);
  const site = process.env.SITE_URL || 'https://a-studio-1816.ai.studio';
  return res.redirect(`${site}/?subscribe=${r.ok ? 'ok' : 'cancel'}`);
});

// 10.9 主动推送 (运营/测试触发; 一次性订阅, 每位用户发完即失效需重新授权)
app.post('/api/wechat/push', async (req, res) => {
  const body = req.body || {};
  const sceneKey = body.scene || 'stockUpdate';
  const sceneMap = SUBSCRIBE_SCENES[sceneKey];
  if (!sceneMap) {
    return res.status(400).json({ success: false, message: '未知订阅场景' });
  }
  // 支持直接传 data(与微信模板字段对应); 否则用简单 title/content 映射
  const data = body.data || {
    first: { value: body.title || `${sceneMap.title}提醒` },
    keyword1: { value: body.content || '' },
    remark: { value: '点击查看详情 →' }
  };
  try {
    const result = await pushToScene(sceneMap.scene, data, body.url);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || '推送失败' });
  }
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
