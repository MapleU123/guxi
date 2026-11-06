import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, Key, Copy, Check, RefreshCw, 
  ExternalLink, HelpCircle, Save, Sparkles, AlertCircle, Server, MessageSquare
} from 'lucide-react';

interface WechatMpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavedSuccess?: () => void;
}

export interface WechatMpFormConfig {
  token: string;
  aesKey: string;
  appId: string;
  appSecret: string;
  originalId: string;
  webhookUrl?: string;
}

export const WechatMpConfigModal: React.FC<WechatMpConfigModalProps> = ({
  isOpen,
  onClose,
  onSavedSuccess
}) => {
  const [formData, setFormData] = useState<WechatMpFormConfig>({
    token: 'a_share_dividend_wechat_token',
    aesKey: '',
    appId: '',
    appSecret: '',
    originalId: 'gh_7d39de02f610',
    webhookUrl: ''
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Load current config from server
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setErrorMsg(null);
    setSaveSuccess(false);
    setTestResult(null);

    fetch('/api/wechat/mp-config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const origin = window.location.origin;
          setFormData({
            token: data.data.token || 'a_share_dividend_wechat_token',
            aesKey: data.data.aesKey || '',
            appId: data.data.appId || '',
            appSecret: data.data.appSecret || '',
            originalId: data.data.originalId || 'gh_7d39de02f610',
            webhookUrl: data.data.webhookUrl || `${origin}/api/wechat/webhook`
          });
        }
      })
      .catch(err => {
        console.warn('Failed to load WeChat MP config', err);
        const origin = window.location.origin;
        setFormData(prev => ({
          ...prev,
          webhookUrl: `${origin}/api/wechat/webhook`
        }));
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Generate random 32-char hex Token
  const generateRandomToken = () => {
    const chars = '0123456789abcdef';
    let res = '';
    for (let i = 0; i < 32; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormData(prev => ({ ...prev, token: res }));
  };

  // Generate random 43-char base64 AES key
  const generateRandomAesKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let res = '';
    for (let i = 0; i < 43; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormData(prev => ({ ...prev, aesKey: res }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/wechat/mp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        if (onSavedSuccess) onSavedSuccess();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMsg(data.message || '保存失败，请重试');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '网络异常，保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestResult('测试中...');
    try {
      const res = await fetch('/api/wechat/test-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: formData.token })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ 算法验证成功！当前 Token [${formData.token}] 的 SHA-1 签名运算正常。`);
      } else {
        setTestResult('❌ 校验失败');
      }
    } catch (e: any) {
      setTestResult('❌ 校验连接异常: ' + e.message);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>微信公众平台开发者对接配置</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  Token & AESKey
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                配置与微信公众平台后台「服务器配置」对应的参数，即改即生效
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Quick Notice banner */}
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>微信后台「设置与开发 → 基本配置 → 服务器配置」填写指引</span>
            </div>
            <p className="text-[11px] text-indigo-200/90 leading-relaxed">
              将下方的 <strong>URL</strong> 和 <strong>Token</strong> 复制到微信公众平台后台对应输入框即可。若选择「安全模式」或「兼容模式」，还需填入 <strong>EncodingAESKey</strong>。
            </p>
          </div>

          {/* 1. Webhook URL (Read-only + Copy) */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold flex items-center justify-between">
              <span>URL (服务器地址)</span>
              <span className="text-[10px] text-emerald-400 font-normal">微信官方推送接收入口</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input 
                  type="text"
                  readOnly
                  value={formData.webhookUrl || `${window.location.origin}/api/wechat/webhook`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-[11px] text-emerald-300 select-all focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleCopy(formData.webhookUrl || `${window.location.origin}/api/wechat/webhook`, 'url')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 font-medium transition cursor-pointer shrink-0"
              >
                {copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'url' ? '已复制' : '复制 URL'}</span>
              </button>
            </div>
          </div>

          {/* 2. WECHAT_MP_TOKEN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold flex items-center gap-1">
                <span>WECHAT_MP_TOKEN (Token 令牌)</span>
                <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={generateRandomToken}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>随机生成 32 位 Token</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="text"
                required
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                placeholder="例如: a_share_dividend_wechat_token"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopy(formData.token, 'token')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 font-medium transition cursor-pointer shrink-0"
              >
                {copiedField === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'token' ? '已复制' : '复制'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              必须与微信公众平台后台「Token」完全一致。默认推荐使用预设或随机生成 32 位字符串。
            </p>
          </div>

          {/* 3. WECHAT_MP_AES_KEY */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold flex items-center gap-1">
                <span>WECHAT_MP_AES_KEY (EncodingAESKey 消息加解密密钥)</span>
              </label>
              <button
                type="button"
                onClick={generateRandomAesKey}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>随机生成 43 位密钥</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="text"
                value={formData.aesKey}
                onChange={(e) => setFormData({ ...formData, aesKey: e.target.value })}
                placeholder="必须为 43 位字符（安全模式或兼容模式必填）"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopy(formData.aesKey, 'aesKey')}
                disabled={!formData.aesKey}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 font-medium transition cursor-pointer shrink-0 disabled:opacity-40"
              >
                {copiedField === 'aesKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'aesKey' ? '已复制' : '复制'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              如果在微信公众平台点击了「随机生成」，请将那串 43 字符原样复制粘贴到这里；明文模式可留空。
            </p>
          </div>

          {/* 4. AppID & AppSecret (Optional collapsible / grid) */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span>公众号高级凭证 (用于自动换取图片素材与粉丝真实昵称)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">可选配置</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  开发者 AppID
                </label>
                <input 
                  type="text"
                  value={formData.appId}
                  onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                  placeholder="例如: wx1234567890abcdef"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  开发者 AppSecret
                </label>
                <input 
                  type="password"
                  value={formData.appSecret}
                  onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                  placeholder="微信公众平台生成的 32 位秘钥"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                公众号原始 ID (Original ID)
              </label>
              <input 
                type="text"
                value={formData.originalId}
                onChange={(e) => setFormData({ ...formData, originalId: e.target.value })}
                placeholder="例如: gh_7d39de02f610"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Test connection feedback */}
          {testResult && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-mono">
              {testResult}
            </div>
          )}

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5">
              <Check className="w-4 h-4 shrink-0" />
              <span>微信公众号开发者配置已成功保存！当前服务已热更新。</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>测试签名连通性</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? '保存中...' : '保存配置'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
