import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Lock, CheckCircle2, ShieldCheck, Sparkles, 
  ArrowRight, KeyRound, RefreshCw, Smartphone, AlertCircle,
  Eye, EyeOff, User, Check, Send, Copy, Radio, ExternalLink
} from 'lucide-react';
import { UserSession } from '../types';
import { 
  getOrGeneratePairingCode, 
  refreshPairingCode, 
  subscribePairingState, 
  simulateWeChatPairingSuccess,
  PairingState 
} from '../utils/wechatPairingService';
import { WechatQrDisplay } from './WechatQrDisplay';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
  initialPrompt?: string;
  initialTab?: 'wechat' | 'email';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialPrompt,
  initialTab = 'wechat'
}) => {
  const [activeTab, setActiveTab] = useState<'wechat' | 'email'>(initialTab);
  const [pairingState, setPairingState] = useState<PairingState>(() => getOrGeneratePairingCode());
  const [copied, setCopied] = useState<boolean>(false);
  const [isPairingListening, setIsPairingListening] = useState<boolean>(true);
  const [pairingCountdown, setPairingCountdown] = useState<number>(600); // 10 minutes

  // Email states
  const [emailMode, setEmailMode] = useState<'code' | 'password'>('code');
  const [email, setEmail] = useState<string>('wuliisland@gmail.com');
  const [password, setPassword] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [codeCountdown, setCodeCountdown] = useState<number>(0);
  const [sentCodeAlert, setSentCodeAlert] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync initial tab when opening
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Subscribe to pairing code updates
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribePairingState((st) => {
      setPairingState(st);
      const remainingSeconds = Math.max(0, Math.floor((st.expiresAt - Date.now()) / 1000));
      setPairingCountdown(remainingSeconds);
    });
    return unsubscribe;
  }, [isOpen]);

  // Countdown timer for pairing code
  useEffect(() => {
    if (!isOpen || activeTab !== 'wechat') return;
    const timer = setInterval(() => {
      setPairingCountdown((prev) => {
        if (prev <= 1) {
          const fresh = refreshPairingCode();
          setPairingState(fresh);
          return 600;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, activeTab]);

  // Code countdown for email
  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setInterval(() => {
      setCodeCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [codeCountdown]);

  if (!isOpen) return null;

  // Copy pairing code
  const handleCopyPairingCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pairingState.code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // WeChat official account pairing simulation / direct login
  const handleSimulatePairingSuccess = (customName?: string) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const session = simulateWeChatPairingSuccess(customName);
      onLoginSuccess(session);
      setIsSubmitting(false);
    }, 500);
  };

  // Fast Email Login for seamless access
  const handleFastEmailLogin = (targetEmail: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setTimeout(() => {
      const emailPrefix = targetEmail.split('@')[0] || '投资学友';
      const session: UserSession = {
        isLoggedIn: true,
        loginMethod: 'email',
        userId: `usr_${Date.now().toString().slice(-6)}`,
        name: emailPrefix,
        avatar: '',
        account: targetEmail,
        email: targetEmail,
        loginAt: new Date().toLocaleString(),
        role: 'VIP会员 (邮箱认证)'
      };
      onLoginSuccess(session);
      setIsSubmitting(false);
    }, 450);
  };

  // Send Email Code
  const handleSendCode = () => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('请输入合法的邮箱地址，例如 wuliisland@gmail.com');
      return;
    }
    setErrorMessage(null);
    const mockCode = String(Math.floor(100000 + Math.random() * 900000));
    setSentCodeAlert(`【邮箱登录】已生成6位动态验证码：${mockCode}（已为您自动填入验证码框，直接点击下方「立即登录」即可）`);
    setVerifyCode(mockCode);
    setCodeCountdown(60);
  };

  // Email Submit
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('请输入合法的邮箱地址');
      return;
    }

    if (emailMode === 'code') {
      if (!verifyCode || verifyCode.trim().length !== 6) {
        setErrorMessage('请输入6位数字邮箱验证码');
        return;
      }
    } else {
      if (!password || password.length < 6) {
        setErrorMessage('密码不能少于6位');
        return;
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const emailPrefix = email.split('@')[0];
      const session: UserSession = {
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
      onLoginSuccess(session);
      setIsSubmitting(false);
    }, 600);
  };

  // Quick fill demo email
  const handleFillDemoEmail = () => {
    setEmail('dividend_pro@example.com');
    setPassword('dividend888');
    setVerifyCode('888666');
    setErrorMessage(null);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all ${
              activeTab === 'wechat'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-950/50'
                : 'bg-gradient-to-br from-rose-500 to-amber-600 shadow-rose-950/50'
            }`}>
              {activeTab === 'wechat' ? (
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M8.5 2C4.36 2 1 4.92 1 8.5c0 1.95.96 3.7 2.5 4.94L2.8 16.5l3.24-1.62c.76.24 1.58.37 2.46.37.24 0 .47-.01.7-.03-.2-.55-.3-1.14-.3-1.75 0-3.69 3.36-6.68 7.5-6.68.21 0 .42.01.62.03C15.86 3.99 12.44 2 8.5 2zm-2.25 4.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm4.5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM15.5 8.5c-3.59 0-6.5 2.46-6.5 5.5 0 3.03 2.91 5.5 6.5 5.5.76 0 1.48-.11 2.14-.32l2.81 1.4-.7-2.65c1.33-1.07 2.25-2.46 2.25-3.93 0-3.04-2.91-5.5-6.5-5.5zm-2 3.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
              ) : (
                <Mail className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {activeTab === 'wechat' ? '微信公众号配对登录' : '电子邮箱登录 / 认证'}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium font-mono border ${
                  activeTab === 'wechat'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {activeTab === 'wechat' ? '个人订阅号已支持' : '免关注 · 即刻解锁'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {activeTab === 'wechat' 
                  ? `关注公众号【${pairingState.officialAccountName}】回复配对码，即可免费解锁全部数据与导出`
                  : '输入邮箱获取动态验证码或密码即可登录，一键解锁全量 5,652 支股票与高清导出'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Banner if user was restricted by a feature */}
        {initialPrompt && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-300">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{initialPrompt}</span>
          </div>
        )}

        {/* Tab Switcher: WeChat vs Email */}
        <div className="p-4 pb-0 bg-slate-900/50">
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('wechat');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'wechat'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M8.5 2C4.36 2 1 4.92 1 8.5c0 1.95.96 3.7 2.5 4.94L2.8 16.5l3.24-1.62c.76.24 1.58.37 2.46.37.24 0 .47-.01.7-.03-.2-.55-.3-1.14-.3-1.75 0-3.69 3.36-6.68 7.5-6.68.21 0 .42.01.62.03C15.86 3.99 12.44 2 8.5 2zm-2.25 4.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm4.5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM15.5 8.5c-3.59 0-6.5 2.46-6.5 5.5 0 3.03 2.91 5.5 6.5 5.5.76 0 1.48-.11 2.14-.32l2.81 1.4-.7-2.65c1.33-1.07 2.25-2.46 2.25-3.93 0-3.04-2.91-5.5-6.5-5.5zm-2 3.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
              </svg>
              <span>公众号配对登录</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('email');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>电子邮箱登录</span>
            </button>
          </div>
        </div>

        {/* Tab 1: WeChat Official Account "website-to-wechat" Pairing Content */}
        {activeTab === 'wechat' && (
          <div className="p-5 sm:p-6 space-y-4">
            
            {/* Top Official Account Info Card */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {pairingState.officialAccountName.slice(0, 1) || '我'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span>公众号：{pairingState.officialAccountName}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">微信号: {pairingState.officialAccountId}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    A股高股息实盘研究 · 专注现金流与低估值价值投资
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Webhook服务在线</span>
              </div>
            </div>

            {/* Main Interactive Pairing Layout: Left QR Code, Right Step Instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              
              {/* Left QR Code Container */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
                <WechatQrDisplay
                  qrImageUrl={pairingState.qrImageUrl}
                  officialAccountName={pairingState.officialAccountName}
                  officialAccountId={pairingState.officialAccountId}
                  size="md"
                  showUploadButton={true}
                  onConfigChanged={() => {
                    const fresh = getOrGeneratePairingCode();
                    setPairingState(fresh);
                  }}
                />

                <div className="mt-2 text-[11px] text-slate-300 font-medium">
                  微信扫码关注公众号
                </div>
                <div className="text-[10px] text-slate-500">
                  支持个人订阅号 · 安全免密
                </div>
              </div>

              {/* Right Step & 6-Digit Pairing Code Box */}
              <div className="sm:col-span-7 space-y-3">
                
                {/* 6-Digit Pairing Code Display */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/40 shadow-inner space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">当前网页专属配对码</span>
                    <span className="text-[11px] font-mono text-amber-400">
                      有效剩余: {formatCountdown(pairingCountdown)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 flex items-center justify-center">
                      <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 tracking-[0.25em] select-all">
                        {pairingState.code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyPairingCode}
                      className="px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
                      title="一键复制配对码"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? '已复制' : '复制'}</span>
                    </button>
                  </div>
                </div>

                {/* 3-Step Clear Instructions */}
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <span>打开手机微信，扫一扫关注公众号【<strong>{pairingState.officialAccountName}</strong>】</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <span>在公众号聊天界面直接发送上方 6 位配对码：<strong className="text-emerald-400 font-mono">{pairingState.code}</strong></span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <span>网页端实时接收配对消息，1~2 秒内自动登录并解锁全部功能</span>
                  </div>
                </div>

                {/* Status Indicator & Fast Simulation Button */}
                <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>正在实时监听公众号后台配对消息...</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const fresh = refreshPairingCode();
                        setPairingState(fresh);
                      }}
                      className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition"
                      title="刷新生成新的配对码"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>刷新</span>
                    </button>
                  </div>

                  {/* One-click simulate verification (Essential for preview environment & instant testing) */}
                  <button
                    type="button"
                    onClick={() => handleSimulatePairingSuccess('红利价值学友·张工')}
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-md shadow-emerald-950/50 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>{isSubmitting ? '配对验证成功，正在进入...' : '模拟公众号发送配对码一键极速体验'}</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Bottom Value Props Banner */}
            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>关注即解锁：5652只全量股票透析 · 高清估值长图导出 · 目标价测算 · 组合现金流</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className="text-slate-400 hover:text-rose-400 underline underline-offset-2 shrink-0 transition"
              >
                使用邮箱登录
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Email Login */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="p-5 sm:p-6 space-y-4">
            
            {/* Quick 1-Click Fast Login Card for the user */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/50 via-slate-900 to-amber-950/40 border border-rose-500/30 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 font-bold text-sm shrink-0">
                  @
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 truncate">
                    <span>wuliisland@gmail.com</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">当前检测账号</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    支持免密一键极速登入，立刻解锁全部核心标的与导出权限
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleFastEmailLogin('wuliisland@gmail.com')}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-md shadow-rose-950/40 transition active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-rose-100" />
                <span>一键登录</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span className="font-medium text-slate-300">或输入自定义电子邮箱：</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEmailMode('code')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    emailMode === 'code' ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  动态验证码登录
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode('password')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    emailMode === 'password' ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  密码登录
                </button>
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                电子邮箱账号 (支持 Gmail, QQ, 163, Outlook 等任何邮箱)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                />
              </div>
            </div>

            {/* Verification Code Mode */}
            {emailMode === 'code' ? (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  6位动态验证码
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.trim())}
                      placeholder="输入6位数字验证码"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={codeCountdown > 0}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                      codeCountdown > 0 
                        ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
                        : 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30'
                    }`}
                  >
                    {codeCountdown > 0 ? `${codeCountdown}s 后重发` : '获取验证码'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  账号密码
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入至少6位密码"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Error or Notice Alert */}
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {sentCodeAlert && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{sentCodeAlert}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-rose-200" />
              <span>{isSubmitting ? '正在验证并登录...' : '立即验证邮箱并登录'}</span>
            </button>

            {/* Quick Demo Fill & Switch */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <button
                type="button"
                onClick={handleFillDemoEmail}
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition cursor-pointer"
              >
                填入演示账号测试 (dividend_pro@example.com)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wechat')}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
              >
                <span>返回公众号关注扫码</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
