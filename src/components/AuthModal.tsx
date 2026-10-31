import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Lock, CheckCircle2, ShieldCheck, Sparkles, 
  ArrowRight, KeyRound, RefreshCw, Smartphone, AlertCircle,
  Eye, EyeOff, User, Check, Send
} from 'lucide-react';
import { UserSession } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
  initialPrompt?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialPrompt
}) => {
  const [activeTab, setActiveTab] = useState<'wechat' | 'email'>('wechat');

  // WeChat states
  const [wechatScanStatus, setWechatScanStatus] = useState<'waiting' | 'scanned' | 'confirmed'>('waiting');
  const [qrCodeTimestamp, setQrCodeTimestamp] = useState<number>(Date.now());
  const [qrCountdown, setQrCountdown] = useState<number>(180);

  // Email states
  const [emailMode, setEmailMode] = useState<'code' | 'password'>('code');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [codeCountdown, setCodeCountdown] = useState<number>(0);
  const [sentCodeAlert, setSentCodeAlert] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // QR Code countdown
  useEffect(() => {
    if (!isOpen || activeTab !== 'wechat') return;
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, activeTab, qrCodeTimestamp]);

  // Code countdown
  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setInterval(() => {
      setCodeCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [codeCountdown]);

  if (!isOpen) return null;

  // WeChat QR refresh
  const handleRefreshQR = () => {
    setQrCodeTimestamp(Date.now());
    setQrCountdown(180);
    setWechatScanStatus('waiting');
  };

  // WeChat instant login (e.g. simulated scan or one-click authorize)
  const handleWechatLogin = (presetNickname?: string, presetAvatar?: string) => {
    setIsSubmitting(true);
    setWechatScanStatus('scanned');

    setTimeout(() => {
      setWechatScanStatus('confirmed');
      setTimeout(() => {
        const nickname = presetNickname || '红利投资者·张工';
        const session: UserSession = {
          isLoggedIn: true,
          loginMethod: 'wechat',
          userId: `wx_${Date.now().toString().slice(-6)}`,
          name: nickname,
          avatar: presetAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
          account: `wx_${Math.floor(100000 + Math.random() * 900000)}`,
          wechatNickname: nickname,
          loginAt: new Date().toLocaleString(),
          role: 'VIP会员'
        };
        onLoginSuccess(session);
        setIsSubmitting(false);
      }, 600);
    }, 800);
  };

  // Send Email Code
  const handleSendCode = () => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('请输入合法的邮箱地址，例如 user@example.com');
      return;
    }
    setErrorMessage(null);
    const mockCode = String(Math.floor(100000 + Math.random() * 900000));
    setSentCodeAlert(`【红利筛选器】已向您的邮箱 ${email} 发送6位动态验证码：${mockCode}`);
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
        role: 'VIP会员'
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                账号登录 / 注册
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  解锁全部标的
                </span>
              </h3>
              <p className="text-xs text-slate-400">登录后无限制查看全部核心高股息资产与测算数据</p>
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

        {/* Prompt Banner if user was restricted */}
        {initialPrompt && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
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
              {/* WeChat SVG Icon */}
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M8.5 2C4.36 2 1 4.92 1 8.5c0 1.95.96 3.7 2.5 4.94L2.8 16.5l3.24-1.62c.76.24 1.58.37 2.46.37.24 0 .47-.01.7-.03-.2-.55-.3-1.14-.3-1.75 0-3.69 3.36-6.68 7.5-6.68.21 0 .42.01.62.03C15.86 3.99 12.44 2 8.5 2zm-2.25 4.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm4.5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM15.5 8.5c-3.59 0-6.5 2.46-6.5 5.5 0 3.03 2.91 5.5 6.5 5.5.76 0 1.48-.11 2.14-.32l2.81 1.4-.7-2.65c1.33-1.07 2.25-2.46 2.25-3.93 0-3.04-2.91-5.5-6.5-5.5zm-2 3.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
              </svg>
              <span>微信扫码登录</span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded font-normal">推荐</span>
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
              <span>邮箱账号登录</span>
            </button>
          </div>
        </div>

        {/* Tab 1: WeChat Login Content */}
        {activeTab === 'wechat' && (
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              {/* QR Code Container */}
              <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-200 relative overflow-hidden">
                <div className="w-48 h-48 bg-slate-50 rounded-xl flex flex-col items-center justify-center relative p-2">
                  {/* Stylized high-dividend WeChat QR Code SVG */}
                  <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                    {/* Corner Markers */}
                    <rect x="5" y="5" width="26" height="26" rx="4" fill="#07C160" />
                    <rect x="9" y="9" width="18" height="18" fill="white" />
                    <rect x="13" y="13" width="10" height="10" rx="2" fill="#07C160" />

                    <rect x="69" y="5" width="26" height="26" rx="4" fill="#07C160" />
                    <rect x="73" y="9" width="18" height="18" fill="white" />
                    <rect x="77" y="13" width="10" height="10" rx="2" fill="#07C160" />

                    <rect x="5" y="69" width="26" height="26" rx="4" fill="#07C160" />
                    <rect x="9" y="73" width="18" height="18" fill="white" />
                    <rect x="13" y="77" width="10" height="10" rx="2" fill="#07C160" />

                    {/* Data Matrix Dots */}
                    <rect x="36" y="8" width="6" height="6" rx="1" fill="#1e293b" />
                    <rect x="46" y="8" width="6" height="6" rx="1" fill="#1e293b" />
                    <rect x="56" y="8" width="6" height="6" rx="1" fill="#1e293b" />

                    <rect x="36" y="20" width="8" height="6" rx="1" fill="#1e293b" />
                    <rect x="48" y="18" width="6" height="10" rx="1" fill="#1e293b" />

                    <rect x="8" y="36" width="6" height="6" rx="1" fill="#1e293b" />
                    <rect x="20" y="36" width="8" height="6" rx="1" fill="#1e293b" />
                    <rect x="34" y="34" width="10" height="10" rx="1" fill="#1e293b" />
                    <rect x="48" y="34" width="8" height="8" rx="1" fill="#1e293b" />
                    <rect x="60" y="36" width="6" height="8" rx="1" fill="#1e293b" />
                    <rect x="72" y="34" width="8" height="6" rx="1" fill="#1e293b" />
                    <rect x="84" y="36" width="8" height="8" rx="1" fill="#1e293b" />

                    <rect x="8" y="48" width="6" height="8" rx="1" fill="#1e293b" />
                    <rect x="20" y="46" width="6" height="12" rx="1" fill="#1e293b" />
                    <rect x="34" y="48" width="8" height="8" rx="1" fill="#07C160" />
                    <rect x="46" y="48" width="10" height="6" rx="1" fill="#1e293b" />
                    <rect x="60" y="48" width="8" height="10" rx="1" fill="#1e293b" />
                    <rect x="74" y="46" width="6" height="8" rx="1" fill="#1e293b" />
                    <rect x="86" y="48" width="6" height="10" rx="1" fill="#1e293b" />

                    <rect x="36" y="64" width="6" height="8" rx="1" fill="#1e293b" />
                    <rect x="46" y="62" width="10" height="6" rx="1" fill="#1e293b" />
                    <rect x="62" y="62" width="8" height="8" rx="1" fill="#1e293b" />
                    <rect x="74" y="64" width="8" height="6" rx="1" fill="#1e293b" />
                    <rect x="86" y="62" width="6" height="8" rx="1" fill="#1e293b" />

                    <rect x="36" y="76" width="8" height="6" rx="1" fill="#1e293b" />
                    <rect x="48" y="74" width="6" height="10" rx="1" fill="#1e293b" />
                    <rect x="58" y="74" width="8" height="6" rx="1" fill="#1e293b" />
                    <rect x="70" y="74" width="10" height="8" rx="1" fill="#1e293b" />
                    <rect x="84" y="74" width="8" height="10" rx="1" fill="#1e293b" />

                    <rect x="36" y="86" width="6" height="8" rx="1" fill="#1e293b" />
                    <rect x="48" y="86" width="8" height="6" rx="1" fill="#1e293b" />
                    <rect x="62" y="86" width="6" height="8" rx="1" fill="#1e293b" />
                    <rect x="74" y="86" width="8" height="6" rx="1" fill="#1e293b" />
                    <rect x="86" y="86" width="6" height="8" rx="1" fill="#1e293b" />

                    {/* Center WeChat Logo Icon */}
                    <circle cx="50" cy="50" r="11" fill="white" />
                    <circle cx="50" cy="50" r="9" fill="#07C160" />
                    <path d="M47 47c-1.6 0-3 1.1-3 2.5 0 .8.4 1.5 1.1 2l-.3 1 1.3-.7c.3.1.6.2.9.2 1.6 0 3-1.1 3-2.5s-1.4-2.5-3-2.5zm4.8 2.2c-1.3 0-2.3.9-2.3 2.1 0 .7.4 1.3 1 1.7l-.3.8 1.1-.6c.2.1.5.1.8.1 1.3 0 2.3-.9 2.3-2.1s-1-2-2.6-2z" fill="white" />
                  </svg>

                  {/* Scan Status Overlay */}
                  {wechatScanStatus === 'scanned' && (
                    <div className="absolute inset-0 bg-slate-900/90 rounded-xl flex flex-col items-center justify-center p-3 text-white animate-in fade-in">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 animate-bounce">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-emerald-300">已成功扫码</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">请在手机微信上点击「确认登录」</p>
                    </div>
                  )}

                  {wechatScanStatus === 'confirmed' && (
                    <div className="absolute inset-0 bg-slate-900/90 rounded-xl flex flex-col items-center justify-center p-3 text-white animate-in fade-in">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-2">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>
                      <p className="text-xs font-bold text-emerald-300">登录成功</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">正在同步您的红利自选池...</p>
                    </div>
                  )}

                  {qrCountdown === 0 && (
                    <div className="absolute inset-0 bg-slate-900/90 rounded-xl flex flex-col items-center justify-center p-3 text-white">
                      <p className="text-xs text-slate-300 mb-2">二维码已过期</p>
                      <button
                        onClick={handleRefreshQR}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md hover:bg-emerald-500"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>点击刷新</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Instruction */}
            <div className="space-y-1">
              <p className="text-xs text-slate-200 font-semibold flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                打开手机微信，使用「扫一扫」快速登录
              </p>
              <p className="text-[11px] text-slate-400">
                二维码有效时间: <span className="font-mono text-emerald-400 font-bold">{Math.floor(qrCountdown / 60)}:{(qrCountdown % 60).toString().padStart(2, '0')}</span>
              </p>
            </div>

            {/* Action Buttons for WeChat */}
            <div className="w-full space-y-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleWechatLogin('红利投资者·张工')}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {/* WeChat SVG */}
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8.5 2C4.36 2 1 4.92 1 8.5c0 1.95.96 3.7 2.5 4.94L2.8 16.5l3.24-1.62c.76.24 1.58.37 2.46.37.24 0 .47-.01.7-.03-.2-.55-.3-1.14-.3-1.75 0-3.69 3.36-6.68 7.5-6.68.21 0 .42.01.62.03C15.86 3.99 12.44 2 8.5 2zm-2.25 4.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm4.5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM15.5 8.5c-3.59 0-6.5 2.46-6.5 5.5 0 3.03 2.91 5.5 6.5 5.5.76 0 1.48-.11 2.14-.32l2.81 1.4-.7-2.65c1.33-1.07 2.25-2.46 2.25-3.93 0-3.04-2.91-5.5-6.5-5.5zm-2 3.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
                <span>微信快捷一键授权登录</span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                <span>无微信客户端？可切换顶部邮箱登录</span>
                <button
                  type="button"
                  onClick={handleRefreshQR}
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  刷新二维码
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Email Login Content */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="p-6 space-y-4">
            {/* Mode Switch within Email: Code vs Password */}
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <span className="font-semibold text-slate-300">
                {emailMode === 'code' ? '验证码免密登录 / 注册' : '邮箱密码登录'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmailMode(prev => prev === 'code' ? 'password' : 'code');
                  setErrorMessage(null);
                }}
                className="text-rose-400 hover:text-rose-300 underline underline-offset-2 font-medium cursor-pointer"
              >
                切换为{emailMode === 'code' ? '密码登录' : '验证码快捷登录'}
              </button>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Mock sent code notification */}
            {sentCodeAlert && (
              <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-semibold">{sentCodeAlert}</p>
                  <p className="text-[10px] text-emerald-400/80 mt-0.5">已自动为您填入验证码，可直接点击登录</p>
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">邮箱地址</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="例如: yourname@example.com"
                  className="w-full bg-slate-950 text-slate-100 rounded-xl pl-9 pr-3 py-2 text-xs border border-slate-700 focus:outline-none focus:border-rose-500 font-sans"
                  required
                />
              </div>
            </div>

            {/* Code Mode */}
            {emailMode === 'code' && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">6位邮箱验证码</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="输入6位数字验证码"
                      className="w-full bg-slate-950 text-slate-100 font-mono tracking-widest rounded-xl pl-9 pr-3 py-2 text-xs border border-slate-700 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={codeCountdown > 0}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 border ${
                      codeCountdown > 0
                        ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                        : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 cursor-pointer'
                    }`}
                  >
                    {codeCountdown > 0 ? `${codeCountdown}秒后重发` : '获取验证码'}
                  </button>
                </div>
              </div>
            )}

            {/* Password Mode */}
            {emailMode === 'password' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-300">登录密码</label>
                  <span className="text-[11px] text-slate-500">首用该邮箱将自动创建账号</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码 (不少于6位)"
                    className="w-full bg-slate-950 text-slate-100 rounded-xl pl-9 pr-10 py-2 text-xs border border-slate-700 focus:outline-none focus:border-rose-500 font-sans"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-rose-500 rounded cursor-pointer"
                />
                <span>记住登录状态 (30天免密)</span>
              </label>

              <button
                type="button"
                onClick={handleFillDemoEmail}
                className="text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2 cursor-pointer"
                title="一键填入测试邮箱与验证码"
              >
                填入测试演示账号
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? '正在验证登录中...' : '立即登录 / 注册'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Benefits Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <div className="font-semibold text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>登录后尊享权益：</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-400">
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>无限制查阅全市场 5,652+ 支股票</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>5年PE历史分位估值安全垫</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>理想股息率目标买入价测算</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>组合现金流测算与高保真导出</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
