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
  ShieldCheck,
  Tag,
  Edit3,
  RotateCcw,
  Shield,
  ShieldOff
} from 'lucide-react';
import { Stock, FilterCriteria } from '../types';
import { 
  renderStockTableToCanvas, 
  downloadStockTableImage, 
  copyStockTableImageToClipboard,
  ImageExportOptions,
  AvatarStyle,
  getSuggestedStrategyTitle,
  STRATEGY_TITLE_PRESETS
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
  const [watermark, setWatermark] = useState<boolean>(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFailed, setCopyFailed] = useState<boolean>(false);

  // 动态策略标题与副标题（依据当前筛选条件自动命名，支持手动编辑）
  const initialSuggested = getSuggestedStrategyTitle(criteria);
  const [title, setTitle] = useState<string>(initialSuggested.title);
  const [subtitle, setSubtitle] = useState<string>(initialSuggested.subtitle);
  const [isCustomEdited, setIsCustomEdited] = useState<boolean>(false);

  // 当外部 criteria 改变且用户未主动锁死自定义时，自动更新标题
  useEffect(() => {
    if (!isCustomEdited) {
      const suggested = getSuggestedStrategyTitle(criteria);
      setTitle(suggested.title);
      setSubtitle(suggested.subtitle);
    }
  }, [criteria, isCustomEdited]);

  // 重置回系统推导标题
  const handleResetTitle = () => {
    const suggested = getSuggestedStrategyTitle(criteria);
    setTitle(suggested.title);
    setSubtitle(suggested.subtitle);
    setIsCustomEdited(false);
  };

  // Generate preview image whenever stocks, theme, title, subtitle, avatarStyle or watermark change
  useEffect(() => {
    if (!isOpen || stocks.length === 0) return;

    let isMounted = true;
    setIsGenerating(true);

    const generate = async () => {
      try {
        const options: ImageExportOptions = {
          theme,
          title: title.trim() || '高股息优质公司估值清单',
          subtitle: subtitle.trim() || '基于股息率、估值安全垫与龙头综合加权引擎',
          watermark,
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
  }, [isOpen, stocks, theme, criteria, avatarStyle, title, subtitle, watermark]);

  if (!isOpen) return null;

  const handleDownload = async (format: 'png' | 'jpeg') => {
    await downloadStockTableImage(stocks, { theme, criteria, avatarStyle, watermark, title, subtitle }, format);
  };

  const handleCopyClipboard = async () => {
    const success = await copyStockTableImageToClipboard(stocks, { theme, criteria, avatarStyle, watermark, title, subtitle });
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
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
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
                <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  标题自适应筛选策略
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                图表包含：序号、股票名称与代码、所属行业、股价、PE、PB、现行股息率、连续分红年限及综合评分
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

        {/* Title & Strategy Preset Customizer Bar */}
        <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-col gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1 shrink-0">
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              图片主标题:
            </span>
            <div className="flex-1 min-w-[240px] relative">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsCustomEdited(true);
                }}
                placeholder="输入或选择图片标题 (如 红利龙头核心池, 十年红利贵族)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-semibold"
              />
            </div>

            {/* Quick Strategy Title Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">常用标签:</span>
              {STRATEGY_TITLE_PRESETS.slice(0, 5).map((presetTitle) => (
                <button
                  key={presetTitle}
                  onClick={() => {
                    setTitle(presetTitle);
                    setIsCustomEdited(true);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition border ${
                    title === presetTitle
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {presetTitle}
                </button>
              ))}

              {isCustomEdited && (
                <button
                  onClick={handleResetTitle}
                  className="px-2 py-0.5 rounded-md text-[11px] text-slate-400 hover:text-cyan-300 transition flex items-center gap-1 ml-1"
                  title="恢复为基于当前筛选条件推导的默认标题"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>智能重置</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar: Theme Selector & Export Actions */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          
          {/* Theme & Watermark Selector */}
          <div className="flex items-center gap-4 flex-wrap">
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

            {/* Watermark Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                {watermark ? <Shield className="w-3.5 h-3.5 text-amber-400" /> : <ShieldOff className="w-3.5 h-3.5 text-slate-500" />}
                防伪水印:
              </span>
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setWatermark(true)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    watermark
                      ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="开启专属公众号防伪背景水印"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>添加水印</span>
                </button>
                <button
                  onClick={() => setWatermark(false)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    !watermark
                      ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="生成纯净无水印的高清图片"
                >
                  <ShieldOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>无水印(纯净)</span>
                </button>
              </div>
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
            <span>超清 2x 视网膜渲染，标题：【{title}】，含公众号：我爱这young专属防伪水印。</span>
          </div>
          <span className="text-slate-500 font-mono">
            分辨率: 高保真矢量栅格化
          </span>
        </div>

      </div>

    </div>
  );
};
