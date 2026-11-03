import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Send, CheckCircle2, AlertCircle, Settings, 
  HelpCircle, Sparkles, RefreshCw, Lock, Server, ShieldCheck, ExternalLink
} from 'lucide-react';

interface SmtpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavedSuccess?: () => void;
}

interface PresetOption {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  helpTip: string;
}

const PRESETS: PresetOption[] = [
  {
    id: 'qq',
    name: 'QQ 邮箱 (推荐)',
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    helpTip: '在 QQ 邮箱网页端【设置】->【账号】->【POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务】开启并生成 16 位授权码'
  },
  {
    id: '163',
    name: '163 网易邮箱',
    host: 'smtp.163.com',
    port: 465,
    secure: true,
    helpTip: '在 163 邮箱网页端【设置】->【POP3/SMTP/IMAP】开启服务并生成客户端授权密码'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    helpTip: '需在 Google 账号【安全性】->【两步验证】-> 生成【应用专用密码 (App Password)】'
  },
  {
    id: 'custom',
    name: '自定义 SMTP 服务器',
    host: '',
    port: 465,
    secure: true,
    helpTip: '填写您的企业邮箱或专有发信服务器的主机与端口'
  }
];

export const SmtpConfigModal: React.FC<SmtpConfigModalProps> = ({
  isOpen,
  onClose,
  onSavedSuccess
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('qq');
  const [host, setHost] = useState<string>('smtp.qq.com');
  const [port, setPort] = useState<number>(465);
  const [secure, setSecure] = useState<boolean>(true);
  const [user, setUser] = useState<string>('');
  const [pass, setPass] = useState<string>('');
  const [fromName, setFromName] = useState<string>('我爱这young');
  const [fromEmail, setFromEmail] = useState<string>('');

  const [testEmail, setTestEmail] = useState<string>('wuliisland@gmail.com');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  // Load existing config on open
  useEffect(() => {
    if (!isOpen) return;
    setTestResult(null);

    fetch('/api/auth/email-config')
      .then(res => res.json())
      .then(data => {
        if (data.isConfigured && data.config) {
          setIsConfigured(true);
          setHost(data.config.host || 'smtp.qq.com');
          setPort(data.config.port || 465);
          setSecure(data.config.secure !== false);
          setUser(data.config.user || '');
          setFromName(data.config.fromName || '我爱这young');
          setFromEmail(data.config.fromEmail || '');
          
          // Match preset
          const matched = PRESETS.find(p => p.host === data.config.host);
          if (matched) setSelectedPreset(matched.id);
          else setSelectedPreset('custom');
        } else {
          setIsConfigured(false);
        }
      })
      .catch(e => console.error('Failed to load email config:', e));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = PRESETS.find(p => p.id === presetId);
    if (found && found.id !== 'custom') {
      setHost(found.host);
      setPort(found.port);
      setSecure(found.secure);
    }
    setTestResult(null);
  };

  const handleTestSend = async () => {
    if (!user || !pass) {
      setTestResult({ success: false, message: '请先填写发信账号和授权码/密码' });
      return;
    }
    if (!testEmail || !testEmail.includes('@')) {
      setTestResult({ success: false, message: '请输入有效的接收测试邮件地址' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/auth/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: testEmail,
          config: {
            host,
            port: Number(port) || 465,
            secure,
            user: user.trim(),
            pass: pass.trim(),
            fromName: fromName.trim() || '我爱这young',
            fromEmail: fromEmail.trim() || user.trim()
          }
        })
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? '测试邮件发送成功！' : '测试邮件发送失败')
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `测试异常: ${err.message || '网络连接超时'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host || !user || !pass) {
      setTestResult({ success: false, message: '请完整填写 SMTP 主机、发信账号与授权码' });
      return;
    }

    setIsSaving(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/auth/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port: Number(port) || 465,
          secure,
          user: user.trim(),
          pass: pass.trim(),
          fromName: fromName.trim() || '我爱这young',
          fromEmail: fromEmail.trim() || user.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsConfigured(true);
        setTestResult({ success: true, message: '发信配置已成功保存！真实用户邮箱现在可以正常接收验证码。' });
        if (onSavedSuccess) onSavedSuccess();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setTestResult({ success: false, message: data.message || '保存失败' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `保存失败: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const currentPresetHelp = PRESETS.find(p => p.id === selectedPreset)?.helpTip;

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-rose-950/50">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                真实邮箱发信服务配置 (SMTP)
                {isConfigured && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                    已配置发信服务
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                配置您自己的 QQ / 163 / 企业邮箱，系统将自动向用户真实邮箱投递 6 位验证码
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              快速选择发信邮箱提供商：
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                    selectedPreset === preset.id
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {currentPresetHelp && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-amber-300/90 flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span><strong>获取授权码指引：</strong>{currentPresetHelp}</span>
              </div>
            )}
          </div>

          {/* Account & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                发信邮箱账号 (User)
              </label>
              <input
                type="email"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="例如：your_name@qq.com"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                邮箱授权码 / 密码 (Password)
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="QQ/163生成的16位授权码"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>

          {/* Server Host & Port */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                SMTP 服务器地址 (Host)
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="例如：smtp.qq.com"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                端口 (Port)
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="465"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>

          {/* Sender Brand Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                发件人显示名称 (Sender Name)
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="例如：我爱这young"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                安全连接 (SSL)
              </label>
              <div className="flex items-center h-9">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={secure}
                    onChange={(e) => setSecure(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-0 cursor-pointer"
                  />
                  <span>启用 SSL 安全加密传输 (推荐 465 端口开启)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Test Email Verification Box */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-rose-400" />
                <span>实时发送一封测试邮件验证：</span>
              </span>
              <span className="text-[10px] text-slate-400">将向您的真实邮箱投递测试信</span>
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="接收测试邮件的邮箱（如您的真实邮箱）"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleTestSend}
                disabled={isTesting}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isTesting ? '正在发送...' : '发送测试邮件'}</span>
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Footer action buttons */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              配置仅保存在后端服务器，安全保密
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                取消
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isSaving ? '正在保存...' : '保存发信服务配置'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
