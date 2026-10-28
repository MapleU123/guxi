import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Filter, Search, SlidersHorizontal, ChevronDown, ChevronUp, 
  HelpCircle, CheckSquare, Square, X, Layers, Check, Plus,
  Sparkles, ArrowUpRight, ShieldCheck, TrendingUp, Database, Loader2, Zap
} from 'lucide-react';
import { FilterCriteria, DividendYieldType, Stock } from '../types';
import { ALL_INDUSTRIES } from '../data/stocksData';
import { searchAllAShares, fetchOrBuildStock, SearchResultItem } from '../utils/stockSearchService';

const ALL_BOARDS = [
  { id: '沪市主板', name: '沪市主板', count: 1692, color: 'text-rose-400' },
  { id: '深市主板', name: '深市主板', count: 1515, color: 'text-indigo-400' },
  { id: '创业板', name: '创业板', count: 1358, color: 'text-amber-400' },
  { id: '科创板', name: '科创板', count: 575, color: 'text-emerald-400' },
  { id: '北交所', name: '北交所', count: 262, color: 'text-purple-400' }
];

// 常见快速试搜标的（涵盖周期、消费、老字号、科技、化工等）
const QUICK_SEARCH_EXAMPLES = [
  { label: '赤天化', code: '600227' },
  { label: '宝泰隆', code: '601011' },
  { label: '陕西黑猫', code: '601015' },
  { label: '同仁堂', code: '600085' },
  { label: '大族激光', code: '002008' },
  { label: '中国神华', code: '601088' }
];

interface FilterPanelProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  allStocks: Stock[];
  filteredCount: number;
  onOpenImportModal?: () => void;
  onSelectStock?: (stock: Stock) => void;
  onAddCustomStock?: (stocks: Stock[]) => void;
  onOpenMarketUniverse?: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  criteria,
  onChange,
  allStocks,
  filteredCount,
  onOpenImportModal,
  onSelectStock,
  onAddCustomStock,
  onOpenMarketUniverse
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showYieldTooltip, setShowYieldTooltip] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<SearchResultItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭搜索下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 全市场 5000+ A股智能联想检索（Debounce 防抖 + 在线 API + 本地大词典）
  useEffect(() => {
    const q = criteria.searchQuery.trim();
    if (!q) {
      setSmartSuggestions([]);
      setIsSearchingOnline(false);
      return;
    }

    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAllAShares(q, allStocks);
        setSmartSuggestions(results);
      } catch (err) {
        console.error('Failed to search stocks:', err);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [criteria.searchQuery, allStocks]);

  // 处理直接从搜索推荐点击股票（支持一键穿透获取真实行情并打开档案）
  const handleSelectSearchResult = async (item: SearchResultItem) => {
    setIsLoadingStock(true);
    try {
      let targetStock: Stock;
      const existingInPool = allStocks.find((s) => s.code === item.code);

      if (existingInPool) {
        targetStock = existingInPool;
      } else {
        // 从真实行情接口拉取盘口并生成完整画像
        targetStock = await fetchOrBuildStock(item.code, item.name);
        if (onAddCustomStock) {
          onAddCustomStock([targetStock]);
        }
      }

      onChange({ ...criteria, searchQuery: targetStock.code, searchBypassFilters: true });
      setIsSearchFocused(false);
      if (onSelectStock) {
        onSelectStock(targetStock);
      }
    } catch (err) {
      console.error('Error selecting stock:', err);
    } finally {
      setIsLoadingStock(false);
    }
  };

  // 处理按回车键直接选中第一项
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && smartSuggestions.length > 0) {
      e.preventDefault();
      handleSelectSearchResult(smartSuggestions[0]);
    }
  };

  // 计算每个行业的股票分布数 (在符合当前其他基础条件下的股票数)
  const industryStockCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_INDUSTRIES.forEach((ind) => {
      counts[ind] = allStocks.filter((s) => s.industry === ind && (!criteria.excludeST || !s.isST) && (!criteria.excludeDelisted || !s.isDelisted)).length;
    });
    return counts;
  }, [allStocks, criteria.excludeST, criteria.excludeDelisted]);

  const handleIndustryToggle = (industry: string) => {
    let nextIndustries: string[];
    if (criteria.selectedIndustries.includes(industry)) {
      nextIndustries = criteria.selectedIndustries.filter((i) => i !== industry);
    } else {
      nextIndustries = [...criteria.selectedIndustries, industry];
    }
    
    // 如果用户单选了特定红利行业（如水电、保险），自动调节门槛以确保5大清洁水电金牛或险资龙头完整展示
    const newCriteria = { ...criteria, selectedIndustries: nextIndustries };
    if (nextIndustries.length === 1) {
      if (nextIndustries[0] === '水电' && criteria.minDividendYield > 1.8) {
        newCriteria.minDividendYield = 1.8;
        newCriteria.maxPE = Math.max(criteria.maxPE, 25);
      } else if (nextIndustries[0] === '保险' && criteria.minDividendYield > 2.0) {
        newCriteria.minDividendYield = 2.0;
      }
    }
    onChange(newCriteria);
  };

  const handleSelectAllIndustries = () => {
    onChange({ ...criteria, selectedIndustries: [] });
  };

  const handleBoardToggle = (boardId: string) => {
    const current = criteria.selectedBoards || [];
    let nextBoards: string[];
    if (current.includes(boardId)) {
      nextBoards = current.filter((b) => b !== boardId);
    } else {
      nextBoards = [...current, boardId];
    }
    onChange({ ...criteria, selectedBoards: nextBoards });
  };

  const handleSelectAllBoards = () => {
    onChange({ ...criteria, selectedBoards: [] });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 mb-5 shadow-sm">
      
      {/* Top Row: Search & Core Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pb-4 border-b border-slate-800">
        
        {/* Search Input with Live Suggestion Dropdown */}
        <div className="md:col-span-4 relative" ref={searchContainerRef}>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-rose-400" />
              <span>快速检索股票</span>
              {criteria.searchQuery && (
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-mono">
                  搜到 {filteredCount} 只
                </span>
              )}
            </label>
            {onOpenImportModal && (
              <button
                type="button"
                onClick={onOpenImportModal}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 font-semibold hover:underline"
                title="导入或添加您自己的股票列表"
              >
                <Plus className="w-3 h-3" />
                <span>导入/添加股票</span>
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={criteria.searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                onChange({ ...criteria, searchQuery: e.target.value });
                setIsSearchFocused(true);
              }}
              placeholder="全A股5000+秒搜: 输入名称/拼音/代码 (如 赤天化, 宝泰隆, 同仁堂, cth, 002008)"
              className="w-full bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg pl-9 pr-8 py-2 text-xs border border-slate-700 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
            />
            {isSearchingOnline ? (
              <Loader2 className="w-4 h-4 text-rose-400 absolute left-3 top-2.5 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            )}
            {criteria.searchQuery && (
              <button
                onClick={() => onChange({ ...criteria, searchQuery: '' })}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 常用典型 A 股快速试搜标签 */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[10px]">
            <span className="text-slate-500">试搜:</span>
            {QUICK_SEARCH_EXAMPLES.map((ex) => (
              <button
                key={ex.code}
                type="button"
                onClick={() => {
                  onChange({ ...criteria, searchQuery: ex.label, searchBypassFilters: true });
                  setIsSearchFocused(true);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition"
              >
                {ex.label}
              </button>
            ))}
          </div>

          {/* Search Options & Filter-Bypass Switch */}
          {criteria.searchQuery && (
            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 px-1">
              <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={criteria.searchBypassFilters !== false}
                  onChange={(e) => onChange({ ...criteria, searchBypassFilters: e.target.checked })}
                  className="accent-rose-500 rounded cursor-pointer w-3 h-3"
                />
                <span>搜索时直通显示（忽略股息率/PE门槛）</span>
              </label>
              <button
                onClick={() => onChange({ ...criteria, searchQuery: '' })}
                className="text-rose-400 hover:underline"
              >
                清空搜索
              </button>
            </div>
          )}

          {/* Live Search Autocomplete Popover Dropdown (全A股5000+智能联想与直通穿透) */}
          {isSearchFocused && criteria.searchQuery.trim() !== '' && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-800/90 text-[10px] font-semibold text-slate-400 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-rose-400" />
                  大A全市场 5,652 支股票智能检索 (回车/点击即可穿透查看)
                </span>
                {isSearchingOnline && (
                  <span className="text-rose-400 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> 查询中
                  </span>
                )}
                {!isSearchingOnline && (
                  <span className="text-slate-500">{smartSuggestions.length} 条匹配</span>
                )}
              </div>

              {smartSuggestions.length > 0 ? (
                <div className="divide-y divide-slate-800/60">
                  {smartSuggestions.map((item) => {
                    const st = item.stock;
                    return (
                      <div
                        key={item.code}
                        onClick={() => handleSelectSearchResult(item)}
                        className="px-3 py-2 hover:bg-slate-800/90 cursor-pointer flex items-center justify-between transition group text-xs"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100 group-hover:text-rose-400 transition font-mono">
                            {item.code}
                          </span>
                          <span className="font-semibold text-slate-200 group-hover:text-white">
                            {item.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded border border-slate-700">
                            {item.market === 'SH' ? '沪市' : item.market === 'BJ' ? '北交所' : '深市'}
                          </span>
                          {item.pinyin && (
                            <span className="text-[10px] text-slate-500 font-mono uppercase">
                              {item.pinyin}
                            </span>
                          )}
                          {item.existsInLocalPool ? (
                            <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                              已在池中
                            </span>
                          ) : (
                            <span className="text-[9px] px-1 py-0.2 bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                              全A穿透
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
                          {st ? (
                            <>
                              <span className="text-slate-300">¥{st.price.toFixed(2)}</span>
                              <span className="text-rose-400 font-semibold" title="滚动股息率TTM">
                                股息 {st.ttmDividendYield.toFixed(2)}%
                              </span>
                              <span className="text-indigo-400">PE {st.pe > 0 ? st.pe.toFixed(1) : '-'}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[10px] group-hover:text-rose-300 flex items-center gap-0.5">
                              点击穿透生成档案
                            </span>
                          )}
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  {isSearchingOnline ? (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      <span>正在全网穿透检索 A 股 5,652 支股票库...</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-300 mb-1">未找到包含 "{criteria.searchQuery}" 的标的</p>
                      <p className="text-[11px] text-slate-500">
                        支持输入任意 6 位代码（如 600227）、股票简称（如 赤天化、宝泰隆、陕西黑猫、同仁堂、大族激光）或拼音首字母（如 cth, btl, sxhm, trt, dzjg）
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dividend Yield Type & Threshold */}
        <div className="md:col-span-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <span>股息率要求</span>
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setShowYieldTooltip(!showYieldTooltip)}
                  onMouseEnter={() => setShowYieldTooltip(true)}
                  onMouseLeave={() => setShowYieldTooltip(false)}
                  className="text-amber-400 hover:text-amber-300 transition"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
                {showYieldTooltip && (
                  <div className="absolute left-0 top-5 z-40 w-72 p-3 bg-slate-800 text-slate-200 text-[11px] rounded-lg shadow-xl border border-slate-700 leading-relaxed">
                    <p className="font-bold text-amber-300 mb-1">【股息率说明】</p>
                    <p className="mb-1.5"><strong className="text-slate-100">① 滚动股息率(TTM)：</strong>过去12个月每股分红总额与当日每股股价的比值，最能反应当前动态现金回报。</p>
                    <p><strong className="text-slate-100">② 静态股息率：</strong>上年度每股分红总额与当日每股股价的比值。</p>
                  </div>
                )}
              </div>
            </label>

            {/* Mode Selector */}
            <div className="flex items-center bg-slate-800 rounded p-0.5 text-[11px]">
              <button
                onClick={() => onChange({ ...criteria, dividendYieldType: 'ttm' })}
                className={`px-2 py-0.5 rounded transition ${
                  criteria.dividendYieldType === 'ttm' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                滚动TTM
              </button>
              <button
                onClick={() => onChange({ ...criteria, dividendYieldType: 'static' })}
                className={`px-2 py-0.5 rounded transition ${
                  criteria.dividendYieldType === 'static' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                静态
              </button>
              <button
                onClick={() => onChange({ ...criteria, dividendYieldType: 'both' })}
                className={`px-2 py-0.5 rounded transition ${
                  criteria.dividendYieldType === 'both' ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                两者皆满足
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={criteria.minDividendYield}
              onChange={(e) => onChange({ ...criteria, minDividendYield: Number(e.target.value) })}
              className="flex-1 accent-rose-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-xs text-rose-400 font-bold min-w-[70px] justify-center">
              <span>≥ {criteria.minDividendYield.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* PE Ratio Slider */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-400">
              市盈率 PE (TTM)
            </label>
            <span className="text-xs font-bold text-indigo-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              ≤ {criteria.maxPE} 倍
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="40"
            step="1"
            value={criteria.maxPE}
            onChange={(e) => onChange({ ...criteria, maxPE: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
        </div>

      </div>

      {/* Row 2: Market Board & Industry Selector Bar */}
      <div className="pt-3 pb-2 space-y-3">
        
        {/* 1. 板块分类筛选 (涵盖 5652 支股票全域分布) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>市场板块筛选 (大A全域 5,652 支股票)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  ({!criteria.selectedBoards || criteria.selectedBoards.length === 0 ? '全部板块' : `已选 ${criteria.selectedBoards.length} 个板块`})
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              {criteria.selectedBoards && criteria.selectedBoards.length > 0 && (
                <button
                  onClick={handleSelectAllBoards}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition"
                >
                  重置为全部板块
                </button>
              )}
              {onOpenMarketUniverse && (
                <button
                  type="button"
                  onClick={onOpenMarketUniverse}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium transition flex items-center gap-1 hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>5652支全景透视</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={handleSelectAllBoards}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                !criteria.selectedBoards || criteria.selectedBoards.length === 0
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              全部板块 (5,652支)
            </button>
            {ALL_BOARDS.map((board) => {
              const isSelected = criteria.selectedBoards?.includes(board.id);
              return (
                <button
                  key={board.id}
                  onClick={() => handleBoardToggle(board.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <span>{board.name}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-300 font-bold' : 'text-slate-500'}`}>
                    {board.count}支
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 行业分类筛选 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              行业分类筛选
              <span className="text-[11px] font-normal text-slate-500">
                ({criteria.selectedIndustries.length === 0 ? '全部行业' : `已选 ${criteria.selectedIndustries.length} 个`})
              </span>
            </label>
            <div className="flex items-center gap-2">
              {criteria.selectedIndustries.length > 0 && (
                <button
                  onClick={handleSelectAllIndustries}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition cursor-pointer"
                >
                  重置为全部行业
                </button>
              )}
            </div>
          </div>

          {/* 重点特色高股息赛道醒目直达条 */}
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 mb-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1 shrink-0 mr-1">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>重点特色红利赛道:</span>
            </span>
            {[
              { name: '水电', icon: '🌊', count: industryStockCounts['水电'] || 5, tip: '长江电力/华能水电/川投能源/国投电力/三峡水利' },
              { name: '电信运营商', icon: '📡', count: industryStockCounts['电信运营商'] || 3, tip: '中国移动/中国电信/中国联通' },
              { name: '大众服饰', icon: '👔', count: industryStockCounts['大众服饰'] || 7, tip: '海澜之家/雅戈尔/森马服饰/报喜鸟/太平鸟/地素/比音勒芬' },
              { name: '纺织服饰', icon: '🧵', count: industryStockCounts['纺织服饰'] || 4, tip: '富安娜/罗莱生活/水星家纺/伟星股份' },
              { name: '保险', icon: '🛡️', count: industryStockCounts['保险'] || 5, tip: '中国平安/中国太保/中国人保/中国人寿/新华保险' },
              { name: '煤炭开采', icon: '⛏️', count: industryStockCounts['煤炭开采'] || 20, tip: '中国神华/陕西煤业/兖矿能源等' },
              { name: '银行', icon: '🏦', count: industryStockCounts['银行'] || 32, tip: '国有大行与优质城农商高股息' }
            ].map(sec => {
              const isSelected = criteria.selectedIndustries.includes(sec.name);
              return (
                <button
                  key={sec.name}
                  type="button"
                  onClick={() => handleIndustryToggle(sec.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-sm shadow-emerald-950/50'
                      : 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-emerald-500/50'
                  }`}
                  title={`${sec.name}: ${sec.tip}`}
                >
                  <span>{sec.icon}</span>
                  <span>{sec.name}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-emerald-500/40 text-white' : 'bg-slate-900/80 text-emerald-400/90'}`}>
                    {sec.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={handleSelectAllIndustries}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                criteria.selectedIndustries.length === 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              全部行业 ({allStocks.length})
            </button>
            {ALL_INDUSTRIES.map((industry) => {
              const isSelected = criteria.selectedIndustries.includes(industry);
              const count = industryStockCounts[industry] || 0;
              return (
                <button
                  key={industry}
                  onClick={() => handleIndustryToggle(industry)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <span>{industry}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Row 3: Exclusion Flags & Advanced Expand Toggle */}
      <div className="pt-3 mt-1 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Core Exclusion Toggles */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-slate-100 select-none">
            <input
              type="checkbox"
              checked={criteria.excludeST}
              onChange={(e) => onChange({ ...criteria, excludeST: e.target.checked })}
              className="accent-rose-600 rounded cursor-pointer w-4 h-4"
            />
            <span className="font-medium">排除 ST / *ST 股</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-slate-100 select-none">
            <input
              type="checkbox"
              checked={criteria.excludeDelisted}
              onChange={(e) => onChange({ ...criteria, excludeDelisted: e.target.checked })}
              className="accent-rose-600 rounded cursor-pointer w-4 h-4"
            />
            <span className="font-medium">排除退市整理期股票</span>
          </label>
        </div>

        {/* Advanced Filters Expand Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition font-medium"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
          <span>{showAdvanced ? '收起质地扩展条件' : '展开质地扩展条件 (市值/ROE/分红年数)'}</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

      </div>

      {/* Advanced Quality Filters (Collapsible) */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/40 p-3.5 rounded-lg border border-slate-800">
          
          {/* Min Market Cap */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              总市值门槛
            </label>
            <select
              value={criteria.minMarketCap}
              onChange={(e) => onChange({ ...criteria, minMarketCap: Number(e.target.value) })}
              className="w-full bg-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs border border-slate-700 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value={0}>不限市值</option>
              <option value={100}>≥ 100 亿元 (中大盘)</option>
              <option value={500}>≥ 500 亿元 (核心大盘)</option>
              <option value={1000}>≥ 1000 亿元 (千亿巨头)</option>
            </select>
          </div>

          {/* Min ROE */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              净资产收益率 (ROE)
            </label>
            <select
              value={criteria.minROE}
              onChange={(e) => onChange({ ...criteria, minROE: Number(e.target.value) })}
              className="w-full bg-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs border border-slate-700 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value={0}>不限 ROE</option>
              <option value={8}>≥ 8% (稳健盈利)</option>
              <option value={12}>≥ 12% (优秀盈利)</option>
              <option value={15}>≥ 15% (超强ROE盈利)</option>
            </select>
          </div>

          {/* Min Dividend Years */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              连续分红年数
            </label>
            <select
              value={criteria.minDividendYears}
              onChange={(e) => onChange({ ...criteria, minDividendYears: Number(e.target.value) })}
              className="w-full bg-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs border border-slate-700 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value={0}>不限年数</option>
              <option value={3}>连续分红 ≥ 3年</option>
              <option value={5}>连续分红 ≥ 5年</option>
              <option value={10}>连续分红 ≥ 10年 (红利贵族)</option>
              <option value={15}>连续分红 ≥ 15年 (超长分红常青树)</option>
            </select>
          </div>

        </div>
      )}

    </div>
  );
};
