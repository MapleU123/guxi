import fs from 'fs';
import path from 'path';

// WeChat Official Account Pairing Service (website-to-wechat)
// Handles pairing codes, status polling, and WeChat Webhook callbacks

export interface WeChatPairingSession {
  code: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'paired' | 'expired';
  openid?: string;
  nickname?: string;
  avatar?: string;
  pairedAt?: number;
}

export interface WeChatConfig {
  name: string;
  wechatId: string;
  qrImageUrl: string;
  token: string;
  appId?: string;
  appSecret?: string;
  aesKey?: string;
}

export interface WeChatMpServerConfig {
  appId: string;
  appSecret: string;
  originalId: string;
  token: string;
  aesKey: string;
  codeSecret: string;
  namespace: string;
}

const MP_CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'wechat_mp_config.json');

export function getStoredWeChatMpConfig(): WeChatMpServerConfig {
  let saved: Partial<WeChatMpServerConfig> = {};
  if (fs.existsSync(MP_CONFIG_FILE_PATH)) {
    try {
      saved = JSON.parse(fs.readFileSync(MP_CONFIG_FILE_PATH, 'utf-8'));
    } catch (e) {
      console.warn('[WeChat] Could not read wechat_mp_config.json', e);
    }
  }

  return {
    appId: saved.appId !== undefined ? saved.appId : (process.env.WECHAT_MP_APP_ID || ''),
    appSecret: saved.appSecret !== undefined ? saved.appSecret : (process.env.WECHAT_MP_APP_SECRET || ''),
    originalId: saved.originalId || process.env.WECHAT_MP_ORIGINAL_ID || 'gh_7d39de02f610',
    token: saved.token || process.env.WECHAT_MP_TOKEN || process.env.WECHAT_TOKEN || 'a_share_dividend_wechat_token',
    aesKey: saved.aesKey !== undefined ? saved.aesKey : (process.env.WECHAT_MP_AES_KEY || ''),
    codeSecret: saved.codeSecret || process.env.WECHAT_MP_CODE_SECRET || 'a_share_dividend_pairing_secret_key_12345',
    namespace: saved.namespace || 'ashare-dividend'
  };
}

export function saveWeChatMpConfig(config: Partial<WeChatMpServerConfig>): WeChatMpServerConfig {
  const current = getStoredWeChatMpConfig();
  const updated: WeChatMpServerConfig = {
    ...current,
    ...config
  };

  try {
    const dir = path.dirname(MP_CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MP_CONFIG_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    console.log('[WeChat] Successfully saved wechat_mp_config.json');
  } catch (e) {
    console.error('[WeChat] Failed to save wechat_mp_config.json', e);
  }

  return updated;
}

export function getWeChatConfig(): WeChatConfig {
  const mp = getStoredWeChatMpConfig();
  return {
    name: '我爱这young',
    wechatId: mp.originalId || 'gh_7d39de02f610',
    qrImageUrl: '/assets/qrcode_gh_7d39de02f610.jpg',
    token: mp.token || 'a_share_dividend_wechat_token',
    appId: mp.appId || '',
    appSecret: mp.appSecret || '',
    aesKey: mp.aesKey || ''
  };
}

// In-memory pairing sessions map: code -> session
const pairingSessions = new Map<string, WeChatPairingSession>();

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, sess] of pairingSessions.entries()) {
    if (sess.expiresAt < now) {
      pairingSessions.delete(code);
    }
  }
}, 60 * 1000);

/**
 * Generate a new 6-digit numeric pairing code valid for 10 minutes
 */
export function generatePairingCode(): WeChatPairingSession {
  const now = Date.now();
  // Generate a random 6-digit code
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  // Avoid leading zero if desired, ensure 6 digits
  if (code.length < 6 || code.startsWith('0')) {
    code = String(Math.floor(100000 + Math.random() * 900000));
  }

  const session: WeChatPairingSession = {
    code,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes
    status: 'pending'
  };

  pairingSessions.set(code, session);
  return session;
}

/**
 * Check the current pairing status for a given code
 */
export function checkPairingStatus(code: string): {
  status: 'pending' | 'paired' | 'expired' | 'not_found';
  session?: WeChatPairingSession;
} {
  const session = pairingSessions.get(code);
  if (!session) {
    return { status: 'not_found' };
  }
  if (Date.now() > session.expiresAt) {
    session.status = 'expired';
    return { status: 'expired', session };
  }
  return { status: session.status, session };
}

/**
 * Mark a code as paired (either via WeChat webhook or web simulation)
 */
export function confirmPairing(
  code: string,
  userInfo: { openid?: string; nickname?: string; avatar?: string } = {}
): { success: boolean; message: string; session?: WeChatPairingSession } {
  const session = pairingSessions.get(code);
  if (!session) {
    // If not found, create an auto-paired session so user is never blocked
    const now = Date.now();
    const newSession: WeChatPairingSession = {
      code,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000,
      status: 'paired',
      openid: userInfo.openid || `wx_openid_${code}`,
      nickname: userInfo.nickname || '我爱这young·学友',
      avatar: userInfo.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      pairedAt: now
    };
    pairingSessions.set(code, newSession);
    return { success: true, message: '配对成功', session: newSession };
  }

  if (Date.now() > session.expiresAt) {
    session.status = 'expired';
    return { success: false, message: '配对码已过期，请刷新二维码重新获取' };
  }

  session.status = 'paired';
  session.openid = userInfo.openid || session.openid || `wx_openid_${code}`;
  session.nickname = userInfo.nickname || session.nickname || '我爱这young·学友';
  session.avatar = userInfo.avatar || session.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
  session.pairedAt = Date.now();

  return { success: true, message: '配对成功', session };
}

/**
 * Parse standard WeChat official XML message
 */
export function parseWeChatXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tags = ['ToUserName', 'FromUserName', 'CreateTime', 'MsgType', 'Content', 'MsgId', 'Event', 'EventKey', 'Encrypt'];
  
  for (const tag of tags) {
    // Match <Tag><![CDATA[value]]></Tag> or <Tag>value</Tag>
    const cdataMatch = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`, 's'));
    if (cdataMatch) {
      result[tag] = cdataMatch[1].trim();
      continue;
    }
    const plainMatch = xml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 's'));
    if (plainMatch) {
      result[tag] = plainMatch[1].trim();
    }
  }
  return result;
}

/**
 * Build standard WeChat XML reply message
 */
export function buildWeChatReplyXml(
  toUser: string,
  fromUser: string,
  content: string
): string {
  const createTime = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${createTime}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA/${content}]]></Content>
</xml>`.replace('<![CDATA/', '<![CDATA[');
}

/**
 * 构造微信「图片消息」回复 XML (MsgType=image)。
 * 图片必须先在微信后台「素材管理」上传, 拿到永久 media_id 后填入配置。
 * 注意: 下发图片不需要 access_token, 只要 media_id 有效即可。
 */
export function buildWeChatImageReplyXml(
  toUser: string,
  fromUser: string,
  mediaId: string
): string {
  const createTime = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${createTime}</CreateTime>
<MsgType><![CDATA[image]]></MsgType>
<Image>
<MediaId><![CDATA[${mediaId}]]></MediaId>
</Image>
</xml>`;
}

/**
 * 构造微信「单条图文消息」回复 XML (MsgType=news)。
 * 图文消息无需 media_id，支持直接展示外链图片缩略图与跳转链接。
 */
export function buildWeChatNewsReplyXml(
  toUser: string,
  fromUser: string,
  article: { title: string; description: string; picUrl: string; url: string }
): string {
  const createTime = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${createTime}</CreateTime>
<MsgType><![CDATA[news]]></MsgType>
<ArticleCount>1</ArticleCount>
<Articles>
<item>
<Title><![CDATA[${article.title}]]></Title>
<Description><![CDATA[${article.description}]]></Description>
<PicUrl><![CDATA[${article.picUrl}]]></PicUrl>
<Url><![CDATA[${article.url}]]></Url>
</item>
</Articles>
</xml>`;
}

/**
 * 用真实微信昵称替换文本中的占位符 {微信名} / {nickname}。
 * 无法获取昵称时回退为「朋友」, 保证语句通顺。
 */
export function fillNickname(template: string, nickname: string | null): string {
  const name = nickname && nickname.trim() ? nickname.trim() : '朋友';
  return template
    .replace(/\{微信名\}/g, name)
    .replace(/\{nickname\}/gi, name);
}

// 微信昵称缓存: user/info 有调用频率限制, 缓存 12 小时降低压力
const userInfoCache = new Map<string, { nickname: string; headimgurl: string; expiresAt: number }>();

/**
 * 获取粉丝真实的微信昵称与头像 (需配置 AppID + AppSecret)。
 * 默认 600ms 超时，避免拖慢回复导致微信官方 5 秒网关超时断连。
 */
export async function getWeChatUserInfo(
  openid: string,
  timeoutMs = 600
): Promise<{ nickname: string; headimgurl: string } | null> {
  const cfg = getWeChatConfig();
  if (!cfg.appId || !cfg.appSecret || !openid) return null;

  const cached = userInfoCache.get(openid);
  if (cached && cached.expiresAt > Date.now()) {
    return { nickname: cached.nickname, headimgurl: cached.headimgurl };
  }

  try {
    const token = await getWeChatAccessToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${token}&openid=${openid}&lang=zh_CN`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    const data = (await res.json()) as { nickname?: string; headimgurl?: string; errcode?: number };
    if (data && data.nickname) {
      userInfoCache.set(openid, {
        nickname: data.nickname,
        headimgurl: data.headimgurl || '',
        expiresAt: Date.now() + 12 * 60 * 60 * 1000
      });
      return { nickname: data.nickname, headimgurl: data.headimgurl || '' };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// 群/个人二维码 media_id 临时素材缓存 (3 天内有效)
let cachedGroupMediaId: { mediaId: string; expiresAt: number } | null = null;

/**
 * 自动上传本地二维码图片至微信获取临时素材 media_id
 */
export async function getOrUploadGroupQrMediaId(): Promise<string | null> {
  if (cachedGroupMediaId && cachedGroupMediaId.expiresAt > Date.now()) {
    return cachedGroupMediaId.mediaId;
  }
  const cfg = getWeChatConfig();
  if (!cfg.appId || !cfg.appSecret) return null;
  try {
    const token = await getWeChatAccessToken();
    const filePath = path.join(process.cwd(), 'public', 'assets', 'aistudio', 'image_5a13498c.png');
    if (!fs.existsSync(filePath)) return null;

    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('media', blob, 'group_qr.png');

    const uploadUrl = `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${token}&type=image`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    const data = (await res.json()) as { media_id?: string; created_at?: number; errcode?: number; errmsg?: string };
    if (data.media_id) {
      cachedGroupMediaId = {
        mediaId: data.media_id,
        expiresAt: Date.now() + 2.5 * 24 * 60 * 60 * 1000 // 缓存 2.5 天
      };
      console.log(`[WeChat] Successfully cached temporary group QR media_id: ${data.media_id}`);
      return data.media_id;
    }
  } catch (err) {
    console.warn('[WeChat] getOrUploadGroupQrMediaId failed:', err);
  }
  return null;
}

// ============================================================
// 11. 微信订阅消息 (一次性订阅) — 主动推送基础设施
// ============================================================

/**
 * 订阅场景: scene 为 1-255 整数,对应微信后台「订阅消息 → 我的模板」的某一模板。
 * 在微信后台创建模板后,把 template_id 填入对应环境变量。
 */
export const SUBSCRIBE_SCENES: Record<string, { scene: number; templateId: string; title: string }> = {
  stockUpdate: {
    scene: 1,
    templateId: process.env.WECHAT_MP_SUB_TEMPLATE_STOCK || '',
    title: '高股息清单更新'
  }
};

export interface WeChatSubscription {
  openid: string;
  scene: number;
  templateId: string;
  ticket: string;       // 一次订阅授权凭证
  createdAt: number;
  usedAt?: number;      // 推送后标记,一次性订阅用掉即失效
}

// 持久化: 文件存储(容器内有效;生产建议换 Netlify Blob / 数据库)
const SUB_STORE_PATH = process.env.WECHAT_SUB_STORE_PATH ||
  path.join(process.cwd(), 'data', 'wechat_subs.json');
const subscriptions = new Map<string, WeChatSubscription>(); // key: openid|scene

function loadSubs(): void {
  try {
    if (fs.existsSync(SUB_STORE_PATH)) {
      const arr = JSON.parse(fs.readFileSync(SUB_STORE_PATH, 'utf-8')) as WeChatSubscription[];
      arr.forEach((s) => subscriptions.set(`${s.openid}|${s.scene}`, s));
    }
  } catch { /* ignore */ }
}
function saveSubs(): void {
  try {
    fs.mkdirSync(path.dirname(SUB_STORE_PATH), { recursive: true });
    fs.writeFileSync(SUB_STORE_PATH, JSON.stringify([...subscriptions.values()], null, 2));
  } catch (e) { console.warn('[wechat] saveSubs failed', e); }
}
loadSubs();

let cachedToken: { token: string; expiresAt: number } | null = null;
let tokenErrorCooldown: { message: string; expiresAt: number } | null = null;

/** 获取/缓存 access_token(有效期 7200s),推送与取用户信息都需要它 */
export async function getWeChatAccessToken(): Promise<string> {
  const cfg = getWeChatConfig();
  if (!cfg.appId || !cfg.appSecret) {
    throw new Error('缺少 AppID / AppSecret');
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }
  if (tokenErrorCooldown && tokenErrorCooldown.expiresAt > Date.now()) {
    throw new Error(tokenErrorCooldown.message);
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${cfg.appId}&secret=${cfg.appSecret}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1200);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const data = await res.json() as { access_token?: string; expires_in?: number; errmsg?: string; errcode?: number };
    if (data.access_token) {
      cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 7200) * 1000 };
      tokenErrorCooldown = null;
      return cachedToken.token;
    }
    const errMsg = data.errmsg || '获取 access_token 失败';
    tokenErrorCooldown = { message: errMsg, expiresAt: Date.now() + 60 * 1000 };
    throw new Error(errMsg);
  } catch (err: any) {
    clearTimeout(timer);
    if (!tokenErrorCooldown) {
      tokenErrorCooldown = { message: err.message || '网络超时', expiresAt: Date.now() + 30 * 1000 };
    }
    throw err;
  }
}

/** 生成「一次性订阅消息」授权链接,前端按钮点击后跳转(必须在微信内打开) */
export function buildSubscribeUrl(scene: number, templateId: string): string {
  const cfg = getWeChatConfig();
  const site = process.env.SITE_URL || 'https://a-studio-1816.ai.studio';
  const redirect = encodeURIComponent(`${site}/api/wechat/subscribe/callback`);
  const reserved = encodeURIComponent(`scene_${scene}`);
  return `https://mp.weixin.qq.com/mp/subscribemsg?action=get_confirm&appid=${cfg.appId}` +
    `&scene=${scene}&template_id=${templateId}&redirect_url=${redirect}&reserved=${reserved}#wechat_redirect`;
}

/** 处理微信订阅授权回调 (用户确认后微信重定向到此) */
export function handleSubscribeCallback(params: Record<string, string>): { ok: boolean; message: string } {
  const { openid, template_id, scene, ticket, action } = params;
  if (action !== 'confirm' || !openid || !template_id) {
    return { ok: false, message: '用户未授权订阅' };
  }
  const key = `${openid}|${scene}`;
  subscriptions.set(key, {
    openid,
    scene: Number(scene),
    templateId: template_id,
    ticket,
    createdAt: Date.now()
  });
  saveSubs();
  return { ok: true, message: '订阅授权成功' };
}

/** 发送一条订阅消息给指定 openid */
export async function sendSubscriptionMessage(
  openid: string,
  templateId: string,
  data: Record<string, { value: string }>,
  url?: string
): Promise<{ ok: boolean; errmsg?: string }> {
  const token = await getWeChatAccessToken();
  const body = {
    touser: openid,
    template_id: templateId,
    url: url || process.env.SITE_URL || 'https://a-studio-1816.ai.studio',
    data
  };
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await res.json() as { errcode?: number; errmsg?: string };
  return { ok: result.errcode === 0, errmsg: result.errmsg };
}

/** 向某场景下所有已订阅用户推送一条消息(一次性订阅,发完即标记 used) */
export async function pushToScene(
  scene: number,
  data: Record<string, { value: string }>,
  url?: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const sub of subscriptions.values()) {
    if (sub.scene !== scene || sub.usedAt) continue;
    const r = await sendSubscriptionMessage(sub.openid, sub.templateId, data, url);
    if (r.ok) {
      sub.usedAt = Date.now();
      sent++;
    } else {
      failed++;
      console.warn(`[wechat] push failed for ${sub.openid}: ${r.errmsg}`);
    }
  }
  saveSubs();
  return { sent, failed };
}
