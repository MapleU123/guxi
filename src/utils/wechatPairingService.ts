// website-to-wechat pairing logic following littleben/website-to-wechat
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
  officialAccountName: string;
  officialAccountId: string;
  officialAccountQrText: string;
  qrImageUrl?: string;
}

const STORAGE_KEY_NAME = 'wechat_mp_account_name_v1';
const STORAGE_KEY_ID = 'wechat_mp_account_id_v1';
const STORAGE_KEY_QR = 'wechat_mp_qr_image_v1';

const DEFAULT_OFFICIAL_ACCOUNT_NAME = '红利价值派';
const DEFAULT_OFFICIAL_ACCOUNT_ID = 'dividend_pro';

let currentCode = '';
let currentExpiresAt = 0;
const listeners: Array<(state: PairingState) => void> = [];

export function getOfficialAccountConfig(): OfficialAccountConfig {
  let name = DEFAULT_OFFICIAL_ACCOUNT_NAME;
  let wechatId = DEFAULT_OFFICIAL_ACCOUNT_ID;
  let qrImageUrl = '';

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
    description: 'A股高股息实盘研究 · 专注现金流与低估值价值投资'
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

  // Refresh pairing state with new config
  const updated = getOrGeneratePairingCode();
  notifyListeners(updated);
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

  const updated = getOrGeneratePairingCode();
  notifyListeners(updated);
  return getOfficialAccountConfig();
}

export function getOrGeneratePairingCode(): PairingState {
  const now = Date.now();
  const config = getOfficialAccountConfig();

  if (currentCode && currentExpiresAt > now) {
    return {
      code: currentCode,
      expiresAt: currentExpiresAt,
      officialAccountName: config.name,
      officialAccountId: config.wechatId,
      officialAccountQrText: `https://u.wechat.com/${config.wechatId}?code=${currentCode}`,
      qrImageUrl: config.qrImageUrl
    };
  }

  // Generate 6-digit code
  const newCode = String(Math.floor(100000 + Math.random() * 900000));
  currentCode = newCode;
  currentExpiresAt = now + 10 * 60 * 1000; // 10 minutes valid

  const state: PairingState = {
    code: currentCode,
    expiresAt: currentExpiresAt,
    officialAccountName: config.name,
    officialAccountId: config.wechatId,
    officialAccountQrText: `https://u.wechat.com/${config.wechatId}?code=${currentCode}`,
    qrImageUrl: config.qrImageUrl
  };

  notifyListeners(state);
  return state;
}

export function refreshPairingCode(): PairingState {
  currentCode = '';
  currentExpiresAt = 0;
  return getOrGeneratePairingCode();
}

export function subscribePairingState(callback: (state: PairingState) => void): () => void {
  listeners.push(callback);
  callback(getOrGeneratePairingCode());
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notifyListeners(state: PairingState) {
  listeners.forEach(cb => {
    try {
      cb(state);
    } catch (e) {
      console.error('Error notifying pairing listener', e);
    }
  });
}

/**
 * Simulates the WeChat backend Webhook receiving the user's pairing code message
 * Returns a new UserSession with WeChat profile
 */
export function simulateWeChatPairingSuccess(
  customNickname?: string,
  customAvatar?: string
): UserSession {
  const config = getOfficialAccountConfig();
  const nickname = customNickname || `${config.name}·学友`;
  const session: UserSession = {
    isLoggedIn: true,
    loginMethod: 'wechat',
    userId: `wx_mp_${Date.now().toString().slice(-6)}`,
    name: nickname,
    avatar: customAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    account: `${config.wechatId}_user`,
    wechatNickname: nickname,
    loginAt: new Date().toLocaleString(),
    role: 'VIP会员 (公众号已关注)'
  };
  return session;
}
