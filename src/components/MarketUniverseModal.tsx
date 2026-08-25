import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, PieChart, Layers, Search, Sparkles, ArrowUpRight, 
  ShieldCheck, TrendingUp, CheckCircle2, Award, Landmark, 
  BarChart3, Plus, Flame, Filter, HelpCircle, Database, Check, Loader2
} from 'lucide-react';
import { Stock, FilterCriteria } from '../types';
import { getStockBoard } from '../utils/calculator';
import { searchAllAShares, fetchOrBuildStock, SearchResultItem } from '../utils/stockSearchService';

interface MarketUniverseModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStocks: Stock[];
  filteredCount: number;
  onSelectStock: (stock: Stock) => void;
  onAddCustomStock: (stocks: Stock[]) => void;
  onApplyCriteria?: (criteria: Partial<FilterCriteria>) => void;
}

// 5652 支股票的宏观板块分布数据
const MARKET_DISTRIBUTION = [
  { 
    board: '沪市主板', 
    codePrefix: '600 / 601 / 603 / 605', 
    count: 1692, 
    ratio: 29.9, 
    color: 'bg-rose-500', 
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    desc: '大盘央国企、能源煤炭、国有大行、公用事业高股息绝对集中地' 
  },
  { 
    board: '深市主板', 
    codePrefix: '000 / 001 / 002 / 003', 
    count: 1515, 
    ratio: 26.8, 
    color: 'bg-indigo-500', 
    textColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    desc: '优质白电龙头、消费制造、基础化工、股份制银行主力' 
  },
  { 
    board: '创业板', 
    codePrefix: '300 / 301', 
    count: 1358, 
    ratio: 24.0, 
    color: 'bg-amber-500', 
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    desc: '新能源、高端装备、医疗器械与成长创新型企业' 
  },
  { 
    board: '科创板', 
    codePrefix: '688', 
    count: 575, 
    ratio: 10.2, 
    color: 'bg-emerald-500', 
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    desc: '半导体集成电路、生物医药、工业软件与硬科技' 
  },
  { 
    board: '北交所', 
    codePrefix: '8 / 4 / 920', 
    count: 262, 
    ratio: 4.6, 
    color: 'bg-purple-500', 
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    desc: '服务创新型专精特新中小企业' 
  }
];

// 大A 5652 支股票分红金字塔分布
const DIVIDEND_PYRAMID = [
  {
    tier: '特高股息黄金池',
    yieldRange: '股息率 ≥ 5.0%',
    stockCount: 158,
    percentage: 2.8,
    color: 'from-rose-500 to-rose-600',
    bgBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    features: '煤炭、央企石化、大行、公路港口，现金流极其充沛，高股息核心压舱石'
  },
  {
    tier: '稳健高股息池',
    yieldRange: '3.0% ≤ 股息率 < 5.0%',
    stockCount: 386,
    percentage: 6.8,
    color: 'from-amber-500 to-orange-500',
    bgBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    features: '家电白马、公用事业水力发电、铁路运输、优质消费与化工龙头'
  },
  {
    tier: '常态分红区间',
    yieldRange: '1.0% ≤ 股息率 < 3.0%',
    stockCount: 1820,
    percentage: 32.2,
    color: 'from-indigo-500 to-blue-500',
    bgBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    features: '多数稳健运营的制造业与科技白马，常规年份实施年度分红'
  },
  {
    tier: '低分红与象征性分红',
    yieldRange: '0.1% ≤ 股息率 < 1.0%',
    stockCount: 1246,
    percentage: 22.0,
    color: 'from-slate-600 to-slate-700',
    bgBadge: 'bg-slate-700 text-slate-300 border-slate-600',
    features: '再投资扩张期企业或盈利较薄微利企业'
  },
  {
    tier: '零分红 / 亏损 / 铁公鸡 / ST',
    yieldRange: '股息率 0% 或未分红',
    stockCount: 2042,
    percentage: 36.1,
    color: 'from-slate-800 to-slate-900',
    bgBadge: 'bg-slate-800 text-slate-500 border-slate-700',
    features: '尚未盈利、亏损、重组或长期不实施现金分红的标的（筛选器默认自动排除）'
  }
];

export const MarketUniverseModal: React.FC<MarketUniverseModalProps> = ({
  isOpen,
  onClose,
  allStocks,
  filteredCount,
  onSelectStock,
  onAddCustomStock,
  onApplyCriteria
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'lookup' | 'baskets'>('overview');
  const [searchCode, setSearchCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [smartResults, setSmartResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSelectedStock, setActiveSelectedStock] = useState<Stock | null>(null);
  const [isLoadingActiveStock, setIsLoadingActiveStock] = useState(false);

  // 侦听搜索词变化，进行全 A 股 5000+ 智能检索
  useEffect(() => {
    const q = searchCode.trim();
    if (!q) {
      setSmartResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchAllAShares(q, allStocks);
        setSmartResults(res);
        // 如果搜出来有第一项且还没选，默认加载第一项作为预览
        if (res.length > 0) {
          const first = res[0];
          if (first.stock) {
            setActiveSelectedStock(first.stock);
          } else {
            const dynamicStock = await fetchOrBuildStock(first.code, first.name);
            setActiveSelectedStock(dynamicStock);
          }
        }
      } catch (err) {
        console.error('Error searching in universe modal:', err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchCode, allStocks]);

  if (!isOpen) return null;

  const handleOpenStock = (stock: Stock) => {
    onAddCustomStock([stock]);
    onSelectStock(stock);
    onClose();
  };

  const handleSelectResultItem = async (item: SearchResultItem) => {
    setIsLoadingActiveStock(true);
    try {
      let target: Stock;
      if (item.stock) {
        target = item.stock;
      } else {
        target = await fetchOrBuildStock(item.code, item.name);
      }
      setActiveSelectedStock(target);
    } catch (err) {
      console.error('Failed to load item:', err);
    } finally {
      setIsLoadingActiveStock(false);
    }
  };

  const handleApplyBoardFilter = (boardName: string) => {
    if (onApplyCriteria) {
      onApplyCriteria({
        selectedBoards: [boardName],
        searchQuery: ''
      });
      onClose();
    }
  };

  const handleApplyAllMarket = () => {
    if (onApplyCriteria) {
      onApplyCriteria({
        selectedBoards: [],
        minDividendYield: 3.0,
        maxPE: 20,
        searchQuery: ''
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-950/50">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                  大A全市场 5,652 支股票全景透析
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                  全域无缝检索覆盖
                </span>
              </div>
              <p className="text-xs text-slate-400">
                涵盖沪深主板、创业板、科创板与北交所全部 5,652 家上市公司分红生态
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 border-b border-slate-800 bg-slate-900/60 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>5652支宏观结构与分红金字塔</span>
          </button>

          <button
            onClick={() => setActiveTab('lookup')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'lookup'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>全域 6 位代码即时穿透查询</span>
          </button>

          <button
            onClick={() => setActiveTab('baskets')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'baskets'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>主流高息指数一键载入</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* TAB 1: 5652支宏观结构与分红金字塔 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* 核心数字看板 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <div className="text-slate-400 text-xs flex items-center gap-1 mb-1">
                    <Database className="w-3.5 h-3.5 text-rose-400" />
                    <span>大A上市公司总数</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-100 font-mono">5,652</span>
                    <span className="text-xs text-slate-400">家</span>
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <div className="text-slate-400 text-xs flex items-center gap-1 mb-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>股息率≥3%高息股</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-amber-400 font-mono">544</span>
                    <span className="text-xs text-slate-400">家 (占 9.6%)</span>
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <div className="text-slate-400 text-xs flex items-center gap-1 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>当前选出标的数</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-emerald-400 font-mono">{filteredCount}</span>
                    <span className="text-xs text-slate-400">只核心资产</span>
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <div className="text-slate-400 text-xs flex items-center gap-1 mb-1">
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                    <span>全市场分红覆盖</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-indigo-400 font-mono">100%</span>
                    <span className="text-xs text-slate-400">全域支持</span>
                  </div>
                </div>
              </div>

              {/* 5652 支股票板块分布 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-rose-400" />
                    <span>各大交易所与板块分布 (总计 5,652 支)</span>
                  </h3>
                  <span className="text-xs text-slate-400">点击板块快速应用单板块筛选</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MARKET_DISTRIBUTION.map((item) => (
                    <div 
                      key={item.board}
                      onClick={() => handleApplyBoardFilter(item.board)}
                      className="bg-slate-850 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 rounded-xl p-3.5 transition cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                          <span className="text-sm font-bold text-slate-100 group-hover:text-rose-300 transition">
                            {item.board}
                          </span>
                        </div>
                        <span className={`text-xs font-mono font-bold ${item.textColor}`}>
                          {item.count} 支 ({item.ratio}%)
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mb-1.5">
                        代码前缀: {item.codePrefix}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* A股 5652 支股票分红金字塔生态 */}
              <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-amber-400" />
                      <span>大A 5652 支股票「分红金字塔」分布透视</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      揭示为何高股息筛选器是穿越牛熊的「沙里淘金」神兵利器
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {DIVIDEND_PYRAMID.map((tier, idx) => (
                    <div key={tier.tier} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center font-mono">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-200 text-xs">{tier.tier}</span>
                          <span className={`text-[10px] px-2 py-0.2 rounded border font-mono font-semibold ${tier.bgBadge}`}>
                            {tier.yieldRange}
                          </span>
                        </div>
                        <div className="text-xs font-mono flex items-center gap-2">
                          <span className="text-slate-300 font-bold">{tier.stockCount} 支标的</span>
                          <span className="text-slate-500">/ 占比 {tier.percentage}%</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-1.5">
                        <div 
                          className={`h-full bg-gradient-to-r ${tier.color} rounded-full`}
                          style={{ width: `${tier.percentage * 2.5}%` }}
                        ></div>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {tier.features}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-gradient-to-r from-rose-950/30 to-amber-950/30 border border-rose-500/20 rounded-lg flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <strong>量化投资结论：</strong> 在全市场 5,652 支股票中，超过 36% 的标的无分红或常年亏损，而<strong>股息率 ≥ 3% 且 PE ≤ 20 的高股息优质白马仅占全市场的 9.6% 左右</strong>。本筛选器正是通过高股息、低市盈率与 ROE 护城河多维模型，精准锁定这 9.6% 最具确定性的核心资产。
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: 全域 5,652 支标的秒级穿透查询 */}
          {activeTab === 'lookup' && (
            <div className="space-y-5">
              <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-rose-400" />
                    <span>输入名称 / 拼音首字母 / 6位代码 (覆盖 5,652 支全A股票)</span>
                  </span>
                  {isSearching && (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> 全网智能检索中...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="如 赤天化, 宝泰隆, 陕西黑猫, 同仁堂, 大族激光, cth, 600519..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                    autoFocus
                  />
                  {searchCode && (
                    <button
                      onClick={() => setSearchCode('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-400">
                  <span className="text-slate-500 font-medium">快速查询示例:</span>
                  {[
                    { code: '600227', name: '赤天化' },
                    { code: '601011', name: '宝泰隆' },
                    { code: '601015', name: '陕西黑猫' },
                    { code: '600085', name: '同仁堂' },
                    { code: '002008', name: '大族激光' },
                    { code: '600519', name: '贵州茅台' },
                    { code: '601088', name: '中国神华' },
                    { code: '600900', name: '长江电力' }
                  ].map((item) => (
                    <button
                      key={item.code}
                      onClick={() => setSearchCode(item.name)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                    >
                      {item.name} <span className="font-mono text-slate-500">({item.code})</span>
                    </button>
                  ))}
                </div>

                {/* 候选列表 (若有多个匹配) */}
                {smartResults.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500">匹配到 {smartResults.length} 只标的:</span>
                    {smartResults.slice(0, 8).map((r) => (
                      <button
                        key={r.code}
                        onClick={() => handleSelectResultItem(r)}
                        className={`text-xs px-2 py-1 rounded transition flex items-center gap-1 border ${
                          activeSelectedStock?.code === r.code
                            ? 'bg-rose-600 text-white border-rose-500 font-bold'
                            : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                        }`}
                      >
                        <span className="font-mono">{r.code}</span>
                        <span>{r.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 查询结果卡片 */}
              {isLoadingActiveStock ? (
                <div className="p-8 text-center bg-slate-850 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
                  <span>正在穿透获取实时最新股价与股息财务模型...</span>
                </div>
              ) : activeSelectedStock ? (
                <div className="bg-slate-850 border border-rose-500/40 rounded-xl p-5 shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-mono">
                        <span className="text-xs text-slate-400">{activeSelectedStock.market}</span>
                        <span className="text-sm font-black text-rose-400">{activeSelectedStock.code}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-slate-100">{activeSelectedStock.name}</h4>
                          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                            {activeSelectedStock.industry}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                            {getStockBoard(activeSelectedStock.code)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {activeSelectedStock.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenStock(activeSelectedStock)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <span>打开完整分红档案</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 核心指标展示 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400 text-[11px] mb-0.5">最新股价</div>
                      <div className="text-base font-black text-slate-100 font-mono">¥{activeSelectedStock.price.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-rose-400 text-[11px] mb-0.5">滚动股息率 (TTM)</div>
                      <div className="text-base font-black text-rose-400 font-mono">{activeSelectedStock.ttmDividendYield.toFixed(2)}%</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-indigo-400 text-[11px] mb-0.5">市盈率 PE / PB</div>
                      <div className="text-base font-black text-slate-200 font-mono">
                        {activeSelectedStock.pe > 0 ? activeSelectedStock.pe.toFixed(1) : '-'} / {activeSelectedStock.pb > 0 ? activeSelectedStock.pb.toFixed(2) : '-'}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-amber-400 text-[11px] mb-0.5">连续分红年限</div>
                      <div className="text-base font-black text-amber-400 font-mono">{activeSelectedStock.dividendYears} 年</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-lg text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                    <span className="line-clamp-1">分红优势：{activeSelectedStock.dividendAdvantage}</span>
                    <button
                      onClick={() => {
                        onAddCustomStock([activeSelectedStock]);
                        setCopiedCode(activeSelectedStock.code);
                        setTimeout(() => setCopiedCode(null), 2000);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700 flex items-center gap-1 shrink-0 ml-2"
                    >
                      {copiedCode === activeSelectedStock.code ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">已载入池</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 text-slate-400" />
                          <span>载入股票池</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : searchCode.trim() !== '' ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-slate-850 rounded-xl border border-slate-800">
                  {isSearching ? '正在全网穿透检索中...' : '未搜到对应 A 股股票，请输入有效股票名称、拼音首字母或 6 位代码'}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: 主流高息指数一键载入 */}
          {activeTab === 'baskets' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                可一键应用权威高股息指数样本篮子，快速对比大A最具代表性的核心分红组合：
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. 中证红利指数 */}
                <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <Award className="w-4 h-4 text-rose-400" />
                        <span>中证红利指数 (000922)</span>
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                        100 只样本
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      选取大A全市场过去三年现金股息率高、分红稳定且流动性好的 100 只上市公司，是国内历史最悠久的红利旗舰。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onApplyCriteria) {
                        onApplyCriteria({
                          minDividendYield: 4.0,
                          maxPE: 15,
                          excludeST: true,
                          minDividendYears: 5
                        });
                        onClose();
                      }
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>一键应用「中证红利」筛选策略</span>
                  </button>
                </div>

                {/* 2. 央企红利 50 */}
                <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-indigo-400" />
                        <span>央企高股息精选 (央企红利50)</span>
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                        央国企龙头
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      聚焦国务院国资委控股的央企能源、通信、基建与银行标的，政策分红考核指引极强，现金分红确定性居市场前列。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onApplyCriteria) {
                        onApplyCriteria({
                          minDividendYield: 3.5,
                          maxPE: 12,
                          excludeST: true,
                          minMarketCap: 300,
                          minDividendYears: 5
                        });
                        onClose();
                      }
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>一键应用「央企红利」筛选策略</span>
                  </button>
                </div>

                {/* 3. 红利低波 100 */}
                <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>红利低波 100 指数</span>
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        Smart Beta
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      高股息 + 低波动率双因子驱动，历史回撤极低，适合防御型长期价值投资与养老现金流配置。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onApplyCriteria) {
                        onApplyCriteria({
                          minDividendYield: 3.5,
                          maxPE: 16,
                          excludeST: true,
                          minROE: 8
                        });
                        onClose();
                      }
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>一键应用「红利低波」策略</span>
                  </button>
                </div>

                {/* 4. 沪深300 高息标的 */}
                <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <span>沪深 300 大盘高股息</span>
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        大盘蓝筹
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      从沪深 300 核心大市值成分股中，筛选股息率高于 3% 的超级白马龙头，流动性与抗风险能力极强。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onApplyCriteria) {
                        onApplyCriteria({
                          minDividendYield: 3.0,
                          maxPE: 20,
                          excludeST: true,
                          minMarketCap: 500
                        });
                        onClose();
                      }
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>一键应用「沪深300高息」策略</span>
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>当前筛选池: <strong className="text-slate-200">{filteredCount}</strong> 支</span>
            <span className="text-slate-600">|</span>
            <span>大A全市场: <strong className="text-rose-400 font-mono">5,652</strong> 支</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyAllMarket}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
            >
              重置全市场条件
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition"
            >
              完成查看
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
