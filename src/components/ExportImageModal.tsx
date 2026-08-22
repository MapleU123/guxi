import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Sparkles, 
  Palette, 
  Layers, 
  ZoomIn, 
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import { Stock, FilterCriteria } from '../types';
import { 
  renderStockTableToCanvas, 
  downloadStockTableImage, 
  copyStockTableImageToClipboard,
  ImageExportOptions,
  AvatarStyle
} from '../utils/exportImage';

interface ExportImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[];
  criteria: FilterCriteria;
  avatarStyle: AvatarStyle;
}

export const ExportImageModal: React.FC<ExportImageModalProps> = ({
  isOpen,
  onClose,
  stocks,
  criteria,
  avatarStyle
}) => {
  const [theme, setTheme] = useState<'dark' | 'light' | 'wine'>('dark');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFailed, setCopyFailed] = useState<boolean>(false);

  // Generate preview image whenever stocks, theme, or avatarStyle change
  useEffect(() => {
    if (!isOpen || stocks.length === 0) return;

    let isMounted = true;
    setIsGenerating(true);

    const generate = async () => {
      try {
        const options: ImageExportOptions = {
          theme,
          title: '高股息优质公司更新汇总',
          subtitle: '基于股息率、估值安全垫与龙头综合加权引擎',
          watermark: true,
          scale: 2,
          criteria,
          avatarStyle
        };
        const canvas = await renderStockTableToCanvas(stocks, options);
        if (isMounted) {
          setPreviewUrl(canvas.toDataURL('image/png'));
          setIsGenerating(false);
        }
      } catch (err) {
        console.error('Error generating preview:', err);
        if (isMounted) setIsGenerating(false);
      }
    };

    generate();

    return () => {
      isMounted = false;
    };
  }, [isOpen, stocks, theme, criteria, avatarStyle]);

  if (!isOpen) return null;

  const handleDownload = async (format: 'png' | 'jpeg') => {
    await downloadStockTableImage(stocks, { theme, criteria, avatarStyle }, format);
  };

  const handleCopyClipboard = async () => {
    const success = await copyStockTableImageToClipboard(stocks, { theme, criteria, avatarStyle });
    if (success) {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2500);
    } else {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Card */}
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-inner">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  导出为高保真图片清单
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  共 {stocks.length} 只标的
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                包含字段：序号、股票名称、所属行业、股价、PE、PB、股息率（ATM）、连续分红年限、评分
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Theme Selector & Export Actions */}
        <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          
          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              风格主题:
            </span>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-cyan-400"></span>
                <span>经典深色</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  theme === 'light'
                    ? 'bg-slate-200 text-slate-900 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400"></span>
                <span>商务雅白</span>
              </button>
              <button
                onClick={() => setTheme('wine')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  theme === 'wine'
                    ? 'bg-rose-950/80 text-rose-300 shadow-sm border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-700 border border-rose-400"></span>
                <span>丰收红利</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Copy to Clipboard */}
            <button
              onClick={handleCopyClipboard}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border transition active:scale-95 ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="复制图片到剪贴板，支持直接粘贴到微信/飞书/钉钉"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copied ? '已复制到剪贴板' : '复制图片'}</span>
            </button>

            {/* Download JPG */}
            <button
              onClick={() => handleDownload('jpeg')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>下载 JPG</span>
            </button>

            {/* Download PNG */}
            <button
              onClick={() => handleDownload('png')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-950/40 border border-emerald-500/30 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载高清 PNG</span>
            </button>

          </div>
        </div>

        {/* Copy failed hint if unsupported browser */}
        {copyFailed && (
          <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
            <span>当前浏览器不支持直接写入图片到剪贴板，请点击【下载高清 PNG】保存图片。</span>
          </div>
        )}

        {/* Preview Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/90 flex items-center justify-center min-h-[300px]">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-12">
              <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">正在实时渲染超清图表 ({stocks.length} 只标的)...</span>
            </div>
          ) : previewUrl ? (
            <div className="w-full flex justify-center">
              <div className="max-w-full rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                <img 
                  src={previewUrl} 
                  alt="A股高股息股票筛选结果图片预览" 
                  className="w-full h-auto object-contain max-h-[65vh]"
                />
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs">暂无预览内容</div>
          )}
        </div>

        {/* Footer info note */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>超清 2x 视网膜渲染，已保留所要求的 9 项核心指标字段。</span>
          </div>
          <span className="text-slate-500 font-mono">
            分辨率: 高保真矢量栅格化
          </span>
        </div>

      </div>

    </div>
  );
};
