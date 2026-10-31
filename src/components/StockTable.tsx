import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Award, TrendingUp, TrendingDown, 
  ExternalLink, ShieldCheck, Flame, Star, Info, ChevronRight, CheckCircle2,
  Image as ImageIcon, Sparkles, Target, BarChart2, PieChart, ChevronLeft, SlidersHorizontal, Lock,
  Copy, Check, Radio, Mail
} from 'lucide-react';
import { Stock, SortConfig, SortField, UserSession } from '../types';
import { calculateBuyOpportunityScore, getStockValuationStatus, getOrComputeStockPEPercentile } from '../utils/calculator';
import { generateDynamicStockProfile } from '../data/allASharesDictionary';
import { getOrGeneratePairingCode, subscribePairingState, simulateWeChatPairingSuccess, PairingState } from '../utils/wechatPairingService';
import { WechatQrDisplay } from './WechatQrDisplay';

interface StockTableProps {
  stocks: Stock[];
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onSelectStock: (stock: Stock) => void;
  selectedStockCodes: string[];
  onToggleSelectStock: (code: string) => void;
  onToggleSelectAll: () => void;
  onOpenExportImage?: () => void;
  searchQuery?: string;
  onClearSearch?: () => void;
  onAddCustomStock?: (stocks: Stock[]) => void;
  targetWatchlistCodes?: string[];
  onToggleTargetWatchlist?: (stock: Stock) => void;
  onOpenTargetWatchlist?: () => void;
  onExportTargetWatchlistForSelected?: () => void;
  onOpenPortfolioDrawer?: () => void;
  isLoggedIn?: boolean;
  onRequireLogin?: (prompt?: string, tab?: 'wechat' | 'email') => void;
  onLoginSuccess?: (session: UserSession) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  sortConfig,
  onSort,
  onSelectStock,
  selectedStockCodes,
  onToggleSelectStock,
  onToggleSelectAll,
  onOpenExportImage,
  searchQuery,
  onClearSearch,
  onAddCustomStock,
  targetWatchlistCodes = [],
  onToggleTargetWatchlist,
  onOpenTargetWatchlist,
  onExportTargetWatchlistForSelected,
  onOpenPortfolioDrawer,
  isLoggedIn = false,
  onRequireLogin,
  onLoginSuccess
}) => {
  const [pairingState, setPairingState] = useState<PairingState>(() => getOrGeneratePairingCode());
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribePairingState((st) => setPairingState(st));
    return unsub;
  }, []);

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pairingState.code);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleQuickPairAndUnlock = () => {
    if (onLoginSuccess) {
      const session = simulateWeChatPairingSuccess('红利价值学友·微信关注用户');
      onLoginSuccess(session);
    } else {
      onRequireLogin?.('微信扫码关注公众号，发送配对码即可自动解锁全部数据');
    }
  };
  const [hoveredScoreStock, setHoveredScoreStock] = useState<string | null>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(1800);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef<boolean>(false);

  const updateProgress = useCallback(() => {
    if (!tableContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setScrollProgress(Math.round((scrollLeft / maxScroll) * 100));
    } else {
      setScrollProgress(0);
    }
  }, []);

  const handleTopScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (tableContainerRef.current && topScrollRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      updateProgress();
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleTableScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
      updateProgress();
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const scrollByAmount = (delta: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const scrollToPosition = (left: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const measure = () => {
      if (tableContainerRef.current) {
        setTableScrollWidth(tableContainerRef.current.scrollWidth);
        updateProgress();
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (tableContainerRef.current) {
      ro.observe(tableContainerRef.current);
    }
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [stocks, updateProgress]);

  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />;
    }
    return sortConfig.direction === 'desc' 
      ? <ArrowDown className="w-3.5 h-3.5 text-rose-400 font-bold" />
      : <ArrowUp className="w-3.5 h-3.5 text-emerald-400 font-bold" />;
  };

  const isAllSelected = stocks.length > 0 && selectedStockCodes.length === stocks.length;
  const displayStocks = isLoggedIn ? stocks : stocks.slice(0, 8);
  const hiddenCount = Math.max(0, stocks.length - displayStocks.length);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
      
      {/* Table Toolbar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            已筛选标的清单
            <span className="bg-slate-800 px-2 py-0.5 rounded text-rose-400 font-bold text-xs border border-slate-700">
              共 {stocks.length} 只
            </span>
            {!isLoggedIn && stocks.length > 8 && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>未登录仅预览前 8 只</span>
              </span>
            )}
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            点击任意列头可按该维度快速排序，默认按龙头综合分降序
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedStockCodes.length > 0 && onExportTargetWatchlistForSelected && (
            <button
              onClick={onExportTargetWatchlistForSelected}
              className="px-2.5 py-1 rounded text-xs font-semibold bg-gradient-to-r from-amber-500/25 to-rose-500/25 hover:from-amber-500/35 hover:to-rose-500/35 text-amber-300 border border-amber-500/50 transition flex items-center gap-1 active:scale-95 shadow-sm"
              title="导出已勾选标的的理想目标买入价与需跌空间测算图"
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>导出已选目标价测算 ({selectedStockCodes.length})</span>
            </button>
          )}

          {onOpenTargetWatchlist && (
            <button
              onClick={onOpenTargetWatchlist}
              className="px-2.5 py-1 rounded text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-300 border border-amber-500/40 transition flex items-center gap-1 active:scale-95"
              title="打开备选股票池，按理想股息率测算当前筛选标的的目标买入价与需跌百分比"
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>备选池目标价测算 ({stocks.length})</span>
            </button>
          )}

          {onOpenExportImage && (
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  onRequireLogin?.('导出高清估值图片功能需登录后使用，支持微信扫码或邮箱快速登录');
                  return;
                }
                onOpenExportImage();
              }}
              className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition flex items-center gap-1 active:scale-95"
              title="导出当前表格为高保真图片"
            >
              <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>导出图片</span>
            </button>
          )}

          {onOpenPortfolioDrawer && (
            <button
              onClick={onOpenPortfolioDrawer}
              className="px-2.5 py-1 rounded text-xs font-semibold bg-gradient-to-r from-rose-600/20 to-amber-600/20 hover:from-rose-600/30 hover:to-amber-600/30 text-rose-300 border border-rose-500/40 transition flex items-center gap-1 active:scale-95"
              title="打开右侧栏：高股息组合模拟器与现金流测算"
            >
              <PieChart className="w-3.5 h-3.5 text-rose-400" />
              <span>组合模拟器 ({selectedStockCodes.length})</span>
            </button>
          )}

          <button
            onClick={() => onSort('leaderScore')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition border flex items-center gap-1 ${
              sortConfig.field === 'leaderScore'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>按龙头分排序</span>
          </button>

          <button
            onClick={() => onSort('valuation')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition border flex items-center gap-1 ${
              sortConfig.field === 'valuation'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="优先排序低估/安全垫深厚的标的"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>按估值状态排序</span>
          </button>

          <button
            onClick={() => onSort('ttmDividendYield')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition border flex items-center gap-1 ${
              sortConfig.field === 'ttmDividendYield'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>按股息率排序</span>
          </button>

          <button
            onClick={() => onSort('pePercentile')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition border flex items-center gap-1 ${
              sortConfig.field === 'pePercentile'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="按近5年PE历史分位数升序排序（低估值低分位优先）"
          >
            <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
            <span>按PE分位排序</span>
          </button>
        </div>
      </div>

      {/* Floating Top Horizontal Scrollbar Track & Quick Positioning Control (免拉到底部，置顶横向拉动) */}
      <div className="bg-slate-950/95 border-b border-slate-800 px-4 py-2.5 sticky top-[60px] z-20 backdrop-blur-md shadow-md flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <SlidersHorizontal className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-rose-300">横向拉动条:</span>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              拖动下方滑块或点击左右按钮，不用翻到底部即可查阅右侧市盈率PE、分位、ROE等指标
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border transition ${
              scrollProgress >= 85
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
            }`}>
              {scrollProgress >= 85 ? '✅ 已滑至最右侧 (PE分位/ROE/操作)' : '👉 右侧含PE历史分位/ROE/增速/操作'}
            </span>
          </div>

          {/* Quick Step Buttons & Column Range Anchors */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => scrollByAmount(-350)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition flex items-center gap-0.5 active:scale-95"
              title="向左横移"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>向左</span>
            </button>
            <button
              onClick={() => scrollByAmount(350)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition flex items-center gap-0.5 active:scale-95"
              title="向右横移"
            >
              <span>向右</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <span className="text-slate-700 mx-0.5 hidden sm:inline">|</span>

            <button
              onClick={() => scrollToPosition(0)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition border ${
                scrollProgress <= 15
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
              title="跳转至最左侧：股票代码、现价与股息率"
            >
              ⏪ 最左侧
            </button>

            <button
              onClick={() => scrollToPosition(120)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition border ${
                scrollProgress > 15 && scrollProgress <= 35
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              现价/股息
            </button>

            <button
              onClick={() => scrollToPosition(550)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition border ${
                scrollProgress > 35 && scrollProgress <= 65
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              综合分/PE估值
            </button>

            <button
              onClick={() => scrollToPosition(950)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition border ${
                scrollProgress > 65 && scrollProgress < 85
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              PB/总市值
            </button>

            <button
              onClick={() => scrollToPosition(2600)}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition border shadow-sm ${
                scrollProgress >= 85
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white border-rose-400 shadow-rose-950/50'
                  : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border-rose-500/40'
              }`}
              title="一键直接滑到最右侧，查看ROE、营收与净利增速、分红年数及操作"
            >
              ⏩ 直达最右侧 (ROE/成长/年限/操作)
            </button>
          </div>
        </div>

        {/* Native Synchronized Top Scrollbar Track */}
        <div 
          ref={topScrollRef} 
          onScroll={handleTopScroll}
          className="overflow-x-auto overflow-y-hidden h-4 bg-slate-900 rounded-lg border border-slate-800 cursor-ew-resize scrollbar-thin scrollbar-thumb-rose-500 hover:scrollbar-thumb-rose-400 scrollbar-track-slate-950 transition-colors shadow-inner"
          title="按住鼠标左右拖拽滑块，实时横向移动下方表格数据"
        >
          <div style={{ width: `${Math.max(1800, tableScrollWidth)}px` }} className="h-2" />
        </div>
      </div>

      {/* Table Body Container */}
      <div 
        ref={tableContainerRef} 
        onScroll={handleTableScroll} 
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-rose-500 scrollbar-track-slate-950"
      >
        <table className="w-full min-w-[1800px] text-left text-xs border-collapse">
          
          {/* Header */}
          <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-20 select-none">
            <tr>
              <th className="py-3 px-3 w-10 text-center sticky left-0 z-20 bg-slate-950">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="accent-rose-500 rounded cursor-pointer w-3.5 h-3.5"
                  title="全选/取消全选"
                />
              </th>
              
              <th className="py-3 px-2 w-12 text-center sticky left-10 z-20 bg-slate-950">
                排名
              </th>

              <th className="py-3 px-3 font-semibold text-slate-300 min-w-[150px] sticky left-[88px] z-20 bg-slate-950 border-r border-slate-800 shadow-[2px_0_6px_-1px_rgba(0,0,0,0.5)]">
                股票代码 / 简称
              </th>

              <th className="py-3 px-2 font-semibold text-slate-300 min-w-[90px]">
                所属行业
              </th>

              <th 
                onClick={() => onSort('valuation')}
                className="py-3 px-2 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-center min-w-[100px]"
                title="点击按估值状态排序（低估/正常/高估）"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>估值情况</span>
                  {renderSortIcon('valuation')}
                </div>
              </th>

              <th 
                onClick={() => onSort('price')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[95px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>现价 / 涨跌</span>
                  {renderSortIcon('price')}
                </div>
              </th>

              <th 
                onClick={() => onSort('ttmDividendYield')}
                className="py-3 px-3 font-semibold text-rose-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[130px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>滚动股息率(TTM)</span>
                  {renderSortIcon('ttmDividendYield')}
                </div>
              </th>

              <th 
                onClick={() => onSort('staticDividendYield')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[105px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>静态股息率</span>
                  {renderSortIcon('staticDividendYield')}
                </div>
              </th>

              <th 
                onClick={() => onSort('leaderScore')}
                className="py-3 px-3 font-semibold text-amber-300 cursor-pointer hover:bg-slate-800/50 transition min-w-[160px]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    龙头综合分
                  </span>
                  {renderSortIcon('leaderScore')}
                </div>
              </th>

              <th 
                onClick={() => onSort(sortConfig.field === 'pe' ? 'pePercentile' : 'pe')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[125px]"
                title="点击在市盈率PE与5年历史分位数之间切换排序"
              >
                <div className="flex items-center justify-end gap-1">
                  <span className={sortConfig.field === 'pePercentile' ? 'text-purple-300 font-bold' : sortConfig.field === 'pe' ? 'text-amber-300 font-bold' : ''}>
                    市盈率PE / 5年分位
                  </span>
                  {renderSortIcon(sortConfig.field === 'pePercentile' ? 'pePercentile' : 'pe')}
                </div>
              </th>

              <th 
                onClick={() => onSort('pb')}
                className="py-3 px-2 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[75px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>市净率PB</span>
                  {renderSortIcon('pb')}
                </div>
              </th>

              <th 
                onClick={() => onSort('marketCap')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[110px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>总市值(亿元)</span>
                  {renderSortIcon('marketCap')}
                </div>
              </th>

              <th 
                onClick={() => onSort('roe')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[85px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>ROE</span>
                  {renderSortIcon('roe')}
                </div>
              </th>

              <th 
                onClick={() => onSort('revGrowth')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[95px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>营收增速</span>
                  {renderSortIcon('revGrowth')}
                </div>
              </th>

              <th 
                onClick={() => onSort('netProfitGrowth')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[95px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>净利增速</span>
                  {renderSortIcon('netProfitGrowth')}
                </div>
              </th>

              <th 
                onClick={() => onSort('dividendYears')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-center min-w-[90px]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>分红年数</span>
                  {renderSortIcon('dividendYears')}
                </div>
              </th>

              <th className="py-3 px-3 text-center min-w-[130px]">
                操作
              </th>
            </tr>
          </thead>

          {/* Rows */}
          <tbody className="divide-y divide-slate-800/70 text-slate-200">
            {stocks.length === 0 ? (
              <tr>
                <td colSpan={17} className="py-14 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-rose-400">
                      <Info className="w-6 h-6" />
                    </div>
                    {searchQuery && searchQuery.trim() !== '' ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-300">
                          未在当前筛选视图中找到与 <span className="text-rose-400 font-mono font-bold">"{searchQuery}"</span> 匹配的标的
                        </p>
                        <p className="text-xs text-slate-500">
                          可能原因：该股票代码或名称未收录，或被其他过滤条件（如行业、ST等）排除。
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                          {/^\d{6}$/.test(searchQuery.trim()) && onAddCustomStock && (
                            <button
                              type="button"
                              onClick={() => {
                                const newStock = generateDynamicStockProfile(searchQuery.trim());
                                onAddCustomStock([newStock]);
                                onSelectStock(newStock);
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>一键生成并载入「{searchQuery.trim()}」完整档案</span>
                            </button>
                          )}
                          {onClearSearch && (
                            <button
                              type="button"
                              onClick={onClearSearch}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
                            >
                              清空搜索关键词
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-slate-300 font-medium">未找到符合当前筛选条件的股票</p>
                        <p className="text-xs text-slate-500">请尝试放宽股息率、PE限制，或切换行业分类条件</p>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {displayStocks.map((stock, index) => {
                  const isSelected = selectedStockCodes.includes(stock.code);
                  const isUp = stock.changePercent >= 0;

                  return (
                  <tr 
                    key={stock.code}
                    className={`hover:bg-slate-800/60 transition group cursor-pointer ${
                      isSelected ? 'bg-rose-950/20' : index % 2 === 1 ? 'bg-slate-950/20' : ''
                    }`}
                    onClick={() => onSelectStock(stock)}
                  >
                    
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-800 transition-colors" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectStock(stock.code)}
                        className="accent-rose-500 rounded cursor-pointer w-3.5 h-3.5"
                      />
                    </td>

                    {/* Rank Badge */}
                    <td className="py-3 px-2 text-center font-bold sticky left-10 z-10 bg-slate-900 group-hover:bg-slate-800 transition-colors">
                      {index === 0 ? (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] inline-flex items-center justify-center font-black shadow-sm shadow-amber-500/50">
                          1
                        </span>
                      ) : index === 1 ? (
                        <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-950 text-[11px] inline-flex items-center justify-center font-black">
                          2
                        </span>
                      ) : index === 2 ? (
                        <span className="w-5 h-5 rounded-full bg-amber-700 text-amber-100 text-[11px] inline-flex items-center justify-center font-black">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">{index + 1}</span>
                      )}
                    </td>

                    {/* Code & Name */}
                    <td className="py-3 px-3 sticky left-[88px] z-10 bg-slate-900 group-hover:bg-slate-800 border-r border-slate-800 shadow-[2px_0_6px_-1px_rgba(0,0,0,0.5)] transition-colors">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100 group-hover:text-rose-400 transition text-sm">
                            {stock.name}
                          </span>
                          {stock.isST && (
                            <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              ST
                            </span>
                          )}
                          {stock.isDelisted && (
                            <span className="text-[10px] px-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              退市
                            </span>
                          )}
                          {stock.isAristocrat && (
                            <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              10年贵族
                            </span>
                          )}
                          {stock.isCustom && (
                            <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-medium">
                              自定义
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="font-mono">{stock.code}</span>
                          <span className="text-slate-600 font-mono text-[9px]">{stock.market}</span>
                          {stock.alias && (
                            <span className="text-slate-400/80 text-[10px]" title={`常用别名: ${stock.alias}`}>
                              ({stock.alias.split(',')[0]})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] border border-slate-700">
                        {stock.industry}
                      </span>
                    </td>

                    {/* Valuation Status */}
                    <td className="py-3 px-2 text-center">
                      {(() => {
                        const valInfo = getStockValuationStatus(stock);
                        return (
                          <div className="flex flex-col items-center">
                            <span 
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${valInfo.badgeBg} ${valInfo.badgeText} ${valInfo.badgeBorder} shadow-sm inline-flex items-center gap-1 cursor-help`}
                              title={`${stock.name} 估值诊断：${valInfo.reason}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                valInfo.status === '低估' ? 'bg-emerald-400 animate-pulse' :
                                valInfo.status === '高估' ? 'bg-rose-400' : 'bg-sky-400'
                              }`} />
                              {valInfo.status}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5" title={`估值安全垫: ${valInfo.cushionPercent}%`}>
                              垫{valInfo.cushionPercent}%
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Price & Change */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-mono font-semibold text-slate-100 text-sm">
                        ¥{stock.price.toFixed(2)}
                      </div>
                      <div className={`font-mono text-[11px] font-medium flex items-center justify-end gap-0.5 ${
                        isUp ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                      </div>
                    </td>

                    {/* TTM Dividend Yield */}
                    <td className="py-3 px-3 text-right">
                      {(() => {
                        const baseYield = stock.prevClose > 0 && stock.ttmDividendPerShare > 0
                          ? (stock.ttmDividendPerShare / stock.prevClose) * 100
                          : 0;
                        const yieldDiffPct = baseYield > 0
                          ? ((stock.ttmDividendYield - baseYield) / baseYield) * 100
                          : 0;
                        const isAnomaly = Math.abs(yieldDiffPct) >= 10.0;

                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1">
                              {isAnomaly && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold animate-pulse border ${
                                  yieldDiffPct > 0 
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                }`} title={`盘中股息率剧烈异动 ${yieldDiffPct > 0 ? '+' : ''}${yieldDiffPct.toFixed(1)}%`}>
                                  ⚡{yieldDiffPct > 0 ? '+' : ''}{yieldDiffPct.toFixed(0)}%
                                </span>
                              )}
                              <span className={`font-mono text-sm font-bold ${isAnomaly ? 'text-amber-300' : 'text-rose-400'}`}>
                                {stock.ttmDividendYield.toFixed(2)}%
                              </span>
                            </div>
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full"
                                style={{ width: `${Math.min(100, (stock.ttmDividendYield / 10) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Static Dividend Yield */}
                    <td className="py-3 px-3 text-right font-mono text-slate-300 text-xs">
                      {stock.staticDividendYield.toFixed(2)}%
                    </td>

                    {/* Leader Score */}
                    <td className="py-3 px-3 relative" onMouseEnter={() => setHoveredScoreStock(stock.code)} onMouseLeave={() => setHoveredScoreStock(null)}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-sm min-w-[34px]">
                          {stock.leaderScore?.toFixed(1)}
                        </span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-emerald-400 rounded-full"
                            style={{ width: `${stock.leaderScore ?? 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Tooltip on Hover showing 4 Dimensions */}
                      {hoveredScoreStock === stock.code && (
                        <div className="absolute left-0 bottom-full mb-1 z-30 w-64 p-2.5 bg-slate-950 text-slate-200 text-[11px] rounded-xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 pointer-events-none">
                          <div className="font-bold text-amber-300 mb-1 flex items-center justify-between">
                            <span>{stock.name} 综合分拆解</span>
                            <span>{stock.leaderScore?.toFixed(1)}分</span>
                          </div>
                          <div className="space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-indigo-300">市值分 (40%):</span>
                              <span className="font-mono">{stock.normMarketCap} 分</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-emerald-300">ROE分 (25%):</span>
                              <span className="font-mono">{stock.normROE} 分</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-cyan-300">营收增速分 (15%):</span>
                              <span className="font-mono">{stock.normRevGrowth} 分</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-rose-300">净利增速分 (20%):</span>
                              <span className="font-mono">{stock.normNetProfitGrowth} 分</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* PE Ratio & 5-Year Historical Percentile */}
                    <td className="py-3 px-3 text-right">
                      {(() => {
                        const peInfo = getOrComputeStockPEPercentile(stock);
                        const pct = peInfo.fiveYearPercentile;
                        const pctColor = 
                          pct <= 25 ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' :
                          pct <= 50 ? 'text-teal-300 bg-teal-500/15 border-teal-500/30' :
                          pct <= 75 ? 'text-amber-300 bg-amber-500/15 border-amber-500/30' :
                          'text-rose-300 bg-rose-500/15 border-rose-500/30';
                        const barColor = 
                          pct <= 25 ? 'bg-emerald-400' :
                          pct <= 50 ? 'bg-teal-400' :
                          pct <= 75 ? 'bg-amber-400' : 'bg-rose-400';
                        const opp = calculateBuyOpportunityScore(stock);

                        return (
                          <div 
                            className="flex flex-col items-end cursor-pointer group/pe"
                            title={`市盈率PE: ${stock.pe > 0 ? stock.pe.toFixed(1) : '亏损'}\n5年历史分位: ${pct.toFixed(1)}% (${peInfo.cushionGradeLabel})\n5年估值区间: ${peInfo.minPE.toFixed(1)} ~ ${peInfo.maxPE.toFixed(1)} (均值: ${peInfo.avgPE.toFixed(1)})\n估值安全垫空间: ${peInfo.cushionPercent >= 0 ? '+' : ''}${peInfo.cushionPercent.toFixed(1)}%\n近1年分位: ${peInfo.oneYearPercentile.toFixed(1)}%\n买入机会分: ${opp.score}分 (${opp.grade}级 · ${opp.gradeLabel})`}
                          >
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="font-mono font-bold text-slate-100">
                                {stock.pe > 0 ? stock.pe.toFixed(1) : <span className="text-slate-500">亏损</span>}
                              </span>
                              <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-semibold border ${pctColor}`}>
                                5年{pct.toFixed(0)}%
                              </span>
                            </div>

                            {/* Mini percentile visual progress bar */}
                            <div className="flex items-center gap-1.5 mt-1 justify-end">
                              <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden flex">
                                <div 
                                  className={`h-full ${barColor}`} 
                                  style={{ width: `${Math.min(100, Math.max(6, pct))}%` }} 
                                />
                              </div>
                              <span className="text-[9px] text-slate-400 font-sans scale-95 origin-right">
                                {peInfo.cushionGradeLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* PB Ratio */}
                    <td className="py-3 px-2 text-right font-mono text-slate-300">
                      {stock.pb.toFixed(2)}
                    </td>

                    {/* Market Cap */}
                    <td className="py-3 px-3 text-right font-mono text-slate-200">
                      {stock.marketCap >= 10000 
                        ? `${(stock.marketCap / 10000).toFixed(2)}万亿` 
                        : `${stock.marketCap.toFixed(1)}亿`}
                    </td>

                    {/* ROE */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                      {stock.roe.toFixed(1)}%
                    </td>

                    {/* Revenue Growth */}
                    <td className={`py-3 px-3 text-right font-mono ${
                      stock.revGrowth >= 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {stock.revGrowth >= 0 ? '+' : ''}{stock.revGrowth.toFixed(1)}%
                    </td>

                    {/* Net Profit Growth */}
                    <td className={`py-3 px-3 text-right font-mono ${
                      stock.netProfitGrowth >= 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {stock.netProfitGrowth >= 0 ? '+' : ''}{stock.netProfitGrowth.toFixed(1)}%
                    </td>

                    {/* Dividend Years */}
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                        stock.dividendYears >= 10 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {stock.dividendYears}年
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {onToggleTargetWatchlist && (
                          <button
                            onClick={() => onToggleTargetWatchlist(stock)}
                            className={`p-1 rounded transition border ${
                              targetWatchlistCodes.includes(stock.code)
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 border-slate-700'
                            }`}
                            title={targetWatchlistCodes.includes(stock.code) ? '已在理想股息率备选池，点击移出' : '加入理想股息率备选池'}
                          >
                            <Target className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onSelectStock(stock)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition font-medium text-[11px] border border-slate-700 hover:border-rose-500 inline-flex items-center gap-1 shrink-0"
                        >
                          <span>分红档案</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {/* website-to-wechat 核心漏斗转化与配对卡片 (按照 littleben/website-to-wechat 规范) */}
              {hiddenCount > 0 && !isLoggedIn && (
                <tr>
                  <td colSpan={17} className="p-0 border-t border-slate-800 bg-slate-950">
                    <div className="p-5 sm:p-8 border-b border-slate-800 shadow-2xl relative overflow-hidden">
                      {/* Ambient background glow */}
                      <div className="absolute top-0 right-1/4 w-96 h-48 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
                      <div className="absolute bottom-0 left-1/4 w-96 h-48 bg-rose-500/10 blur-3xl rounded-full pointer-events-none"></div>

                      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
                        {/* Title and Funnel Hook */}
                        <div className="text-center space-y-2">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>微信公众号关注即登录 · 个人订阅号配对免密接入</span>
                          </div>
                          <h4 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center justify-center gap-2 flex-wrap">
                            <span>关注公众号【{pairingState.officialAccountName}】，回复配对码立即解锁全部标的</span>
                            <span className="text-xs bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30 font-mono font-bold">
                              剩余 {hiddenCount} 只核心标的待解锁
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
                            当前筛选池共命中 <strong className="text-slate-200 font-mono">{stocks.length}</strong> 只标的（默认展示前 8 只龙头标杆）。
                            在微信关注公众号【<strong>{pairingState.officialAccountName}</strong>】并回复当前 6 位配对码，网页即可免密瞬间同步，解锁全量大A标的、估值安全垫与高清无水印导出！
                          </p>
                        </div>

                        {/* Interactive 3-Column Card */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl">
                          
                          {/* Column 1: WeChat Official Account QR & Info (4 cols) */}
                          <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-xl border border-slate-800/90 text-center space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                {pairingState.officialAccountName.slice(0, 1) || '我'}
                              </div>
                              <div className="text-left">
                                <div className="text-xs font-bold text-slate-100">{pairingState.officialAccountName}</div>
                                <div className="text-[10px] text-emerald-400 font-mono">微信号: {pairingState.officialAccountId}</div>
                              </div>
                            </div>

                            {/* QR Code Container */}
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

                            <span className="text-[11px] text-slate-300 font-medium">
                              微信扫一扫上方二维码关注
                            </span>
                          </div>

                          {/* Column 2: Pairing Code & 3-Step Action (5 cols) */}
                          <div className="md:col-span-5 flex flex-col justify-between space-y-3 p-1">
                            <div className="space-y-2">
                              <div className="text-xs text-slate-400 flex items-center justify-between">
                                <span className="font-semibold text-slate-200">当前网页专属 6 位配对码</span>
                                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  10分钟内有效
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-2 flex items-center justify-center shadow-inner">
                                  <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 tracking-[0.2em] select-all">
                                    {pairingState.code}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleCopyCode}
                                  className="px-3.5 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold text-xs transition active:scale-95 cursor-pointer shrink-0 flex items-center gap-1"
                                >
                                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                  <span>{copiedCode ? '已复制' : '复制配对码'}</span>
                                </button>
                              </div>
                            </div>

                            {/* 3 Step Guide */}
                            <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                              <div className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                  1
                                </span>
                                <span>微信扫码关注公众号【<strong>{pairingState.officialAccountName}</strong>】</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                  2
                                </span>
                                <span>在公众号聊天窗口直接发送配对码：<strong className="text-emerald-400 font-mono">{pairingState.code}</strong></span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                  3
                                </span>
                                <span>网页端自动实时配对，无需账号密码瞬间解锁</span>
                              </div>
                            </div>

                            {/* Instant Simulation Action */}
                            <button
                              type="button"
                              onClick={handleQuickPairAndUnlock}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                              <span>模拟微信发送配对码一键快速解锁</span>
                            </button>
                          </div>

                          {/* Column 3: Lead Magnet Values Unlocked (3 cols) */}
                          <div className="md:col-span-3 flex flex-col justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-3">
                            <div className="space-y-2">
                              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>关注公众号免费解锁权益</span>
                              </div>
                              <ul className="space-y-2 text-[11px] text-slate-400">
                                <li className="flex items-center gap-1.5 text-slate-300">
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>全大A <strong>5,652</strong> 支股票红利全景</span>
                                </li>
                                <li className="flex items-center gap-1.5 text-slate-300">
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>近5年历史PE分位数估值安全垫</span>
                                </li>
                                <li className="flex items-center gap-1.5 text-slate-300">
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>理想股息率买点与需跌空间推算</span>
                                </li>
                                <li className="flex items-center gap-1.5 text-slate-300">
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>高清长图与 Excel 方案打包下载</span>
                                </li>
                              </ul>
                            </div>

                            <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => onRequireLogin?.('使用电子邮箱账号，输入验证码或密码即可登录解锁查看全部标的', 'email')}
                                className="w-full py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                              >
                                <Mail className="w-3.5 h-3.5 text-rose-400" />
                                <span>免关注：直接使用邮箱登录</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
