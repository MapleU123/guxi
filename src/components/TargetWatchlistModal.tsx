import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Target, Sparkles, TrendingDown, ArrowUpRight, CheckCircle2, 
  Trash2, Plus, Download, RefreshCw, AlertCircle, HelpCircle, 
  SlidersHorizontal, Check, Search, Filter, ShieldCheck, PieChart,
  ArrowDown, ArrowUp, DollarSign, Image as ImageIcon, ChevronRight,
  Layers, BookmarkPlus, CheckCheck, RotateCcw, ListFilter, Sparkle
} from 'lucide-react';
import { Stock, TargetDividendWatchItem, TargetDividendCalculatedStock, FilterCriteria } from '../types';
import { calculateTargetDividendProfile } from '../utils/calculator';
import { searchAllAShares, fetchOrBuildStock, SearchResultItem } from '../utils/stockSearchService';
import { AvatarStyle, getSuggestedStrategyTitle } from '../utils/exportImage';
import { ExportTargetWatchlistImageModal } from './ExportTargetWatchlistImageModal';
import * as XLSX from 'xlsx';

export const DEFAULT_TARGET_WATCHLIST: TargetDividendWatchItem[] = [
  { code: '601088', targetYield: 7.5, customNote: '煤炭高分红现金牛，理想股息7.5%以上建仓' },
  { code: '600036', targetYield: 6.0, customNote: '零售银行龙头，目标6.0%股息率' },
  { code: '600900', targetYield: 4.0, customNote: '水电流域护城河，大水电资产注入' },
  { code: '000651', targetYield: 6.5, customNote: '白电龙头，高分红承诺' },
  { code: '601225', targetYield: 7.0, customNote: '动力煤龙头，超高股息率标的' },
  { code: '600519', targetYield: 3.5, customNote: '高端白酒龙头，股息率达3.5%时极具安全边际' },
  { code: '600085', targetYield: 3.0, customNote: '同仁堂国宝级老字号，目标股息3.0%' },
  { code: '601015', targetYield: 5.0, customNote: '陕西黑猫循环经济，目标股息5.0%' }
];

const STORAGE_KEY = 'a_share_dividend_target_watchlist_v1';

export function loadStoredTargetWatchlist(): TargetDividendWatchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load target watchlist from storage:', e);
  }
  return DEFAULT_TARGET_WATCHLIST;
}

export function saveStoredTargetWatchlist(items: TargetDividendWatchItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save target watchlist to storage:', e);
  }
}

interface TargetWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStocks: Stock[];
  filteredStocks?: Stock[];
  criteria?: FilterCriteria;
  watchItems: TargetDividendWatchItem[];
  onUpdateWatchItems: (items: TargetDividendWatchItem[]) => void;
  onSelectStock: (stock: Stock) => void;
  onTogglePortfolioStock?: (code: string) => void;
  portfolioStockCodes?: string[];
  onRefreshQuotes?: () => void;
  isRefreshing?: boolean;
  avatarStyle?: AvatarStyle;
  onAddCustomStock?: (stocks: Stock[]) => void;
}

export const TargetWatchlistModal: React.FC<TargetWatchlistModalProps> = ({
  isOpen,
  onClose,
  allStocks,
  filteredStocks = [],
  criteria,
  watchItems,
  onUpdateWatchItems,
  onSelectStock,
  onTogglePortfolioStock,
  portfolioStockCodes = [],
  onRefreshQuotes,
  isRefreshing = false,
  avatarStyle = 'whiteThreeSoldiers'
}) => {
  // Pool Mode: 'filtered' (当前PE/股息率筛选池) vs 'watchlist' (我的自选关注池)
  const [poolMode, setPoolMode] = useState<'filtered' | 'watchlist'>('filtered');

  // Search & Add new stock states (for watchlist mode)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newStockTargetYield, setNewStockTargetYield] = useState<number>(6.0);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedSearchStock, setSelectedSearchStock] = useState<Stock | null>(null);
  const [isAddingStock, setIsAddingStock] = useState<boolean>(false);

  // Filter & Sort in Watchlist
  const [statusFilter, setStatusFilter] = useState<'all' | 'reached' | 'close' | 'moderate' | 'deep'>('all');
  const [sortBy, setSortBy] = useState<'dropNeededAsc' | 'dropNeededDesc' | 'targetYieldDesc' | 'currentYieldDesc' | 'code'>('dropNeededAsc');
  const [batchYieldInput, setBatchYieldInput] = useState<string>('');
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [isExportImageOpen, setIsExportImageOpen] = useState<boolean>(false);

  // Local override yield map for filtered pool items
  const [filteredCustomYields, setFilteredCustomYields] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // If filtered stocks exist when opened, default to 'filtered' mode
  useEffect(() => {
    if (isOpen) {
      if (filteredStocks.length > 0) {
        setPoolMode('filtered');
      } else {
        setPoolMode('watchlist');
      }
    }
  }, [isOpen, filteredStocks.length]);

  // 推导当前筛选池对应的策略标题
  const strategyInfo = useMemo(() => {
    return getSuggestedStrategyTitle(criteria);
  }, [criteria]);

  // 智能检索匹配全 A 股 5652 支股票
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      setSelectedSearchStock(null);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAllAShares(q, allStocks);
        setSearchResults(results);
        if (results.length > 0 && !selectedSearchStock) {
          const first = results[0];
          if (first.stock) {
            setSelectedSearchStock(first.stock);
          } else {
            const loaded = await fetchOrBuildStock(first.code, first.name);
            setSelectedSearchStock(loaded);
          }
        }
      } catch (err) {
        console.error('Error searching in target watchlist:', err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, allStocks]);

  // 1. 计算【当前筛选池】标的的详细测算数据
  const calculatedFilteredItems: TargetDividendCalculatedStock[] = useMemo(() => {
    if (!Array.isArray(filteredStocks) || filteredStocks.length === 0) return [];

    return filteredStocks.map((stock) => {
      // 优先取本地调整的自定义理想股息率，其次取自选池已保存的理想股息率，最后取根据现股息率推导的默认值
      let targetYield = filteredCustomYields[stock.code];
      if (targetYield === undefined) {
        const savedWatch = watchItems.find((w) => w.code === stock.code);
        if (savedWatch) {
          targetYield = savedWatch.targetYield ?? savedWatch.targetDividendYield ?? 6.0;
        } else {
          // 智能默认理想股息率：现行股息率上浮 10% 或最低 5.0%
          targetYield = stock.ttmDividendYield > 0
            ? Math.max(5.0, Number((stock.ttmDividendYield * 1.1).toFixed(1)))
            : 6.0;
        }
      }

      return calculateTargetDividendProfile(stock, targetYield);
    });
  }, [filteredStocks, filteredCustomYields, watchItems]);

  // 2. 计算【自选关注池】标的的详细测算数据
  const calculatedWatchlistItems: TargetDividendCalculatedStock[] = useMemo(() => {
    if (!Array.isArray(watchItems)) return [];
    return watchItems.filter(item => Boolean(item && item.code)).map((item) => {
      const existingStock = allStocks.find((s) => s.code === item.code);
      const safeYield = item.targetYield ?? item.targetDividendYield ?? 5.0;
      if (existingStock) {
        return calculateTargetDividendProfile(existingStock, safeYield);
      }

      // 如果全量池中未加载，兜底生成
      const fallbackStock: Stock = {
        code: item.code,
        name: item.name || item.code,
        pinyin: '',
        industry: '综合',
        market: item.code.startsWith('6') ? 'SH' : item.code.startsWith('8') ? 'BJ' : 'SZ',
        price: 10.0,
        change: 0,
        changePercent: 0,
        prevClose: 10.0,
        lastYearDividendPerShare: 0.5,
        ttmDividendPerShare: 0.5,
        staticDividendYield: 5.0,
        ttmDividendYield: 5.0,
        dividendYears: 5,
        payoutRatio: 40,
        dividendCycle: '年度分红',
        pe: 10,
        pb: 1.2,
        marketCap: 100,
        roe: 12,
        revGrowth: 5,
        netProfitGrowth: 5,
        isST: false,
        isDelisted: false,
        isLeader: false,
        isAristocrat: false,
        description: '',
        dividendAdvantage: '',
        history: [],
        quarterly: [],
        updateTime: '15:00:00'
      };

      return calculateTargetDividendProfile(fallbackStock, safeYield);
    });
  }, [watchItems, allStocks]);

  // 当前激活的数据集
  const calculatedItems = poolMode === 'filtered' ? calculatedFilteredItems : calculatedWatchlistItems;

  // 统计概览指标
  const summaryStats = useMemo(() => {
    const total = calculatedItems.length;
    if (total === 0) {
      return {
        total: 0,
        reachedCount: 0,
        closeCount: 0,
        avgTargetYield: 0,
        avgCurrentYield: 0,
        avgDropNeeded: 0
      };
    }

    const reachedCount = calculatedItems.filter((c) => c.isReached).length;
    const closeCount = calculatedItems.filter((c) => !c.isReached && c.dropNeededPercent >= -5.0).length;
    const avgTargetYield = calculatedItems.reduce((acc, c) => acc + c.targetYield, 0) / total;
    const avgCurrentYield = calculatedItems.reduce((acc, c) => acc + c.currentYield, 0) / total;
    const avgDropNeeded = calculatedItems.reduce((acc, c) => acc + c.dropNeededPercent, 0) / total;

    return {
      total,
      reachedCount,
      closeCount,
      avgTargetYield,
      avgCurrentYield,
      avgDropNeeded
    };
  }, [calculatedItems]);

  // 筛选与排序后的备选列表
  const displayedItems = useMemo(() => {
    let list = calculatedItems;

    // 状态过滤
    if (statusFilter !== 'all') {
      list = list.filter((item) => item.status === statusFilter);
    }

    // 排序
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'dropNeededAsc':
          return b.dropNeededPercent - a.dropNeededPercent;
        case 'dropNeededDesc':
          return a.dropNeededPercent - b.dropNeededPercent;
        case 'targetYieldDesc':
          return b.targetYield - a.targetYield;
        case 'currentYieldDesc':
          return b.currentYield - a.currentYield;
        case 'code':
          return a.stock.code.localeCompare(b.stock.code);
        default:
          return 0;
      }
    });
  }, [calculatedItems, statusFilter, sortBy]);

  // 更新单个标的的理想股息率
  const handleUpdateTargetYield = (code: string, newYield: number) => {
    const safeYield = Math.max(0.1, Number(newYield.toFixed(2)));

    if (poolMode === 'filtered') {
      setFilteredCustomYields((prev) => ({ ...prev, [code]: safeYield }));
    } else {
      const updated = watchItems.map((item) => 
        item.code === code ? { ...item, targetYield: safeYield, targetDividendYield: safeYield } : item
      );
      onUpdateWatchItems(updated);
      saveStoredTargetWatchlist(updated);
    }
  };

  // 移出自选备选池
  const handleRemoveWatchItem = (code: string) => {
    const updated = watchItems.filter((item) => item.code !== code);
    onUpdateWatchItems(updated);
    saveStoredTargetWatchlist(updated);
    showToast(`已从自选关注池移出标的 (${code})`);
  };

  // 添加新标的到自选备选池
  const handleAddStockToWatchlist = async (stockItem: SearchResultItem | Stock) => {
    setIsAddingStock(true);
    try {
      const code = stockItem.code;
      if (watchItems.some((w) => w.code === code)) {
        setSearchQuery('');
        setSelectedSearchStock(null);
        showToast(`标的 ${stockItem.name || code} 已在自选池中`);
        return;
      }

      let stockToAdd: Stock;
      if ('lastYearDividendPerShare' in stockItem) {
        stockToAdd = stockItem;
      } else {
        stockToAdd = await fetchOrBuildStock(stockItem.code, stockItem.name);
      }

      const defaultYield = Number(newStockTargetYield) || (stockToAdd.ttmDividendYield > 0 ? Number((stockToAdd.ttmDividendYield + 1.0).toFixed(1)) : 6.0);
      const newItem: TargetDividendWatchItem = {
        code: stockToAdd.code,
        name: stockToAdd.name,
        targetYield: defaultYield,
        targetDividendYield: defaultYield,
        customNote: `自设理想股息率 ${defaultYield}%`,
        notes: `自设理想股息率 ${defaultYield}%`,
        addedAt: new Date().toLocaleDateString()
      };

      const updated = [newItem, ...watchItems];
      onUpdateWatchItems(updated);
      saveStoredTargetWatchlist(updated);

      setSearchQuery('');
      setSelectedSearchStock(null);
      showToast(`成功将 ${stockToAdd.name} 加入自选备选池 (目标股息率 ${defaultYield}%)`);
    } catch (err) {
      console.error('Failed to add stock to watchlist:', err);
    } finally {
      setIsAddingStock(false);
    }
  };

  // 一键将【当前筛选池】所有标的批量加入【我的自选关注池】
  const handleSaveAllFilteredToWatchlist = () => {
    if (calculatedFilteredItems.length === 0) return;

    let addedCount = 0;
    const currentCodes = new Set(watchItems.map((w) => w.code));
    const newItems: TargetDividendWatchItem[] = [];

    calculatedFilteredItems.forEach((calcItem) => {
      if (!currentCodes.has(calcItem.stock.code)) {
        newItems.push({
          code: calcItem.stock.code,
          name: calcItem.stock.name,
          targetYield: calcItem.targetYield,
          targetDividendYield: calcItem.targetYield,
          customNote: `从【${strategyInfo.title}】筛选池导入`,
          notes: `从【${strategyInfo.title}】筛选池导入`,
          addedAt: new Date().toLocaleDateString()
        });
        addedCount++;
      }
    });

    const updated = [...newItems, ...watchItems];
    onUpdateWatchItems(updated);
    saveStoredTargetWatchlist(updated);
    showToast(`🎉 成功将当前筛选的 ${newItems.length} 只标的存入自选关注池！`);
  };

  // 一键批量设置所有标的理想股息率
  const handleApplyBatchTargetYield = (yieldValue: number) => {
    if (yieldValue <= 0) return;

    if (poolMode === 'filtered') {
      const newMap: Record<string, number> = {};
      filteredStocks.forEach((s) => {
        newMap[s.code] = yieldValue;
      });
      setFilteredCustomYields(newMap);
      showToast(`已将当前筛选池全部标的理想股息率统一设为 ${yieldValue}%`);
    } else {
      const updated = watchItems.map((item) => ({ ...item, targetYield: yieldValue, targetDividendYield: yieldValue }));
      onUpdateWatchItems(updated);
      saveStoredTargetWatchlist(updated);
      showToast(`已将自选池全部标的理想股息率统一设为 ${yieldValue}%`);
    }
    setShowBatchModal(false);
  };

  // 恢复默认备选池
  const handleResetToDefault = () => {
    onUpdateWatchItems(DEFAULT_TARGET_WATCHLIST);
    saveStoredTargetWatchlist(DEFAULT_TARGET_WATCHLIST);
    showToast('已恢复默认推荐备选池标的');
  };

  // 清空自选备选池
  const handleClearAll = () => {
    onUpdateWatchItems([]);
    saveStoredTargetWatchlist([]);
    showToast('已清空自选备选池');
  };

  // 导出备选池到 Excel
  const handleExportExcel = () => {
    if (calculatedItems.length === 0) return;

    const data = calculatedItems.map((c, idx) => ({
      '序号': idx + 1,
      '股票代码': c.stock.code,
      '股票简称': c.stock.name,
      '所属行业': c.stock.industry,
      '现价(元)': c.currentPrice.toFixed(2),
      '现行股息率TTM(%)': c.currentYield.toFixed(2) + '%',
      '每股分红基准(元)': c.dividendPerShare.toFixed(3),
      '理想目标股息率(%)': c.targetYield.toFixed(2) + '%',
      '目标买入价位(元)': c.targetPrice.toFixed(2),
      '距目标需跌幅度(%)': (c.isReached ? '0.00% (已达标)' : `${c.dropNeededPercent.toFixed(2)}%`),
      '差价(元)': c.diffPrice.toFixed(2),
      '状态': c.statusLabel,
      '目标价PE': c.targetPE > 0 ? c.targetPE.toFixed(1) : '-',
      '当前PE': c.stock.pe > 0 ? c.stock.pe.toFixed(1) : '-'
    }));

    const poolLabel = poolMode === 'filtered' ? strategyInfo.title : '我的自选关注备选池';
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '理想股息率备选池');
    XLSX.writeFile(workbook, `${poolLabel}_理想买入价测算_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Toast Notification Alert Bubble */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-in slide-in-from-top-3">
            <CheckCheck className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-rose-950/40">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                  理想股息率备选股票池
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  动态测算目标买入价与需跌空间
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  当前池共 {summaryStats.total} 只
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                设定您的理想股息率（如 6.0%），实时追踪当前价格与目标买入价位，清晰计算需要下跌多少才触发建仓时机。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshQuotes && (
              <button
                onClick={onRefreshQuotes}
                disabled={isRefreshing}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                title="刷新所有标的实时股价"
              >
                <RefreshCw className={`w-4 h-4 text-rose-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dual-Pool Source Switcher Tabs Bar */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          {/* Tab Buttons */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setPoolMode('filtered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                poolMode === 'filtered'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>🎯 当前筛选池标的 ({filteredStocks.length})</span>
              {poolMode === 'filtered' && (
                <span className="text-[10px] px-1.5 py-0.2 bg-rose-700/60 rounded font-normal">
                  已联动【{strategyInfo.title}】
                </span>
              )}
            </button>

            <button
              onClick={() => setPoolMode('watchlist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                poolMode === 'watchlist'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>⭐ 我的自选关注池 ({watchItems.length})</span>
            </button>
          </div>

          {/* Quick Action Buttons for Current Mode */}
          <div className="flex items-center gap-2">
            {poolMode === 'filtered' ? (
              <button
                onClick={handleSaveAllFilteredToWatchlist}
                disabled={filteredStocks.length === 0}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 border border-emerald-500/30 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                title="一键将当前通过PE、股息率筛选的全部股票保存至持久化自选池"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>一键保存当前筛选的 {filteredStocks.length} 只到自选池</span>
              </button>
            ) : (
              <button
                onClick={handleSaveAllFilteredToWatchlist}
                disabled={filteredStocks.length === 0}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>从当前筛选池导入 ({filteredStocks.length})</span>
              </button>
            )}
          </div>

        </div>

        {/* Top Summary Stats Cards */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3">
          
          {/* Card 1: 备选总数 */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400">
              {poolMode === 'filtered' ? '当前筛选标的总数' : '自选池标的总数'}
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-slate-100 font-mono">{summaryStats.total}</span>
              <span className="text-[11px] text-slate-500">只标的</span>
            </div>
          </div>

          {/* Card 2: 已进入买入区间 */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
            <div className="text-[11px] text-emerald-400 flex items-center justify-between">
              <span>🎯 已达标可买</span>
              <span className="text-[10px] text-emerald-400/70 font-mono">现价≤目标价</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-emerald-400 font-mono">{summaryStats.reachedCount}</span>
              <span className="text-[11px] text-emerald-500">只已满足</span>
            </div>
          </div>

          {/* Card 3: 临界关注 (差<5%) */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-orange-500/30 flex flex-col justify-between">
            <div className="text-[11px] text-orange-400 flex items-center justify-between">
              <span>⚠️ 临界关注</span>
              <span className="text-[10px] text-orange-400/70 font-mono">差&lt;5%即达标</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-orange-400 font-mono">{summaryStats.closeCount}</span>
              <span className="text-[11px] text-orange-500">只逼近中</span>
            </div>
          </div>

          {/* Card 4: 平均理想股息率 */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] text-rose-400">平均目标股息率</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-rose-400 font-mono">{summaryStats.avgTargetYield.toFixed(2)}%</span>
              <span className="text-[10px] text-slate-500">现行 {summaryStats.avgCurrentYield.toFixed(1)}%</span>
            </div>
          </div>

          {/* Card 5: 平均需跌幅度 */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
            <div className="text-[11px] text-emerald-400">平均需跌空间</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-emerald-400 font-mono">
                {summaryStats.avgDropNeeded <= 0 ? `${summaryStats.avgDropNeeded.toFixed(1)}%` : `+${summaryStats.avgDropNeeded.toFixed(1)}%`}
              </span>
              <span className="text-[10px] text-slate-500">至目标价</span>
            </div>
          </div>

        </div>

        {/* Toolbar: Search Add & Batch Controls */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Quick Search & Add Box (Only in Watchlist mode, or as search bar) */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md relative">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索全A股 5652 支股票添加 (如 赤天化, 601088, 神华)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Target Yield Input for New Stock */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
              <span className="text-slate-400 text-[11px]">新标目标:</span>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="30"
                value={newStockTargetYield}
                onChange={(e) => setNewStockTargetYield(Number(e.target.value))}
                className="w-10 bg-transparent text-rose-400 font-mono font-bold text-xs focus:outline-none text-center"
              />
              <span className="text-rose-400 font-bold text-xs">%</span>
            </div>

            {/* Live Search Autocomplete Popover */}
            {searchQuery.trim() !== '' && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-800/90 text-[10px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>点击将标的加入自选池 (设定理想股息率 {newStockTargetYield}%)</span>
                  <span className="text-slate-500">{searchResults.length} 条</span>
                </div>
                {searchResults.map((res) => {
                  const alreadyInWatchlist = watchItems.some((w) => w.code === res.code);
                  return (
                    <div
                      key={res.code}
                      onClick={() => handleAddStockToWatchlist(res)}
                      className="px-3 py-2 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition group text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 font-mono">{res.code}</span>
                        <span className="font-semibold text-slate-200">{res.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded border border-slate-700">
                          {res.market}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {alreadyInWatchlist ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> 已在自选池
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 group-hover:text-rose-300 font-medium flex items-center gap-0.5">
                            <Plus className="w-3 h-3" /> 加入自选池
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Status Filter Buttons */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded transition ${
                  statusFilter === 'all' ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                全部 ({calculatedItems.length})
              </button>
              <button
                onClick={() => setStatusFilter('reached')}
                className={`px-2 py-1 rounded transition flex items-center gap-1 ${
                  statusFilter === 'reached' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <span>🎯 已达标</span>
                <span className="text-[10px] font-mono">({summaryStats.reachedCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('close')}
                className={`px-2 py-1 rounded transition flex items-center gap-1 ${
                  statusFilter === 'close' ? 'bg-orange-500/20 text-orange-300 font-semibold' : 'text-slate-400 hover:text-orange-400'
                }`}
              >
                <span>⚠️ 临界</span>
                <span className="text-[10px] font-mono">({summaryStats.closeCount})</span>
              </button>
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs border border-slate-700 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="dropNeededAsc">需跌空间从小到大 (最接近买入优先)</option>
              <option value="dropNeededDesc">需跌空间从大到小</option>
              <option value="targetYieldDesc">理想股息率从高到低</option>
              <option value="currentYieldDesc">现行股息率从高到低</option>
              <option value="code">按代码排序</option>
            </select>

            {/* Batch Yield Preset Button */}
            <button
              onClick={() => setShowBatchModal(!showBatchModal)}
              className={`px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1 font-semibold ${
                showBatchModal
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
              title="一键批量调整所有标的的理想股息率"
            >
              <SlidersHorizontal className="w-3 h-3 text-rose-400" />
              <span>批量设股息率</span>
            </button>

            {/* Image Export Button */}
            <button
              onClick={() => setIsExportImageOpen(true)}
              disabled={calculatedItems.length === 0}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-600/20 via-amber-600/20 to-emerald-600/20 hover:from-rose-600/30 hover:via-amber-600/30 hover:to-emerald-600/30 text-amber-300 border border-amber-500/40 transition flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="将备选股票池高清渲染为图片并带专属水印导出"
            >
              <ImageIcon className="w-3 h-3 text-amber-400" />
              <span>导出图片</span>
            </button>

          </div>
        </div>

        {/* Batch Yield Preset Dropdown Modal / Ribbon */}
        {showBatchModal && (
          <div className="p-3 bg-gradient-to-r from-slate-900 to-indigo-950/60 border-b border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">
                一键批量设置【{poolMode === 'filtered' ? '当前筛选池' : '自选池'}】所有标的的理想目标股息率:
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: '4.5% 稳健底仓', value: 4.5 },
                { label: '5.0% 标杆红利', value: 5.0 },
                { label: '6.0% 黄金高股息', value: 6.0 },
                { label: '7.0% 深度价值', value: 7.0 },
                { label: '8.0% 极致安全垫', value: 8.0 }
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleApplyBatchTargetYield(p.value)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 transition"
                >
                  {p.label}
                </button>
              ))}

              <div className="flex items-center gap-1 ml-2 bg-slate-900 border border-slate-700 rounded px-2 py-0.5">
                <input
                  type="number"
                  step="0.1"
                  placeholder="自定义%"
                  value={batchYieldInput}
                  onChange={(e) => setBatchYieldInput(e.target.value)}
                  className="w-14 bg-transparent text-rose-300 font-mono text-xs focus:outline-none"
                />
                <button
                  onClick={() => {
                    const val = Number(batchYieldInput);
                    if (val > 0) handleApplyBatchTargetYield(val);
                  }}
                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                >
                  应用
                </button>
              </div>

              <button
                onClick={() => setShowBatchModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Watchlist Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {displayedItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Target className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-semibold text-slate-300 mb-1">
                {poolMode === 'filtered' ? '当前筛选条件下暂无符合的股票' : '自选关注池暂无标的'}
              </p>
              <p className="text-slate-500 mb-4">
                {poolMode === 'filtered'
                  ? '请在主界面调整 PE、股息率或行业筛选范围，或切换至【我的自选关注池】查看已保存标的。'
                  : '可在上方搜索框输入任意股票名称/代码加入，或从【当前筛选池】一键批量导入。'}
              </p>
              {poolMode === 'watchlist' && (
                <button
                  onClick={handleResetToDefault}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-md"
                >
                  恢复默认典范高股息备选标的
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
              
              {/* Table Header Row */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none sticky top-0 z-10">
                <div className="col-span-3">股票名称 / 代码 / 行业</div>
                <div className="col-span-2 text-right">现价 / 现行股息率</div>
                <div className="col-span-2 text-center">理想目标股息率</div>
                <div className="col-span-2 text-right">目标买入价位</div>
                <div className="col-span-2 text-center">需跌百分比 / 状态</div>
                <div className="col-span-1 text-right">操作</div>
              </div>

              {/* Table Content Rows */}
              {displayedItems.map((item, index) => {
                const isPortfolio = portfolioStockCodes.includes(item.stock.code);
                const isInSavedWatchlist = watchItems.some((w) => w.code === item.stock.code);

                return (
                  <div
                    key={item.stock.code}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-800/60 transition group text-xs ${
                      item.isReached ? 'bg-emerald-950/15' : item.status === 'close' ? 'bg-orange-950/10' : ''
                    }`}
                  >
                    
                    {/* Column 1: 股票名称与代码 */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectStock(item.stock)}
                          className="font-bold text-slate-100 hover:text-rose-400 transition text-left flex items-center gap-1 group-hover:translate-x-0.5 duration-150"
                        >
                          <span>{item.stock.name}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                          {item.stock.code}
                        </span>
                        {isInSavedWatchlist && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            已自选
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span>{item.stock.industry}</span>
                        <span>•</span>
                        <span title="每股分红基准金额">每股派息 ¥{item.dividendPerShare.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Column 2: 现价与现行股息率 */}
                    <div className="col-span-2 text-right">
                      <div className="font-bold text-slate-100 font-mono text-sm">
                        ¥{item.currentPrice.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-rose-400 font-semibold mt-0.5">
                        现股息 {item.currentYield.toFixed(2)}%
                      </div>
                    </div>

                    {/* Column 3: 理想目标股息率 (支持在线直接修改) */}
                    <div className="col-span-2 flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 focus-within:border-rose-500 transition">
                        <button
                          onClick={() => handleUpdateTargetYield(item.stock.code, item.targetYield - 0.5)}
                          className="w-4 h-4 rounded text-slate-400 hover:text-rose-300 hover:bg-slate-850 flex items-center justify-center text-xs font-bold"
                          title="减少 0.5%"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="30"
                          value={item.targetYield}
                          onChange={(e) => handleUpdateTargetYield(item.stock.code, Number(e.target.value))}
                          className="w-12 bg-transparent text-center font-mono font-black text-rose-400 text-sm focus:outline-none"
                        />
                        <span className="text-rose-400 font-bold text-xs">%</span>
                        <button
                          onClick={() => handleUpdateTargetYield(item.stock.code, item.targetYield + 0.5)}
                          className="w-4 h-4 rounded text-slate-400 hover:text-rose-300 hover:bg-slate-850 flex items-center justify-center text-xs font-bold"
                          title="增加 0.5%"
                        >
                          +
                        </button>
                      </div>

                      {/* 快捷点选 */}
                      <div className="flex items-center gap-1 mt-1 text-[9px]">
                        {[5.0, 6.0, 7.0].map((y) => (
                          <button
                            key={y}
                            onClick={() => handleUpdateTargetYield(item.stock.code, y)}
                            className={`px-1 py-0.2 rounded border transition ${
                              item.targetYield === y 
                                ? 'bg-rose-600 text-white border-rose-500 font-bold' 
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {y}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column 4: 目标买入价位 */}
                    <div className="col-span-2 text-right">
                      <div className="font-black text-amber-400 font-mono text-base">
                        ¥{item.targetPrice.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        目标PE: <strong className="text-slate-300">{item.targetPE > 0 ? item.targetPE.toFixed(1) : '-'}</strong> 倍
                      </div>
                    </div>

                    {/* Column 5: 需跌百分比与状态 */}
                    <div className="col-span-2 flex flex-col items-center justify-center">
                      <div className="px-2.5 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        {item.isReached ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span className="text-emerald-400 font-bold font-mono">
                          {item.isReached ? '现价已达标' : `${item.dropNeededPercent.toFixed(1)}%`}
                        </span>
                      </div>

                      <div className="text-[10px] mt-1 flex items-center gap-1">
                        {item.isReached ? (
                          <span className="text-emerald-400 font-medium">满足 {item.targetYield}% 目标</span>
                        ) : (
                          <span className="text-emerald-400/80 font-mono">距买入差 ¥{item.diffPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    {/* Column 6: 操作 */}
                    <div className="col-span-1 flex items-center justify-end gap-1.5">
                      {onTogglePortfolioStock && (
                        <button
                          onClick={() => onTogglePortfolioStock(item.stock.code)}
                          className={`p-1.5 rounded-lg border transition ${
                            isPortfolio
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700'
                          }`}
                          title={isPortfolio ? '已在实盘组合中，点击移出' : '加入实盘配置组合'}
                        >
                          <PieChart className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {poolMode === 'watchlist' ? (
                        <button
                          onClick={() => handleRemoveWatchItem(item.stock.code)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                          title="从自选关注池移除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddStockToWatchlist(item.stock)}
                          className={`p-1.5 rounded-lg border transition ${
                            isInSavedWatchlist
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border-slate-700'
                          }`}
                          title={isInSavedWatchlist ? '已在自选关注池' : '加入自选关注池'}
                        >
                          {isInSavedWatchlist ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}

            </div>
          )}

          {/* Educational Calculation Formula & Value Principle Card */}
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <HelpCircle className="w-4 h-4 text-rose-400" />
                <span>目标买入价与需跌空间测算逻辑</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">格雷厄姆与巴菲特高股息安全边际模型</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px]">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-300 font-medium mb-1 font-mono">1. 目标买入价推导公式</div>
                <p className="text-slate-400">
                  <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded font-mono">目标买入价 = 每股分红 / (理想股息率 / 100)</code>
                </p>
                <p className="text-slate-500 mt-1">例如某股每股派息 2.00 元，目标股息率 6.0%，则目标买入价 = 2.00 / 0.06 = ¥33.33。</p>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-300 font-medium mb-1 font-mono">2. 需跌百分比计算</div>
                <p className="text-slate-400">
                  <code className="text-rose-400 bg-slate-950 px-1 py-0.5 rounded font-mono">需跌 % = (目标买入价 - 现价) / 现价 × 100%</code>
                </p>
                <p className="text-slate-500 mt-1">若现价为 ¥40.00，目标价为 ¥33.33，则需下跌 (33.33 - 40) / 40 = -16.7% 才触发建仓。</p>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-300 font-medium mb-1 font-mono">3. 红利投资实操心法</div>
                <p className="text-slate-400">
                  "买股票就是买公司未来分红现金流折现"。设定目标股息率等待好价格，不仅锁定超额股息，更能赚取估值均值修复的资本利得。
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {poolMode === 'watchlist' ? (
              <>
                <button
                  onClick={handleResetToDefault}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  恢复推荐标的
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition"
                >
                  清空自选池
                </button>
              </>
            ) : (
              <div className="text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>当前正在测算【{strategyInfo.title}】的全部 {filteredStocks.length} 只股票</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
            >
              关闭
            </button>
            <button
              onClick={() => setIsExportImageOpen(true)}
              disabled={calculatedItems.length === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-semibold transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="导出带防伪水印的高清图片清单"
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>导出图片清单</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold shadow-md shadow-rose-950/40 transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>导出Excel方案</span>
            </button>
          </div>
        </div>

      </div>

      {/* Export Target Watchlist Image Modal */}
      <ExportTargetWatchlistImageModal
        isOpen={isExportImageOpen}
        onClose={() => setIsExportImageOpen(false)}
        items={displayedItems.length > 0 ? displayedItems : calculatedItems}
        avatarStyle={avatarStyle}
        criteria={criteria}
        defaultTitle={
          poolMode === 'filtered'
            ? `${strategyInfo.title} · 理想目标买入价测算清单`
            : 'A股理想股息率备选股票池清单'
        }
      />
    </div>
  );
};
