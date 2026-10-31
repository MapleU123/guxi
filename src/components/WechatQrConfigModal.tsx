import React, { useState, useRef } from 'react';
import { 
  X, Upload, Image as ImageIcon, CheckCircle2, RotateCcw, 
  HelpCircle, AlertTriangle, QrCode, Sparkles 
} from 'lucide-react';
import { 
  getOfficialAccountConfig, 
  saveOfficialAccountConfig, 
  resetOfficialAccountConfig,
  OfficialAccountConfig 
} from '../utils/wechatPairingService';

interface WechatQrConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (config: OfficialAccountConfig) => void;
}

export const WechatQrConfigModal: React.FC<WechatQrConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const currentConfig = getOfficialAccountConfig();
  const [name, setName] = useState<string>(currentConfig.name);
  const [wechatId, setWechatId] = useState<string>(currentConfig.wechatId);
  const [qrImageUrl, setQrImageUrl] = useState<string>(currentConfig.qrImageUrl || '');
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件（JPG, PNG, WebP等）');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('图片文件大小请在5MB以内');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setQrImageUrl(result);
        setPreviewError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const saved = saveOfficialAccountConfig({
      name: name.trim() || '我爱这young',
      wechatId: wechatId.trim() || 'gh_7d39de02f610',
      qrImageUrl: qrImageUrl.trim() || '/assets/qrcode_gh_7d39de02f610.jpg'
    });
    setSavedSuccess(true);
    if (onSaved) onSaved(saved);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    if (confirm('确认恢复为官方二维码及公众号信息吗？')) {
      const def = resetOfficialAccountConfig();
      setName(def.name);
      setWechatId(def.wechatId);
      setQrImageUrl(def.qrImageUrl);
      setPreviewError(false);
      if (onSaved) onSaved(def);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                更换微信公众号真实二维码
              </h3>
              <p className="text-[11px] text-slate-400">上传真实二维码后，微信扫一扫即可精准打开并关注您的公众号</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Friendly Guidance Box */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>请上传真实的微信公众号二维码图片</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              请从微信公众平台（<strong>mp.weixin.qq.com</strong>）后台下载您公众号的官方黑白/带logo二维码。手机微信扫一扫可直达关注界面。
            </p>
          </div>

          {/* QR Code Upload & Preview Area */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800">
            {/* Preview Box */}
            <div className="w-36 h-36 bg-white rounded-xl p-2 flex flex-col items-center justify-center border border-slate-700 shadow-md relative shrink-0 overflow-hidden">
              {qrImageUrl && !previewError ? (
                <img 
                  src={qrImageUrl} 
                  alt="公众号二维码预览" 
                  className="w-full h-full object-contain"
                  onError={() => setPreviewError(true)}
                />
              ) : (
                <div className="text-center p-2 text-slate-400 flex flex-col items-center justify-center gap-1">
                  <ImageIcon className="w-8 h-8 text-slate-400/60" />
                  <span className="text-[10px] text-slate-500">当前为系统默认SVG演示码</span>
                </div>
              )}
            </div>

            {/* Upload Buttons */}
            <div className="flex-1 space-y-2 text-center sm:text-left w-full">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/50 flex items-center justify-center sm:justify-start gap-2 transition active:scale-95 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>选择本地二维码图片上传 (PNG/JPG)</span>
              </button>

              <div className="text-[11px] text-slate-400">
                支持任何正方形二维码，上传后将即时同步至网站登录弹窗及表格底部。
              </div>

              {qrImageUrl && (
                <button
                  type="button"
                  onClick={() => setQrImageUrl('')}
                  className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-2 transition cursor-pointer"
                >
                  清除已上传图片，恢复默认
                </button>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                公众号名称 (展示给用户的名称)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：我爱这young"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                公众号微信号 / 原始ID
              </label>
              <input
                type="text"
                value={wechatId}
                onChange={(e) => setWechatId(e.target.value)}
                placeholder="例如：gh_7d39de02f610"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复默认设置</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/50 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>已保存！</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>保存并应用二维码</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
