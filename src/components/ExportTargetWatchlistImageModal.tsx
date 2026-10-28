import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Sparkles, 
  Palette, 
  ShieldCheck,
  Target,
  Edit3,
  RotateCcw,
  Shield,
  ShieldOff
} from 'lucide-react';
import { TargetDividendCalculatedStock, FilterCriteria } from '../types';
import { 
  renderTargetWatchlistToCanvas, 
  downloadTargetWatchlistImage, 
  copyTargetWatchlistImageToClipboard,
  TargetWatchlistImageExportOptions,
  AvatarStyle,
  AspectRatioOption,
  getSuggestedStrategyTitle,
  STRATEGY_TITLE_PRESETS
} from '../utils/exportImage';

interface ExportTargetWatchlistImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: TargetDividendCalculatedStock[];
  avatarStyle: AvatarStyle;
  criteria?: FilterCriteria;
  defaultTitle?: string;
}

export const ExportTargetWatchlistImageModal: React.FC<ExportTargetWatchlistImageModalProps> = ({
  isOpen,
  onClose,
  items,
  avatarStyle,
  criteria,
  defaultTitle
}) => {
  const [theme, setTheme] = useState<'dark' | 'light' | 'wine'>('dark');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('auto');
  const [watermark, setWatermark] = useState<boolean>(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFailed, setCopyFailed] = useState<boolean>(false);

  // 依据传入条件、行业归属及默认值推导表头标题，严格遵循「该行业名称·理想目标买入价测算清单」格式
  const computeDefaultTitle = () => {
    if (defaultTitle && defaultTitle.trim()) return defaultTitle.trim();

    // 1. 优先检查待导出的 items 中所包含的所属行业
    const uniqueIndustries = Array.from(
      new Set(items.map((i) => i.stock.industry).filter(Boolean))
    );

    // 若当前导出清单均属于同一行业（如全为公用事业、银行、煤炭开采等）
    if (uniqueIndustries.length === 1) {
      return `${uniqueIndustries[0]}·理想目标买入价测算清单`;
    }

    // 2. 检查筛选器 criteria 中是否锁定单个行业
    if (criteria?.selectedIndustries && criteria.selectedIndustries.length === 1) {
      return `${criteria.selectedIndustries[0]}·理想目标买入价测算清单`;
    }

    // 3. 多行业综合/全量导出默认格式
    return '全行业·理想目标买入价测算清单';
  };

  const [title, setTitle] = useState<string>(computeDefaultTitle());
  const [subtitle, setSubtitle] = useState<string>('基于自设理想目标股息率实时倒推目标建仓买入价与需跌空间');
  const [isCustomEdited, setIsCustomEdited] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsCustomEdited(false);
      setTitle(computeDefaultTitle());
    }
  }, [isOpen, defaultTitle]);

  useEffect(() => {
    if (!isCustomEdited) {
      setTitle(computeDefaultTitle());
    }
  }, [criteria, defaultTitle, isCustomEdited]);

  const handleResetTitle = () => {
    setTitle(computeDefaultTitle());
    setIsCustomEdited(false);
  };

  // 监听 items / theme / avatarStyle / title / watermark / aspectRatio 生成高清预览
  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    let isMounted = true;
    setIsGenerating(true);

    const generate = async () => {
      try {
        const options: TargetWatchlistImageExportOptions = {
          theme,
          title: title.trim() || '全行业·理想目标买入价测算清单',
          subtitle: subtitle.trim() || '基于自设理想目标股息率实时倒推目标建仓买入价与需跌空间',
          watermark,
          scale: 2,
          avatarStyle,
          aspectRatio
        };
        const canvas = await renderTargetWatchlistToCanvas(items, options);
        if (isMounted) {
          setPreviewUrl(canvas.toDataURL('image/png'));
          setIsGenerating(false);
        }
      } catch (err) {
        console.error('Error generating target watchlist preview:', err);
        if (isMounted) setIsGenerating(false);
      }
    };

    generate();

    return () => {
      isMounted = false;
    };
  }, [isOpen, items, theme, avatarStyle, title, subtitle, watermark, aspectRatio]);

  if (!isOpen) return null;

  const handleDownload = async (format: 'png' | 'jpeg') => {
    await downloadTargetWatchlistImage(items, { theme, avatarStyle, watermark, title, subtitle, aspectRatio }, format);
  };

  const handleCopyClipboard = async () => {
    const success = await copyTargetWatchlistImageToClipboard(items, { theme, avatarStyle, watermark, title, subtitle, aspectRatio });
    if (success) {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2500);
    } else {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 3000);
    }
  };

  const reachedCount = items.filter(i => i.isReached).length;
  const closeCount = items.filter(i => i.status === 'close').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Card */}
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 flex items-center justify-center text-white shadow-inner">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  导出备选股票池高清图片清单
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  共 {items.length} 只标的
                </span>
                {reachedCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    🎯 {reachedCount} 只已达标
                  </span>
                )}
                {closeCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⚠️ {closeCount} 只临界
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                自动生成包含现价、每股分红、自设理想股息率、目标买入价、需跌空间及专属防伪水印的高保真图表
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
              <Edit3 className="w-3.5 h-3.5 text-rose-400" />
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
                placeholder="输入或选择图片表头 (如 公用事业·理想目标买入价测算清单)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-semibold"
              />
            </div>

            {/* Quick Industry Title Chips (格式：该行业名称·理想目标买入价测算清单) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">快捷表头:</span>
              {Array.from(
                new Set([
                  computeDefaultTitle(),
                  ...Array.from(new Set(items.map((i) => i.stock.industry).filter(Boolean))).map((ind) => `${ind}·理想目标买入价测算清单`),
                  '全行业·理想目标买入价测算清单'
                ])
              ).slice(0, 4).map((presetTitle) => (
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
                  title="恢复默认标题"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar: Theme, AspectRatio & Watermark Selector */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          
          {/* Options: AspectRatio, Theme, Watermark */}
          <div className="flex items-center gap-3.5 flex-wrap">

            {/* AspectRatio Selector (9:16, 3:4, 16:9, 自适应) */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                画幅比例:
              </span>
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setAspectRatio('auto')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                    aspectRatio === 'auto'
                      ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="紧凑自适应内容高宽"
                >
                  <span>自适应</span>
                </button>
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                    aspectRatio === '9:16'
                      ? 'bg-rose-500/20 text-rose-300 shadow-sm border border-rose-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="9:16 适合手机垂直长屏/海报/朋友圈/快手/小红书"
                >
                  <span className="font-mono text-[11px]">9:16</span>
                  <span className="text-[10px] text-slate-400">(手机竖屏)</span>
                </button>
                <button
                  onClick={() => setAspectRatio('3:4')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                    aspectRatio === '3:4'
                      ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="3:4 经典社交媒体卡片/公众号封面配图"
                >
                  <span className="font-mono text-[11px]">3:4</span>
                  <span className="text-[10px] text-slate-400">(社交卡片)</span>
                </button>
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                    aspectRatio === '16:9'
                      ? 'bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="16:9 电脑宽屏/演示幻灯片/横屏投屏"
                >
                  <span className="font-mono text-[11px]">16:9</span>
                  <span className="text-[10px] text-slate-400">(横屏宽屏)</span>
                </button>
              </div>
            </div>
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
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600 hover:opacity-95 text-white font-bold shadow-md shadow-rose-950/40 border border-rose-500/30 transition active:scale-95"
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
              <span className="text-xs">正在实时渲染超清备选股票池图表 ({items.length} 只标的)...</span>
            </div>
          ) : previewUrl ? (
            <div className="w-full flex justify-center">
              <div className="max-w-full rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                <img 
                  src={previewUrl} 
                  alt="A股理想股息率备选股票池清单预览" 
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
            <span>
              超清 2x 视网膜渲染，已内嵌【目标买入价 & 需跌空间】推算公式栏，
              {watermark ? '含「公众号：我爱这young」专属防伪水印。' : '已设为纯净无水印模式。'}
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            画幅比例: {aspectRatio === 'auto' ? '自适应排版' : aspectRatio}
          </span>
        </div>

      </div>

    </div>
  );
};
