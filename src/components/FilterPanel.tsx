import React, { useState, useRef, useEffect } from 'react';
import { 
  Filter, Search, SlidersHorizontal, ChevronDown, ChevronUp, 
  HelpCircle, CheckSquare, Square, X, Layers, Check, Plus,
  Sparkles, ArrowUpRight, ShieldCheck, TrendingUp, Database
} from 'lucide-react';
import { FilterCriteria, DividendYieldType, Stock } from '../types';
import { ALL_INDUSTRIES } from '../data/stocksData';
import { generateDynamicStockProfile } from '../data/allASharesDictionary';

const ALL_BOARDS = [
  { id: '沪市主板', name: '沪市主板', count: 1692, color: 'text-rose-400' },
  { id: '深市主板', name: '深市主板', count: 1515, color: 'text-indigo-400' },
  { id: '创业板', name: '创业板', count: 1358, color: 'text-amber-400' },
  { id: '科创板', name: '科创板', count: 575, color: 'text-emerald-400' },
  { id: '北交所', name: '北交所', count: 262, color: 'text-purple-400' }
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

  // 实时搜索候选匹配（从所有已存股票中模糊匹配）
  const searchSuggestions = React.useMemo(() => {
    const q = criteria.searchQuery.trim().toUpperCase();
    if (!q) return [];
    
    return allStocks
      .filter((s) => {
        const matchCode = s.code.toUpperCase().includes(q);
        const matchName = s.name.toUpperCase().includes(q);
        const matchPinyin = s.pinyin ? s.pinyin.toUpperCase().includes(q) : false;
        const matchIndustry = s.industry ? s.industry.toUpperCase().includes(q) : false;
        return matchCode || matchName || matchPinyin || matchIndustry;
      })
      .slice(0, 6);
  }, [allStocks, criteria.searchQuery]);

  // 是否输入了 6 位纯数字股票代码但当前本地池暂无精确匹配
  const potentialNewCode = React.useMemo(() => {
    const q = criteria.searchQuery.trim();
    if (/^\d{6}$/.test(q)) {
      const exists = allStocks.some((s) => s.code === q);
      return exists ? null : q;
    }
    return null;
  }, [allStocks, criteria.searchQuery]);

  // 处理直接从搜索推荐点击股票
  const handleSelectSuggestion = (stock: Stock) => {
    onChange({ ...criteria, searchQuery: stock.code, searchBypassFilters: true });
    setIsSearchFocused(false);
    if (onSelectStock) {
      onSelectStock(stock);
    }
  };

  // 处理未收录 6 位代码的一键自动生成与查看
  const handleCreateAndOpenStock = (code: string) => {
    const newStock = generateDynamicStockProfile(code);
    if (onAddCustomStock) {
      onAddCustomStock([newStock]);
    }
    onChange({ ...criteria, searchQuery: code, searchBypassFilters: true });
    setIsSearchFocused(false);
    if (onSelectStock) {
      onSelectStock(newStock);
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
    onChange({ ...criteria, selectedIndustries: nextIndustries });
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
              onChange={(e) => {
                onChange({ ...criteria, searchQuery: e.target.value });
                setIsSearchFocused(true);
              }}
              placeholder="输入代码 / 简称 / 拼音 (如 600519, 茅台, GZMT)"
              className="w-full bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg pl-9 pr-8 py-2 text-xs border border-slate-700 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {criteria.searchQuery && (
              <button
                onClick={() => onChange({ ...criteria, searchQuery: '' })}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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

          {/* Live Search Autocomplete Popover Dropdown */}
          {isSearchFocused && criteria.searchQuery.trim() !== '' && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-slate-850 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800">
              {searchSuggestions.length > 0 ? (
                <div>
                  <div className="px-3 py-1.5 bg-slate-800/80 text-[10px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>匹配标的推荐 (点击直接打开档案)</span>
                    <span className="text-slate-500">{searchSuggestions.length} 条</span>
                  </div>
                  {searchSuggestions.map((stock) => (
                    <div
                      key={stock.code}
                      onClick={() => handleSelectSuggestion(stock)}
                      className="px-3 py-2 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition group text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 group-hover:text-rose-400 transition font-mono">
                          {stock.code}
                        </span>
                        <span className="font-semibold text-slate-200">{stock.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded border border-slate-700">
                          {stock.industry}
                        </span>
                        {stock.isCustom && (
                          <span className="text-[9px] px-1 py-0.2 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                            自定义
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="text-slate-300">¥{stock.price.toFixed(2)}</span>
                        <span className="text-rose-400 font-semibold" title="滚动股息率TTM">
                          股息 {stock.ttmDividendYield.toFixed(2)}%
                        </span>
                        <span className="text-indigo-400">PE {stock.pe.toFixed(1)}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  <p>当前股票池未找到完全匹配的标的</p>
                </div>
              )}

              {/* 识别到未收录 6 位代码时的直通生成通道 */}
              {potentialNewCode && (
                <div className="p-2.5 bg-gradient-to-r from-rose-950/40 to-indigo-950/40 border-t border-rose-500/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-rose-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>识别到未录入A股代码 <strong>{potentialNewCode}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateAndOpenStock(potentialNewCode)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold shadow-md transition flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>一键载入并查看档案</span>
                    </button>
                  </div>
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
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition"
                >
                  重置为全部行业
                </button>
              )}
            </div>
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
