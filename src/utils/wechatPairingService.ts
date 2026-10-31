// website-to-wechat pairing logic — REAL backend-backed implementation.
//
// 替换原先的本地模拟（Math.random 生成码 + 假 session），改为与后端
// /api/wechat/pair、/api/wechat/verify 联动的真实公众号配对登录：
//   1) 页面打开即 POST /api/wechat/pair {action:'create'}（后端写 wx_pair cookie，返回 6 位码）
//   2) 访客在公众号里发送该码 → webhook 完成配对
//   3) 页面轮询 POST /api/wechat/pair {action:'claim'}，直到 status='paired'
//   4) 微信内一键登录：POST /api/wechat/verify {code}
//
// 模块以单例方式维护一份配对会话，被 AuthModal 与 StockTable 漏斗卡片共享，
// 保证两处展示的是同一个有效码。
import { UserSession } from '../types';

export interface OfficialAccountConfig {
  name: string;
  wechatId: string;
  qrImageUrl: string; // Base64 data URL or external URL
  description: string;
}

export interface PairingState {
  code: string;
  expiresAt: number; // timestamp
  status: 'loading' | 'pending' | 'paired' | 'expired' | 'error';
  officialAccountName: string;
  officialAccountId: string;
  officialAccountQrText: string;
  qrImageUrl?: string;
  error?: string;
}

const STORAGE_KEY_NAME = 'wechat_mp_account_name_v2';
const STORAGE_KEY_ID = 'wechat_mp_account_id_v2';
const STORAGE_KEY_QR = 'wechat_mp_qr_image_v2';
const BROWSER_ID_KEY = 'wx_browser_id_v1';

const DEFAULT_OFFICIAL_ACCOUNT_NAME = '我爱这young';
const DEFAULT_OFFICIAL_ACCOUNT_ID = 'gh_7d39de02f610';
const DEFAULT_QR_IMAGE = '/assets/qrcode_gh_7d39de02f610.jpg';

// ---- 模块级配对会话（AuthModal 与 StockTable 共享） ----
let activeCode = '';
let activeExpiresAt = 0;
let activeStatus: PairingState['status'] = 'loading';
let activeError = '';
let pollTimer: ReturnType<typeof setInterval> | null = null;
let sessionStarted = false;

const listeners = new Set<(s: PairingState) => void>();
const pairedHandlers = new Set<(s: UserSession) => void>();

function getBrowserId(): string {
  if (typeof window === 'undefined' || !window.localStorage) return 'anon';
  try {
    let id = localStorage.getItem(BROWSER_ID_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `b_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(BROWSER_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export function getOfficialAccountConfig(): OfficialAccountConfig {
  let name = DEFAULT_OFFICIAL_ACCOUNT_NAME;
  let wechatId = DEFAULT_OFFICIAL_ACCOUNT_ID;
  let qrImageUrl = DEFAULT_QR_IMAGE;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedName = localStorage.getItem(STORAGE_KEY_NAME);
      if (storedName) name = storedName;
      const storedId = localStorage.getItem(STORAGE_KEY_ID);
      if (storedId) wechatId = storedId;
      const storedQr = localStorage.getItem(STORAGE_KEY_QR);
      if (storedQr) qrImageUrl = storedQr;
    } catch {
      // ignore storage errors
    }
  }

  return {
    name,
    wechatId,
    qrImageUrl,
    description: '关注公众号【我爱这young】，专注高股息深度研究与价值投资'
  };
}

export function saveOfficialAccountConfig(config: Partial<OfficialAccountConfig>): OfficialAccountConfig {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (config.name !== undefined) localStorage.setItem(STORAGE_KEY_NAME, config.name);
      if (config.wechatId !== undefined) localStorage.setItem(STORAGE_KEY_ID, config.wechatId);
      if (config.qrImageUrl !== undefined) localStorage.setItem(STORAGE_KEY_QR, config.qrImageUrl);
    } catch (e) {
      console.warn('Failed to save official account config to localStorage', e);
    }
  }
  // 配置变更：刷新展示的公众号名称/ID/二维码，配对码保持不变
  notifyCurrent();
  return getOfficialAccountConfig();
}

export function resetOfficialAccountConfig(): OfficialAccountConfig {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(STORAGE_KEY_NAME);
      localStorage.removeItem(STORAGE_KEY_ID);
      localStorage.removeItem(STORAGE_KEY_QR);
    } catch {
      // ignore
    }
  }
  notifyCurrent();
  return getOfficialAccountConfig();
}

export function getCurrentPairingState(): PairingState {
  const config = getOfficialAccountConfig();
  return {
    code: activeCode,
    expiresAt: activeExpiresAt,
    status: activeStatus,
    officialAccountName: config.name,
    officialAccountId: config.wechatId,
    officialAccountQrText: `https://u.wechat.com/${config.wechatId}`,
    qrImageUrl: config.qrImageUrl,
    error: activeError
  };
}

function notifyCurrent() {
  const s = getCurrentPairingState();
  listeners.forEach((cb) => {
    try {
      cb(s);
    } catch (e) {
      console.error('Error notifying pairing listener', e);
    }
  });
}

function buildSessionFromOpenid(openid: string): UserSession {
  const config = getOfficialAccountConfig();
  const shortId = openid.length > 14 ? openid.slice(0, 14) : openid;
  const nickname = `${config.name}·学友`;
  return {
    isLoggedIn: true,
    loginMethod: 'wechat',
    userId: `wx_mp_${shortId}`,
    name: nickname,
    avatar: '',
    account: `${config.wechatId}_user`,
    wechatNickname: nickname,
    loginAt: new Date().toLocaleString(),
    role: 'VIP会员 (公众号已关注)'
  };
}

async function createPairing(): Promise<boolean> {
  try {
    const res = await fetch('/api/wechat/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'create', browserKey: getBrowserId() })
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!data.ok) {
      if (data.reason === 'login_disabled') {
        activeStatus = 'error';
        activeError = '登录功能即将开放，敬请期待～';
        notifyCurrent();
        return false;
      }
      if (data.reason === 'rate_limited') {
        activeStatus = 'error';
        activeError = '请求过于频繁，请稍后再试。';
        notifyCurrent();
        return false;
      }
      throw new Error(data.reason || 'create_failed');
    }
    activeCode = String(data.code);
    activeExpiresAt = Date.now() + (Number(data.expiresIn) || 600) * 1000;
    activeStatus = 'pending';
    activeError = '';
    notifyCurrent();
    return true;
  } catch (e: any) {
    // 网络瞬时错误：允许轮询循环重试
    activeStatus = 'error';
    activeError = '网络异常，正在重试…';
    notifyCurrent();
    return false;
  }
}

async function claimPairing(): Promise<{ status: 'pending' | 'paired' | 'expired'; openid?: string }> {
  try {
    const res = await fetch('/api/wechat/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'claim' })
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (data.status === 'paired') return { status: 'paired', openid: data.openid };
    if (data.status === 'expired') return { status: 'expired' };
    return { status: 'pending' };
  } catch {
    return { status: 'pending' };
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    const r = await claimPairing();
    if (r.status === 'paired') {
      stopPolling();
      sessionStarted = false;
      activeStatus = 'paired';
      notifyCurrent();
      const session = buildSessionFromOpenid(String(r.openid || ''));
      pairedHandlers.forEach((h) => {
        try {
          h(session);
        } catch (e) {
          console.error('Error in paired handler', e);
        }
      });
      return;
    }
    if (r.status === 'expired') {
      // 配对码过期：自动申请新的有效码
      sessionStarted = false;
      ensureSession();
      return;
    }
  }, 2000);
}

async function startSession() {
  const ok = await createPairing();
  if (!ok) {
    sessionStarted = false;
    return;
  }
  startPolling();
}

function ensureSession() {
  if (sessionStarted) return;
  sessionStarted = true;
  startSession().catch(() => {
    sessionStarted = false;
  });
}

/**
 * 订阅配对状态。首次订阅时自动开启一次配对会话并开始轮询；
 * 配对成功后调用 onPaired(session)。返回取消订阅的函数。
 */
export function subscribePairingState(
  callback: (state: PairingState) => void,
  onPaired?: (session: UserSession) => void
): () => void {
  listeners.add(callback);
  if (onPaired) pairedHandlers.add(onPaired);
  callback(getCurrentPairingState());
  ensureSession();
  return () => {
    listeners.delete(callback);
    if (onPaired) pairedHandlers.delete(onPaired);
    if (listeners.size === 0) {
      stopPolling();
      sessionStarted = false;
    }
  };
}

/** 强制刷新出一张新的配对码（手动「刷新」按钮）。 */
export function beginPairing() {
  stopPolling();
  sessionStarted = false;
  ensureSession();
}

/**
 * 演示/预览用：在不接入真实公众号时也能解锁查看 UI。
 * 仅在 WECHAT_MP_LOGIN_ENABLED=false 或预览环境使用，不是真实登录。
 */
export function simulateLogin(customNickname?: string): UserSession {
  const config = getOfficialAccountConfig();
  const nickname = customNickname || `${config.name}·学友`;
  return {
    isLoggedIn: true,
    loginMethod: 'wechat',
    userId: `wx_mp_${Date.now().toString().slice(-6)}`,
    name: nickname,
    avatar: '',
    account: `${config.wechatId}_user`,
    wechatNickname: nickname,
    loginAt: new Date().toLocaleString(),
    role: 'VIP会员 (公众号已关注)'
  };
}

/**
 * 微信内一键链接登录：访问 /?wechat_login=CODE 时调用。
 * 成功返回 UserSession，失败返回 null。
 */
export async function verifyOneTapLogin(code: string): Promise<UserSession | null> {
  try {
    const res = await fetch('/api/wechat/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ code, browserKey: getBrowserId() })
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!data.ok || data.status !== 'paired') return null;
    return buildSessionFromOpenid(String(data.openid || ''));
  } catch {
    return null;
  }
}
