import React, { useState } from 'react';
import { 
  Filter, Search, SlidersHorizontal, ChevronDown, ChevronUp, 
  HelpCircle, CheckSquare, Square, X, Layers, Check
} from 'lucide-react';
import { FilterCriteria, DividendYieldType, Stock } from '../types';
import { ALL_INDUSTRIES } from '../data/stocksData';

interface FilterPanelProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  allStocks: Stock[];
  filteredCount: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  criteria,
  onChange,
  allStocks,
  filteredCount
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showYieldTooltip, setShowYieldTooltip] = useState(false);

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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 mb-5 shadow-sm">
      
      {/* Top Row: Search & Core Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pb-4 border-b border-slate-800">
        
        {/* Search Input */}
        <div className="md:col-span-4 relative">
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-rose-400" />
            快速检索股票
          </label>
          <div className="relative">
            <input
              type="text"
              value={criteria.searchQuery}
              onChange={(e) => onChange({ ...criteria, searchQuery: e.target.value })}
              placeholder="输入代码 / 简称 / 拼音 (如 601088, 神华, ZSYH)"
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

      {/* Row 2: Industry Selector Bar */}
      <div className="pt-3 pb-2">
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
