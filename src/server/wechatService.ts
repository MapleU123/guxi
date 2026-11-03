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
}

const DEFAULT_WECHAT_CONFIG: WeChatConfig = {
  name: '我爱这young',
  wechatId: 'gh_7d39de02f610',
  qrImageUrl: '/assets/qrcode_gh_7d39de02f610.jpg',
  token: process.env.WECHAT_TOKEN || 'a_share_dividend_wechat_token'
};

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

export function getWeChatConfig(): WeChatConfig {
  return DEFAULT_WECHAT_CONFIG;
}

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
      nickname: userInfo.nickname || `${DEFAULT_WECHAT_CONFIG.name}·学友`,
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
  session.nickname = userInfo.nickname || session.nickname || `${DEFAULT_WECHAT_CONFIG.name}·学友`;
  session.avatar = userInfo.avatar || session.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
  session.pairedAt = Date.now();

  return { success: true, message: '配对成功', session };
}

/**
 * Parse standard WeChat official XML message
 */
export function parseWeChatXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tags = ['ToUserName', 'FromUserName', 'CreateTime', 'MsgType', 'Content', 'MsgId', 'Event', 'EventKey'];
  
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
