import React, { useState } from 'react';
import { Camera, ZoomIn, Upload, Sparkles, X } from 'lucide-react';
import { WechatQrConfigModal } from './WechatQrConfigModal';
import { OfficialAccountConfig } from '../utils/wechatPairingService';

interface WechatQrDisplayProps {
  qrImageUrl?: string;
  officialAccountName: string;
  officialAccountId: string;
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
  onConfigChanged?: (config: OfficialAccountConfig) => void;
}

export const WechatQrDisplay: React.FC<WechatQrDisplayProps> = ({
  qrImageUrl,
  officialAccountName,
  officialAccountId,
  size = 'md',
  showUploadButton = true,
  onConfigChanged
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-28 h-28',
    md: 'w-36 h-36',
    lg: 'w-44 h-44'
  }[size];

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div 
          className="p-2.5 bg-white rounded-xl shadow-lg border border-slate-200 relative group cursor-pointer"
          onClick={() => setIsZoomOpen(true)}
          title="点击放大查看二维码"
        >
          <div className={`${sizeClasses} bg-slate-50 rounded-lg flex flex-col items-center justify-center relative p-1 overflow-hidden`}>
            {qrImageUrl ? (
              <img 
                src={qrImageUrl} 
                alt={`${officialAccountName} 微信二维码`} 
                className="w-full h-full object-contain"
              />
            ) : (
              /* Fallback Crisp WeChat QR SVG */
              <>
                <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                  {/* Position detection patterns */}
                  <rect x="5" y="5" width="26" height="26" rx="4" fill="#07C160" />
                  <rect x="9" y="9" width="18" height="18" fill="white" />
                  <rect x="13" y="13" width="10" height="10" rx="2" fill="#07C160" />

                  <rect x="69" y="5" width="26" height="26" rx="4" fill="#07C160" />
                  <rect x="73" y="9" width="18" height="18" fill="white" />
                  <rect x="77" y="13" width="10" height="10" rx="2" fill="#07C160" />

                  <rect x="5" y="69" width="26" height="26" rx="4" fill="#07C160" />
                  <rect x="9" y="73" width="18" height="18" fill="white" />
                  <rect x="13" y="77" width="10" height="10" rx="2" fill="#07C160" />

                  {/* Alignment & timing marks */}
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
                  <rect x="60" y="76" width="8" height="8" rx="1" fill="#1e293b" />
                  <rect x="74" y="76" width="6" height="8" rx="1" fill="#1e293b" />
                  <rect x="86" y="76" width="8" height="8" rx="1" fill="#1e293b" />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-500 shadow-md flex items-center justify-center text-emerald-600 font-black text-[11px]">
                    {officialAccountName.slice(0, 2) || '红利'}
                  </div>
                </div>
              </>
            )}

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-medium gap-1 rounded-lg">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>点击放大</span>
            </div>
          </div>
        </div>

        {/* Change / Upload Button */}
        {showUploadButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsConfigOpen(true);
            }}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium hover:underline underline-offset-2 transition cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            <span>{qrImageUrl ? '更换公众号二维码' : '上传我的真实二维码'}</span>
          </button>
        )}
      </div>

      {/* Zoom Modal */}
      {isZoomOpen && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setIsZoomOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full flex flex-col items-center text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-100 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-sm font-bold text-slate-100 mb-1">
              微信扫码关注【{officialAccountName}】
            </h4>
            <p className="text-xs text-slate-400 mb-4 font-mono">微信号: {officialAccountId}</p>

            <div className="w-64 h-64 bg-white p-3 rounded-xl shadow-inner border border-slate-300 flex items-center justify-center">
              {qrImageUrl ? (
                <img 
                  src={qrImageUrl} 
                  alt={officialAccountName} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full relative">
                  <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="5" y="5" width="26" height="26" rx="4" fill="#07C160" />
                    <rect x="9" y="9" width="18" height="18" fill="white" />
                    <rect x="13" y="13" width="10" height="10" rx="2" fill="#07C160" />

                    <rect x="69" y="5" width="26" height="26" rx="4" fill="#07C160" />
                    <rect x="73" y="9" width="18" height="18" fill="white" />
                    <rect x="77" y="13" width="10" height="10" rx="2" fill="#07C160" />

                    <rect x="5" y="69" width="26" height="26" rx="4" fill="#07C160" />
                    <rect x="9" y="73" width="18" height="18" fill="white" />
                    <rect x="13" y="77" width="10" height="10" rx="2" fill="#07C160" />

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
                    <rect x="60" y="76" width="8" height="8" rx="1" fill="#1e293b" />
                    <rect x="74" y="76" width="6" height="8" rx="1" fill="#1e293b" />
                    <rect x="86" y="76" width="8" height="8" rx="1" fill="#1e293b" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-emerald-500 shadow-md flex items-center justify-center text-emerald-600 font-black text-sm">
                      {officialAccountName.slice(0, 2) || '红利'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  setIsZoomOpen(false);
                  setIsConfigOpen(true);
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>更换二维码</span>
              </button>

              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      <WechatQrConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSaved={onConfigChanged}
      />
    </>
  );
};
