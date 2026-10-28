import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Target, Sparkles, TrendingDown, ArrowUpRight, CheckCircle2, 
  Trash2, Plus, Download, RefreshCw, AlertCircle, HelpCircle, 
  SlidersHorizontal, Check, Search, Filter, ShieldCheck, PieChart,
  ArrowDown, ArrowUp, DollarSign, Image as ImageIcon, ChevronRight,
  Layers, BookmarkPlus, CheckCheck, RotateCcw, ListFilter, Sparkle,
  FolderTree, List, ChevronDown, Building2, Flame, Zap, Coins, Tag,
  Landmark, CheckSquare, Square, ChevronUp, Waves, Radio, Shirt,
  Maximize2, Minimize2
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
  { code: '600066', targetYield: 6.2, customNote: '宇通客车汽车现金奶牛，超高分红率，目标6.2%股息率' },
  { code: '600863', targetYield: 5.5, customNote: '内蒙华电(华能蒙电)70%分红率承诺，目标5.5%股息率' },
  { code: '002807', targetYield: 5.2, customNote: '江阴银行苏南优质农商行，目标5.2%股息率' },
  { code: '600900', targetYield: 4.0, customNote: '水电流域护城河，大水电资产注入' },
  { code: '000651', targetYield: 6.5, customNote: '白电龙头，高分红承诺' },
  { code: '601225', targetYield: 7.0, customNote: '动力煤龙头，超高股息率标的' },
  { code: '600519', targetYield: 3.5, customNote: '高端白酒龙头，股息率达3.5%时极具安全边际' },
  { code: '600461', targetYield: 6.0, customNote: '洪城环境江西公用水务城燃环保龙头，50%保底分红承诺，目标6.0%股息率' },
  { code: '600642', targetYield: 5.5, customNote: '申能股份上海综合能源公用旗舰，连续28年现金分红，目标5.5%股息率' },
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

// 行业元数据（图标、代表色彩、行业定制预设）
const getIndustryMeta = (industry: string) => {
  const norm = (industry || '其他').trim();
  if (norm.includes('银行')) {
    return { 
      icon: Landmark, 
      label: '银行金融', 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10', 
      border: 'border-blue-500/30', 
      badgeBg: 'bg-blue-950/60',
      presets: [5.0, 5.5, 6.0, 6.5]
    };
  }
  if (norm.includes('煤炭')) {
    return { 
      icon: Flame, 
      label: '煤炭开采', 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10', 
      border: 'border-amber-500/30', 
      badgeBg: 'bg-amber-950/60',
      presets: [6.5, 7.0, 7.5, 8.0]
    };
  }
  if (norm.includes('电力') || norm.includes('公用') || norm.includes('公共')) {
    return { 
      icon: Zap, 
      label: '公用事业', 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-500/10', 
      border: 'border-yellow-500/30', 
      badgeBg: 'bg-yellow-950/60',
      presets: [4.0, 4.5, 5.0, 5.5]
    };
  }
  if (norm.includes('家电') || norm.includes('家用电器')) {
    return { 
      icon: Sparkles, 
      label: '家用电器', 
      color: 'text-purple-400', 
      bg: 'bg-purple-500/10', 
      border: 'border-purple-500/30', 
      badgeBg: 'bg-purple-950/60',
      presets: [5.0, 5.5, 6.0, 7.0]
    };
  }
  if (norm.includes('食品') || norm.includes('饮料') || norm.includes('白酒')) {
    return { 
      icon: Sparkle, 
      label: '食品饮料', 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10', 
      border: 'border-rose-500/30', 
      badgeBg: 'bg-rose-950/60',
      presets: [3.5, 4.0, 4.5, 5.0]
    };
  }
  if (norm.includes('有色') || norm.includes('金属') || norm.includes('钢铁')) {
    return { 
      icon: Coins, 
      label: '有色金属', 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-500/10', 
      border: 'border-cyan-500/30', 
      badgeBg: 'bg-cyan-950/60',
      presets: [4.5, 5.0, 5.5, 6.0]
    };
  }
  if (norm.includes('水电')) {
    return { 
      icon: Waves, 
      label: '大水电金牛', 
      color: 'text-cyan-300', 
      bg: 'bg-cyan-500/10', 
      border: 'border-cyan-500/30', 
      badgeBg: 'bg-cyan-950/60',
      presets: [3.5, 4.0, 4.5, 5.0]
    };
  }
  if (norm.includes('电信') || norm.includes('运营商') || norm.includes('通信')) {
    return { 
      icon: Radio, 
      label: '电信运营商', 
      color: 'text-sky-300', 
      bg: 'bg-sky-500/10', 
      border: 'border-sky-500/30', 
      badgeBg: 'bg-sky-950/60',
      presets: [4.0, 4.5, 5.0, 5.5]
    };
  }
  if (norm.includes('大众服饰') || norm.includes('服装') || norm.includes('服饰')) {
    return { 
      icon: Shirt, 
      label: '大众服饰', 
      color: 'text-pink-300', 
      bg: 'bg-pink-500/10', 
      border: 'border-pink-500/30', 
      badgeBg: 'bg-pink-950/60',
      presets: [5.0, 6.0, 7.0, 8.0]
    };
  }
  if (norm.includes('纺织') || norm.includes('家纺')) {
    return { 
      icon: Layers, 
      label: '纺织服饰', 
      color: 'text-rose-300', 
      bg: 'bg-rose-500/10', 
      border: 'border-rose-500/30', 
      badgeBg: 'bg-rose-950/60',
      presets: [5.0, 6.0, 7.0, 8.0]
    };
  }
  if (norm.includes('保险') || norm.includes('险资')) {
    return { 
      icon: ShieldCheck, 
      label: '保险金牛', 
      color: 'text-indigo-300', 
      bg: 'bg-indigo-500/10', 
      border: 'border-indigo-500/30', 
      badgeBg: 'bg-indigo-950/60',
      presets: [4.0, 4.5, 5.0, 5.5]
    };
  }
  if (norm.includes('零售') || norm.includes('商贸') || norm.includes('商业')) {
    return { 
      icon: Tag, 
      label: '商贸零售', 
      color: 'text-fuchsia-400', 
      bg: 'bg-fuchsia-500/10', 
      border: 'border-fuchsia-500/30', 
      badgeBg: 'bg-fuchsia-950/60',
      presets: [4.5, 5.0, 5.5, 6.0]
    };
  }
  return { 
    icon: Building2, 
    label: norm, 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/30', 
    badgeBg: 'bg-emerald-950/60',
    presets: [4.5, 5.0, 6.0, 7.0]
  };
};

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

  // 视图组织模式: 'grouped' (按所属行业分类分组) vs 'flat' (平铺列表)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // 行业筛选状态: 'all' 表示全部行业，其他为具体行业名称
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');

  // 折叠/展开的行业字典: key为行业名称, true表示折叠
  const [collapsedIndustries, setCollapsedIndustries] = useState<Record<string, boolean>>({});

  // 行业批量股息率弹出设置
  const [activeIndustryBatchYield, setActiveIndustryBatchYield] = useState<{ industry: string; isOpen: boolean } | null>(null);
  const [industryBatchInput, setIndustryBatchInput] = useState<string>('');

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
  const [industryExportTarget, setIndustryExportTarget] = useState<string | null>(null);

  // 选中的标的代码 (支持勾选多只目标批量导出带理想买入价测算的图片)
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  // Local override yield map for filtered pool items
  const [filteredCustomYields, setFilteredCustomYields] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 窗口宽屏与最大化视图切换
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 智能进入对应池子：若自选池已有股票，默认进入【我的自选备选池】
  useEffect(() => {
    if (isOpen) {
      if (watchItems.length > 0) {
        setPoolMode('watchlist');
      } else if (filteredStocks.length > 0) {
        setPoolMode('filtered');
      } else {
        setPoolMode('watchlist');
      }
    }
  }, [isOpen]);

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
          // 默认理想股息率：现行股息率上浮 10%~20%，并向上取整至最接近的 0.5%
          const baseYield = Math.max(stock.ttmDividendYield || 0, 3.0);
          targetYield = Math.ceil((baseYield * 1.15) * 2) / 2;
          if (targetYield < 4.0) targetYield = 4.0;
        }
      }

      return calculateTargetDividendProfile(stock, targetYield);
    });
  }, [filteredStocks, filteredCustomYields, watchItems]);

  // 2. 计算【我的自选池】标的的详细测算数据
  const calculatedWatchlistItems: TargetDividendCalculatedStock[] = useMemo(() => {
    return watchItems.map((item) => {
      const stock = allStocks.find((s) => s.code === item.code);
      const safeYield = item.targetYield ?? item.targetDividendYield ?? 6.0;

      if (stock) {
        return calculateTargetDividendProfile(stock, safeYield);
      }

      // 如果全量标的中暂未找到该股票（来自第三方动态添加），使用安全兜底对象
      const fallbackDps = Number(((10.0 * (safeYield * 0.9)) / 100).toFixed(3));
      const fallbackStock: Stock = {
        code: item.code,
        name: item.customNote || `标的(${item.code})`,
        pinyin: item.code,
        industry: '自选标的',
        market: 'SH',
        price: 10.0,
        change: 0,
        changePercent: 0,
        prevClose: 10.0,
        lastYearDividendPerShare: fallbackDps,
        ttmDividendPerShare: fallbackDps,
        staticDividendYield: safeYield * 0.9,
        ttmDividendYield: safeYield * 0.9,
        dividendYears: 5,
        payoutRatio: 50.0,
        dividendCycle: '年度分红',
        pe: 10.0,
        pb: 1.0,
        marketCap: 100,
        roe: 12.0,
        revGrowth: 5.0,
        netProfitGrowth: 5.0,
        isST: false,
        isDelisted: false,
        isLeader: false,
        isAristocrat: false,
        description: '优质高股息自选标的',
        dividendAdvantage: '现金分红稳定',
        history: [],
        quarterly: [],
        updateTime: '15:00:00'
      };

      return calculateTargetDividendProfile(fallbackStock, safeYield);
    });
  }, [watchItems, allStocks]);

  // 当前激活的数据集
  const calculatedItems = poolMode === 'filtered' ? calculatedFilteredItems : calculatedWatchlistItems;

  // 提取当前备选池中包含的所有行业清单及每个行业的标的数量与达标数量
  const availableIndustries = useMemo(() => {
    const map: Record<string, { count: number; reachedCount: number }> = {};
    calculatedItems.forEach((item) => {
      let ind = (item.stock.industry || '其他').trim();
      // 煤炭与公用事业归一
      if (ind === '煤炭') ind = '煤炭开采';
      if (ind === '公共事业') ind = '公用事业';
      if (!map[ind]) {
        map[ind] = { count: 0, reachedCount: 0 };
      }
      map[ind].count += 1;
      if (item.isReached) {
        map[ind].reachedCount += 1;
      }
    });

    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([industry, data]) => ({
        industry,
        count: data.count,
        reachedCount: data.reachedCount
      }));
  }, [calculatedItems]);

  // 当切换资金池模式时，如果选中的行业在当前池中不存在，重置为 'all'
  useEffect(() => {
    if (selectedIndustry !== 'all') {
      const exists = availableIndustries.some((i) => i.industry === selectedIndustry);
      if (!exists) {
        setSelectedIndustry('all');
      }
    }
  }, [poolMode, availableIndustries]);

  // 筛选与排序后的备选列表
  const displayedItems = useMemo(() => {
    let list = calculatedItems;

    // 1. 行业筛选
    if (selectedIndustry !== 'all') {
      list = list.filter((item) => {
        const ind = (item.stock.industry || '').trim();
        if (ind === selectedIndustry) return true;
        // 兼容煤炭与煤炭开采
        if (
          (selectedIndustry === '煤炭' && ind === '煤炭开采') ||
          (selectedIndustry === '煤炭开采' && ind === '煤炭')
        ) {
          return true;
        }
        // 兼容公共事业与公用事业
        if (
          (selectedIndustry === '公共事业' && ind === '公用事业') ||
          (selectedIndustry === '公用事业' && ind === '公共事业')
        ) {
          return true;
        }
        return false;
      });
    }

    // 2. 状态过滤
    if (statusFilter !== 'all') {
      list = list.filter((item) => item.status === statusFilter);
    }

    // 3. 排序
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
  }, [calculatedItems, selectedIndustry, statusFilter, sortBy]);

  // 按行业分组后的数据结构（用于行业分类视图）
  interface IndustryGroup {
    industry: string;
    items: TargetDividendCalculatedStock[];
    reachedCount: number;
    closeCount: number;
    avgTargetYield: number;
    avgCurrentYield: number;
    avgDropNeeded: number;
  }

  const groupedItems = useMemo<IndustryGroup[]>(() => {
    const groups: Record<string, TargetDividendCalculatedStock[]> = {};
    
    displayedItems.forEach((item) => {
      let ind = (item.stock.industry || '其他行业').trim();
      if (ind === '煤炭') ind = '煤炭开采';
      if (ind === '公共事业') ind = '公用事业';
      if (!groups[ind]) groups[ind] = [];
      groups[ind].push(item);
    });

    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([industry, items]) => {
        const reachedCount = items.filter((i) => i.isReached).length;
        const closeCount = items.filter((i) => !i.isReached && i.dropNeededPercent >= -5.0).length;
        const avgTargetYield = items.reduce((sum, i) => sum + i.targetYield, 0) / items.length;
        const avgCurrentYield = items.reduce((sum, i) => sum + i.currentYield, 0) / items.length;
        const avgDropNeeded = items.reduce((sum, i) => sum + i.dropNeededPercent, 0) / items.length;

        return {
          industry,
          items,
          reachedCount,
          closeCount,
          avgTargetYield,
          avgCurrentYield,
          avgDropNeeded
        };
      });
  }, [displayedItems]);

  // 统计概览指标 (基于当前筛选结果或全池)
  const summaryStats = useMemo(() => {
    const listToSummarize = displayedItems.length > 0 ? displayedItems : calculatedItems;
    const total = listToSummarize.length;
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

    const reachedCount = listToSummarize.filter((c) => c.isReached).length;
    const closeCount = listToSummarize.filter((c) => !c.isReached && c.dropNeededPercent >= -5.0).length;
    const avgTargetYield = listToSummarize.reduce((acc, c) => acc + c.targetYield, 0) / total;
    const avgCurrentYield = listToSummarize.reduce((acc, c) => acc + c.currentYield, 0) / total;
    const avgDropNeeded = listToSummarize.reduce((acc, c) => acc + c.dropNeededPercent, 0) / total;

    return {
      total,
      reachedCount,
      closeCount,
      avgTargetYield,
      avgCurrentYield,
      avgDropNeeded
    };
  }, [displayedItems, calculatedItems]);

  // 勾选/反选单只标的
  const handleToggleSelectCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // 勾选/反选某个行业的全部标的
  const handleToggleSelectIndustry = (groupItems: TargetDividendCalculatedStock[]) => {
    const groupCodes = groupItems.map((i) => i.stock.code);
    const allSelected = groupCodes.every((c) => selectedCodes.includes(c));
    if (allSelected) {
      setSelectedCodes((prev) => prev.filter((c) => !groupCodes.includes(c)));
      showToast(`已取消勾选本行业全部 ${groupCodes.length} 只标的`);
    } else {
      setSelectedCodes((prev) => Array.from(new Set([...prev, ...groupCodes])));
      showToast(`已批量勾选本行业全部 ${groupCodes.length} 只标的`);
    }
  };

  // 切换折叠某个行业
  const handleToggleCollapseIndustry = (industry: string) => {
    setCollapsedIndustries((prev) => ({
      ...prev,
      [industry]: !prev[industry]
    }));
  };

  // 一键全部展开 / 全部折叠
  const handleExpandAllIndustries = () => {
    setCollapsedIndustries({});
  };

  const handleCollapseAllIndustries = () => {
    const allCollapsed: Record<string, boolean> = {};
    groupedItems.forEach((g) => {
      allCollapsed[g.industry] = true;
    });
    setCollapsedIndustries(allCollapsed);
  };

  // 是否全部勾选当前显示的标的
  const isAllSelected = displayedItems.length > 0 && displayedItems.every((item) => selectedCodes.includes(item.stock.code));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(displayedItems.map((item) => item.stock.code));
    }
  };

  const handleClearSelection = () => {
    setSelectedCodes([]);
  };

  // 当切换资金池模式时清空勾选
  useEffect(() => {
    setSelectedCodes([]);
  }, [poolMode]);

  // 待导出标的清单：
  // 1. 若指定了单行业导出（从行业分组卡片点击“导出清单图”），则导出该行业标的
  // 2. 若勾选了标的，则精准导出勾选的标的
  // 3. 否则导出当前视图所展示的标的
  const exportItems = useMemo(() => {
    if (industryExportTarget) {
      const indItems = calculatedItems.filter((c) => c.stock.industry === industryExportTarget);
      if (indItems.length > 0) return indItems;
    }
    if (selectedCodes.length > 0) {
      const selected = calculatedItems.filter((c) => selectedCodes.includes(c.stock.code));
      if (selected.length > 0) return selected;
    }
    return displayedItems.length > 0 ? displayedItems : calculatedItems;
  }, [industryExportTarget, selectedCodes, calculatedItems, displayedItems]);

  // 导出图片表头标题：严格遵循「该行业名称·理想目标买入价测算清单」规范
  const exportImageTitle = useMemo(() => {
    // 1. 若从单个行业卡片直接触发导出
    if (industryExportTarget) {
      return `${industryExportTarget}·理想目标买入价测算清单`;
    }

    // 2. 若当前已通过行业选择器筛选出单个行业
    if (selectedIndustry !== 'all') {
      return `${selectedIndustry}·理想目标买入价测算清单`;
    }

    // 3. 检查实际待导出标的的所属行业归属
    const uniqueIndustries = Array.from(
      new Set(exportItems.map((item) => item.stock.industry).filter(Boolean))
    );

    // 若当前导出的标的全归属于同一行业（如全为公用事业、银行等）
    if (uniqueIndustries.length === 1) {
      return `${uniqueIndustries[0]}·理想目标买入价测算清单`;
    }

    // 多行业综合或全量导出
    return '全行业·理想目标买入价测算清单';
  }, [industryExportTarget, selectedIndustry, exportItems]);

  // 单行业一键导出高清测算图片
  const handleExportIndustryImage = (industry: string) => {
    setIndustryExportTarget(industry);
    setIsExportImageOpen(true);
  };

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

  // 针对特定行业批量设置理想股息率
  const handleApplyIndustryTargetYield = (industry: string, targetYield: number) => {
    const safeYield = Math.max(0.1, Number(targetYield.toFixed(2)));
    const targetGroup = groupedItems.find((g) => g.industry === industry);
    if (!targetGroup) return;

    const groupCodes = targetGroup.items.map((i) => i.stock.code);

    if (poolMode === 'filtered') {
      setFilteredCustomYields((prev) => {
        const next = { ...prev };
        groupCodes.forEach((code) => {
          next[code] = safeYield;
        });
        return next;
      });
    } else {
      const updated = watchItems.map((item) => {
        if (groupCodes.includes(item.code)) {
          return { ...item, targetYield: safeYield, targetDividendYield: safeYield };
        }
        return item;
      });
      onUpdateWatchItems(updated);
      saveStoredTargetWatchlist(updated);
    }

    setActiveIndustryBatchYield(null);
    showToast(`🎉 已将【${industry}】板块 ${groupCodes.length} 只标的的理想股息率统一调整为 ${safeYield}%`);
  };

  // 移出自选备选池
  const handleRemoveWatchItem = (code: string) => {
    const updated = watchItems.filter((item) => item.code !== code);
    onUpdateWatchItems(updated);
    saveStoredTargetWatchlist(updated);
    showToast(`已从自选关注池移出标的 (${code})`);
  };

  // 添加新标的到自选备选池
  const handleAddStockToWatchlist = (stockToAdd: Stock) => {
    if (!stockToAdd) return;

    const exists = watchItems.some((w) => w.code === stockToAdd.code);
    if (exists) {
      showToast(`标的 ${stockToAdd.name} 已在自选备选池中`);
      return;
    }

    const defaultYield = Math.max(newStockTargetYield, 4.0);
    const newItem: TargetDividendWatchItem = {
      code: stockToAdd.code,
      targetYield: defaultYield,
      targetDividendYield: defaultYield,
      customNote: `${stockToAdd.name} (${stockToAdd.industry || '优质资产'})`
    };

    const updated = [newItem, ...watchItems];
    onUpdateWatchItems(updated);
    saveStoredTargetWatchlist(updated);

    setSearchQuery('');
    setSearchResults([]);
    setSelectedSearchStock(null);
    setIsAddingStock(false);

    showToast(`🎉 成功将 ${stockToAdd.name} 加入自选备选池 (目标股息率 ${defaultYield}%)`);
  };

  // 一键将当前通过 PE/股息率 筛选的所有股票存入自选池
  const handleSaveAllFilteredToWatchlist = () => {
    if (filteredStocks.length === 0) return;

    let addedCount = 0;
    const currentCodes = new Set(watchItems.map((w) => w.code));
    const newItems: TargetDividendWatchItem[] = [];

    filteredStocks.forEach((stock) => {
      if (!currentCodes.has(stock.code)) {
        let targetYield = filteredCustomYields[stock.code];
        if (targetYield === undefined) {
          const baseYield = Math.max(stock.ttmDividendYield || 0, 3.0);
          targetYield = Math.ceil((baseYield * 1.15) * 2) / 2;
          if (targetYield < 4.0) targetYield = 4.0;
        }

        newItems.push({
          code: stock.code,
          targetYield,
          targetDividendYield: targetYield,
          customNote: `${stock.name} (${stock.industry || '策略精选'})`
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      const updated = [...newItems, ...watchItems];
      onUpdateWatchItems(updated);
      saveStoredTargetWatchlist(updated);
      showToast(`🎉 成功将 ${addedCount} 只策略筛选标的导入至我的自选池！`);
      setPoolMode('watchlist');
    } else {
      showToast('当前策略筛选出的标的已全部在自选池中');
      setPoolMode('watchlist');
    }
  };

  // 一键将已勾选的股票存入自选池
  const handleSaveSelectedFilteredToWatchlist = () => {
    if (selectedCodes.length === 0) return;

    let addedCount = 0;
    const currentCodes = new Set(watchItems.map((w) => w.code));
    const newItems: TargetDividendWatchItem[] = [];

    selectedCodes.forEach((code) => {
      if (!currentCodes.has(code)) {
        const item = calculatedFilteredItems.find((c) => c.stock.code === code);
        if (item) {
          newItems.push({
            code: item.stock.code,
            targetYield: item.targetYield,
            targetDividendYield: item.targetYield,
            customNote: `${item.stock.name} (${item.stock.industry})`
          });
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      const updated = [...newItems, ...watchItems];
      onUpdateWatchItems(updated);
      saveStoredTargetWatchlist(updated);
      showToast(`🎉 成功将 ${addedCount} 只已选标的存入我的自选关注池！`);
      setSelectedCodes([]);
    } else {
      showToast('所勾选标的已全在自选池中');
    }
  };

  // 批量移出已选自选池标的
  const handleBatchRemoveSelectedFromWatchlist = () => {
    if (selectedCodes.length === 0) return;
    const updated = watchItems.filter((w) => !selectedCodes.includes(w.code));
    onUpdateWatchItems(updated);
    saveStoredTargetWatchlist(updated);
    showToast(`已从自选关注池批量移出 ${selectedCodes.length} 只标的`);
    setSelectedCodes([]);
  };

  // 批量设置当前池标的的理想股息率
  const handleApplyBatchTargetYield = (targetYield: number) => {
    const safeYield = Math.max(0.1, Number(targetYield.toFixed(2)));

    if (poolMode === 'filtered') {
      const newMap: Record<string, number> = {};
      filteredStocks.forEach((s) => {
        newMap[s.code] = safeYield;
      });
      setFilteredCustomYields(newMap);
    } else {
      const updated = watchItems.map((item) => ({
        ...item,
        targetYield: safeYield,
        targetDividendYield: safeYield
      }));
      onUpdateWatchItems(updated);
      saveStoredTargetWatchlist(updated);
    }

    setShowBatchModal(false);
    showToast(`🎉 已将所有标的的理想目标股息率批量设为 ${safeYield}%`);
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

  // 导出备选池到 Excel (支持仅导出选中目标或导出全部)
  const handleExportExcel = () => {
    const listToExport = selectedCodes.length > 0
      ? calculatedItems.filter((c) => selectedCodes.includes(c.stock.code))
      : (selectedIndustry !== 'all' ? displayedItems : calculatedItems);

    if (listToExport.length === 0) return;

    const data = listToExport.map((c, idx) => ({
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
      '当前PE': c.stock.pe > 0 ? c.stock.pe.toFixed(1) : '-',
      '5年PE历史分位': c.stock.pePercentile !== undefined ? `${c.stock.pePercentile.toFixed(0)}%` : '-'
    }));

    const uniqueIndustries = Array.from(
      new Set(listToExport.map((item) => item.stock.industry).filter(Boolean))
    );
    const targetIndustry = selectedIndustry !== 'all'
      ? selectedIndustry
      : (uniqueIndustries.length === 1 ? uniqueIndustries[0] : '全行业');
    const sheetTitle = `${targetIndustry}·理想目标买入价测算清单`;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '理想目标买入价测算');
    XLSX.writeFile(workbook, `${sheetTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isOpen) return null;

  // 渲染单个股票行
  const renderStockRow = (item: TargetDividendCalculatedStock) => {
    const isPortfolio = portfolioStockCodes.includes(item.stock.code);
    const isInSavedWatchlist = watchItems.some((w) => w.code === item.stock.code);
    const indMeta = getIndustryMeta(item.stock.industry);

    return (
      <div
        key={item.stock.code}
        className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-800/60 transition group text-xs ${
          item.isReached ? 'bg-emerald-950/15' : item.status === 'close' ? 'bg-orange-950/10' : ''
        }`}
      >
        {/* Column 1: 股票名称、代码与行业 */}
        <div className="col-span-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedCodes.includes(item.stock.code)}
            onChange={() => handleToggleSelectCode(item.stock.code)}
            className="accent-rose-500 rounded cursor-pointer w-3.5 h-3.5 shrink-0"
            title="勾选/取消勾选该标的"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectStock(item.stock)}
                className="font-bold text-slate-100 hover:text-rose-400 transition text-left flex items-center gap-1 group-hover:translate-x-0.5 duration-150 truncate"
              >
                <span className="truncate">{item.stock.name}</span>
                <ArrowUpRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
              </button>
              <span className="font-mono text-[11px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                {item.stock.code}
              </span>
              {isInSavedWatchlist && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  已自选
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span 
                className={`font-medium cursor-pointer hover:underline ${indMeta.color}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndustry(item.stock.industry === '煤炭' ? '煤炭开采' : item.stock.industry);
                }}
                title={`点击筛选【${item.stock.industry}】板块`}
              >
                {item.stock.industry}
              </span>
              <span>•</span>
              <span title="每股分红基准金额">每股派息 ¥{item.dividendPerShare.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Column 2: 现价与现行股息率及PE历史分位 */}
        <div className="col-span-2 text-right">
          <div className="font-bold text-slate-100 font-mono text-sm">
            ¥{item.currentPrice.toFixed(2)}
          </div>
          <div className="text-[11px] text-rose-400 font-semibold mt-0.5">
            现股息 {item.currentYield.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center justify-end gap-1">
            <span>PE {item.stock.pe > 0 ? item.stock.pe.toFixed(1) : '-'}</span>
            <span 
              className={`px-1 py-0.2 rounded text-[9px] font-sans font-medium border ${
                (item.stock.pePercentile ?? 50) <= 25 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                  : (item.stock.pePercentile ?? 50) <= 50 
                  ? 'bg-teal-500/15 text-teal-300 border-teal-500/30' 
                  : (item.stock.pePercentile ?? 50) <= 75 
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
              title={`5年PE历史分位数: ${(item.stock.pePercentile ?? 50).toFixed(1)}%`}
            >
              5年{(item.stock.pePercentile ?? 50).toFixed(0)}%
            </span>
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
                className={`px-1 py-0.5 rounded border transition ${
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

        {/* Column 4: 目标买入价位 & 三维稳妥安全价 */}
        <div className="col-span-2 text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-[10px] text-amber-500/80 font-medium">目标:</span>
            <span className="font-black text-amber-400 font-mono text-base">
              ¥{item.targetPrice.toFixed(2)}
            </span>
          </div>
          {item.robustProfile && (
            <div className="flex items-center justify-end gap-1 mt-0.5" title={`三维稳妥买入价: 结合5年PE估值底与PB资产底综合加权`}>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-slate-400">稳妥价:</span>
              <span className="font-mono font-bold text-emerald-400 text-xs">
                ¥{item.robustProfile.safeBuyPrice.toFixed(2)}
              </span>
            </div>
          )}
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
            目标PE: <strong className="text-slate-300">{item.targetPE > 0 ? item.targetPE.toFixed(1) : '-'}</strong> 倍
          </div>
        </div>

        {/* Column 5: 需跌百分比与状态 */}
        <div className="col-span-2 flex flex-col items-center justify-center">
          <div className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1 ${
            item.isReached
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : item.status === 'close'
              ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
              : 'bg-slate-800/60 text-slate-300 border-slate-700'
          }`}>
            {item.isReached ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className={`w-3.5 h-3.5 ${item.status === 'close' ? 'text-orange-400' : 'text-slate-400'}`} />
            )}
            <span className="font-bold font-mono">
              {item.isReached ? '现价已达标' : `${item.dropNeededPercent.toFixed(1)}%`}
            </span>
          </div>

          <div className="text-[10px] mt-1 flex items-center gap-1">
            {item.robustProfile?.isSafeReached ? (
              <span className="text-emerald-400 font-medium">⚡ 已达稳妥安全线</span>
            ) : item.isReached ? (
              <span className="text-emerald-400 font-medium">满足 {item.targetYield}% 目标</span>
            ) : (
              <span className="text-slate-400 font-mono">距买入差 ¥{item.diffPrice.toFixed(2)}</span>
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`bg-slate-900 border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden relative transition-all duration-200 ${
        isMaximized 
          ? 'w-[99vw] h-[98vh] max-w-[99vw] max-h-[98vh]' 
          : 'w-[96vw] max-w-[1580px] max-h-[95vh]'
      }`}>
        
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
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl text-white shadow-lg shadow-rose-950/50">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                  <span>理想股息率备选股票池</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700 font-normal">
                    目标价倒推 · 需跌空间 · 行业分类
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                设定买入时预期目标股息率（如 6.0%），系统基于每股分红实时倒推目标建仓价与需跌百分比
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshQuotes && (
              <button
                onClick={onRefreshQuotes}
                disabled={isRefreshing}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                title="实时同步A股全市场最新行情现价"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
                <span className="hidden sm:inline">刷新现价</span>
              </button>
            )}

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition cursor-pointer border border-slate-700"
              title={isMaximized ? "还原标准宽屏" : "最大化全屏宽景视图"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition cursor-pointer border border-slate-700"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Header: Mode Switch Tabs & View Switcher */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          
          {/* Left: Mode Switcher */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setPoolMode('watchlist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                poolMode === 'watchlist'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>⭐ 我的自选备选池 ({watchItems.length})</span>
            </button>

            <button
              onClick={() => setPoolMode('filtered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                poolMode === 'filtered'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>🎯 策略自动筛选池 ({filteredStocks.length})</span>
              {poolMode === 'filtered' && (
                <span className="text-[10px] px-1.5 py-0.5 bg-rose-700/60 rounded font-normal">
                  已联动【{strategyInfo.title}】
                </span>
              )}
            </button>
          </div>

          {/* Center/Right: View Switcher (行业分类分组 vs 平铺列表) & Import Button */}
          <div className="flex items-center gap-2">
            
            {/* View Mode Toggle: 行业分类分组 / 平铺列表 */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 font-bold ${
                  viewMode === 'grouped'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="按照所属行业进行分类与分组展示"
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>行业分类视图</span>
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 font-bold ${
                  viewMode === 'flat'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="全量标的平铺连续表格"
              >
                <List className="w-3.5 h-3.5" />
                <span>平铺列表</span>
              </button>
            </div>

            {/* Quick Action Buttons for Current Mode */}
            {poolMode === 'watchlist' ? (
              <button
                onClick={handleSaveAllFilteredToWatchlist}
                disabled={filteredStocks.length === 0}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                title="将当前策略筛选出的所有股票快速导入到我的自选池"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>从策略池导入 ({filteredStocks.length})</span>
              </button>
            ) : (
              <button
                onClick={handleSaveAllFilteredToWatchlist}
                disabled={filteredStocks.length === 0}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 border border-emerald-500/30 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                title="一键将当前通过PE、股息率筛选的全部股票保存至持久化自选池"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>保存当前 {filteredStocks.length} 只到自选</span>
              </button>
            )}
          </div>

        </div>

        {/* Top Summary Stats Cards */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3">
          
          {/* Card 1: 备选总数 */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>{selectedIndustry !== 'all' ? `${selectedIndustry}板块` : (poolMode === 'filtered' ? '当前筛选标的' : '自选池标的')}</span>
              {selectedIndustry !== 'all' && (
                <span className="text-[10px] text-indigo-400 font-semibold">已按行业过滤</span>
              )}
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
              <span className="text-[10px] text-slate-500">至买入价</span>
            </div>
          </div>

        </div>

        {/* Toolbar: Search Add & Filter Controls */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Quick Search & Add Box (Only in Watchlist mode, or as search bar) */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-sm relative">
            <div className="relative w-full">
              <input
                type="text"
                placeholder={poolMode === 'watchlist' ? "搜索股票代码/名称加入自选备选池..." : "在备选池中快速检索股票..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
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

            {/* Search Dropdown Results for Watchlist Add */}
            {searchResults.length > 0 && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-800">
                {searchResults.slice(0, 8).map((res) => {
                  const alreadyInWatchlist = watchItems.some((w) => w.code === res.code);
                  return (
                    <div
                      key={res.code}
                      onClick={() => {
                        if (res.stock) {
                          handleAddStockToWatchlist(res.stock);
                        } else {
                          fetchOrBuildStock(res.code, res.name).then(handleAddStockToWatchlist);
                        }
                      }}
                      className="px-3 py-2 flex items-center justify-between hover:bg-slate-800 cursor-pointer transition text-xs group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 group-hover:text-rose-400 transition">{res.name}</span>
                        <span className="text-[11px] font-mono text-slate-400">{res.code}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {res.industry || 'A股'}
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
            
            {/* 行业筛选下拉框 */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
                title="按所属行业过滤标的"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  全行业分类 ({calculatedItems.length})
                </option>
                {availableIndustries.map((ind) => (
                  <option key={ind.industry} value={ind.industry} className="bg-slate-900 text-slate-200">
                    {ind.industry} ({ind.count}只{ind.reachedCount > 0 ? `·🎯${ind.reachedCount}` : ''})
                  </option>
                ))}
              </select>
            </div>

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
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-600/20 via-amber-600/20 to-emerald-600/20 hover:from-rose-600/30 hover:via-amber-600/30 hover:to-emerald-600/30 text-amber-300 border border-amber-500/40 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title={selectedCodes.length > 0 ? `导出已勾选的 ${selectedCodes.length} 只标的高清测算图` : "将备选股票池高清渲染为图片并带专属水印导出"}
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>{selectedCodes.length > 0 ? `导出已选 (${selectedCodes.length})` : '导出图片'}</span>
            </button>

          </div>
        </div>

        {/* Dynamic Industry Filter Chips Bar (全景自适应行业筛选面板 - 杜绝截断与狭窄) */}
        {availableIndustries.length > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-slate-950/90 border-b border-slate-800/80 text-xs space-y-2">
            
            {/* Top Row: Title, Status Indicator, and Group Operations */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <FolderTree className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>行业分类筛选全景</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (全域收录 {availableIndustries.length} 个行业 · {calculatedItems.length} 支标的)
                </span>
                {selectedIndustry !== 'all' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-medium">
                    <span>当前锁定:</span>
                    <strong className="text-indigo-200">{selectedIndustry}</strong>
                    <span className="text-[10px] font-mono text-indigo-400">({displayedItems.length}只)</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedIndustry !== 'all' && (
                  <button
                    onClick={() => setSelectedIndustry('all')}
                    className="px-2.5 py-1 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition border border-rose-500/30 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>恢复全行业 ({calculatedItems.length})</span>
                  </button>
                )}

                {viewMode === 'grouped' && (
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                    <button
                      onClick={handleExpandAllIndustries}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-medium transition cursor-pointer border border-slate-700/80"
                      title="展开所有行业板块"
                    >
                      全部展开
                    </button>
                    <button
                      onClick={handleCollapseAllIndustries}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-medium transition cursor-pointer border border-slate-700/80"
                      title="折叠所有行业板块"
                    >
                      全部折叠
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Multi-Row Wrapped Industry Pills (自适应宽屏平铺，绝不截断) */}
            <div className="flex flex-wrap items-center gap-1.5 max-h-48 overflow-y-auto pr-1">
              {/* All Industries Pill */}
              <button
                onClick={() => setSelectedIndustry('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  selectedIndustry === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50 border-indigo-400'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <span>全部行业</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${selectedIndustry === 'all' ? 'bg-indigo-700 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
                  {calculatedItems.length}
                </span>
              </button>

              {/* Individual Industry Pills */}
              {availableIndustries.map((ind) => {
                const meta = getIndustryMeta(ind.industry);
                const Icon = meta.icon;
                const isSelected = selectedIndustry === ind.industry;

                return (
                  <button
                    key={ind.industry}
                    onClick={() => setSelectedIndustry(isSelected ? 'all' : ind.industry)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border cursor-pointer ${
                      isSelected
                        ? `${meta.bg} ${meta.color} ${meta.border} shadow-md ring-2 ring-indigo-500/50 font-bold scale-[1.02]`
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                    title={`点击筛选【${ind.industry}】板块 (${ind.count}只标的)`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? meta.color : 'text-slate-400'}`} />
                    <span>{ind.industry}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isSelected ? 'bg-slate-900/90 text-white font-bold' : 'bg-slate-800/80 text-slate-400'
                    }`}>
                      {ind.count}
                    </span>
                    {ind.reachedCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50" title={`该板块有 ${ind.reachedCount} 只已落入理想目标价`} />
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        )}

        {/* Multi-Selection Action Ribbon (当勾选了标的时出现) */}
        {selectedCodes.length > 0 && (
          <div className="px-4 py-2 bg-gradient-to-r from-amber-950/40 via-indigo-950/40 to-slate-950 border-b border-amber-500/30 flex items-center justify-between flex-wrap gap-2 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <CheckSquare className="w-4 h-4 text-amber-400" />
              <span>已勾选 <strong className="font-mono text-amber-200 font-bold text-sm">{selectedCodes.length}</strong> 只标的</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsExportImageOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs transition active:scale-95 flex items-center gap-1 shadow-sm"
                title="仅导出已选目标标的的理想买入价测算图"
              >
                <Target className="w-3.5 h-3.5" />
                <span>导出已选测算图 ({selectedCodes.length})</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition active:scale-95 flex items-center gap-1"
                title="仅导出已选目标标的的 Excel 方案"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>导出已选Excel</span>
              </button>

              {poolMode === 'filtered' && (
                <button
                  onClick={handleSaveSelectedFilteredToWatchlist}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 flex items-center gap-1 shadow-sm"
                  title="将勾选的标的存入【我的自选关注池】"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>存入自选池</span>
                </button>
              )}

              {poolMode === 'watchlist' && (
                <button
                  onClick={handleBatchRemoveSelectedFromWatchlist}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition active:scale-95 flex items-center gap-1 shadow-sm"
                  title="从自选关注池移出已勾选的标的"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>批量移出</span>
                </button>
              )}

              <button
                onClick={handleClearSelection}
                className="text-amber-400/80 hover:text-amber-200 px-1.5 py-1 rounded hover:bg-amber-500/10 transition text-xs flex items-center gap-1"
                title="取消勾选"
              >
                <X className="w-3.5 h-3.5" />
                <span>取消勾选</span>
              </button>
            </div>
          </div>
        )}

        {/* Batch Yield Preset Ribbon */}
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
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 transition font-medium"
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

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          
          {displayedItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Target className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-semibold text-slate-300 mb-1">
                {selectedIndustry !== 'all' 
                  ? `【${selectedIndustry}】行业分类下暂无符合条件的备选标的`
                  : (poolMode === 'filtered' ? '当前筛选条件下暂无符合的股票' : '自选关注池暂无标的')}
              </p>
              <p className="text-slate-500 mb-4 max-w-md mx-auto">
                {selectedIndustry !== 'all'
                  ? '您可以切换至其他行业分类或点击“全部行业”查看全量标的。'
                  : poolMode === 'filtered'
                  ? '请在主界面调整 PE、股息率或行业筛选范围，或切换至【我的自选关注池】查看已保存标的。'
                  : '可在上方搜索框输入任意股票名称/代码加入，或从【当前筛选池】一键批量导入。'}
              </p>
              {selectedIndustry !== 'all' ? (
                <button
                  onClick={() => setSelectedIndustry('all')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-md"
                >
                  查看全部行业标的 ({calculatedItems.length})
                </button>
              ) : poolMode === 'watchlist' && (
                <button
                  onClick={handleResetToDefault}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-md"
                >
                  恢复默认典范高股息备选标的
                </button>
              )}
            </div>
          ) : viewMode === 'grouped' ? (
            /* Mode A: 按所属行业分类与分组展示 (Grouped View) */
            <div className="space-y-4">
              
              {/* Sticky Table Header for Reference */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none rounded-xl border border-slate-800">
                <div className="col-span-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="accent-rose-500 rounded cursor-pointer w-3.5 h-3.5 shrink-0"
                    title={isAllSelected ? "取消全选" : "全选当前标的"}
                  />
                  <span>股票名称 / 代码 / 行业</span>
                </div>
                <div className="col-span-2 text-right">现价 / 现行股息率</div>
                <div className="col-span-2 text-center">理想目标股息率</div>
                <div className="col-span-2 text-right">目标买入价位</div>
                <div className="col-span-2 text-center">需跌百分比 / 状态</div>
                <div className="col-span-1 text-right">操作</div>
              </div>

              {/* Render Industry Groups */}
              {groupedItems.map((group) => {
                const meta = getIndustryMeta(group.industry);
                const Icon = meta.icon;
                const isCollapsed = !!collapsedIndustries[group.industry];
                const groupCodes = group.items.map((i) => i.stock.code);
                const isGroupAllSelected = groupCodes.length > 0 && groupCodes.every((c) => selectedCodes.includes(c));
                const isGroupSomeSelected = groupCodes.some((c) => selectedCodes.includes(c)) && !isGroupAllSelected;
                const isBatchOpen = activeIndustryBatchYield?.industry === group.industry;

                return (
                  <div
                    key={group.industry}
                    className={`rounded-xl border transition overflow-hidden shadow-sm ${
                      isCollapsed ? 'border-slate-800 bg-slate-950/40' : `${meta.border} bg-slate-950/60`
                    }`}
                  >
                    {/* Industry Group Header Bar */}
                    <div className={`px-4 py-3 flex items-center justify-between flex-wrap gap-2 transition ${meta.bg} border-b ${meta.border}`}>
                      
                      {/* Left: Checkbox + Industry Title & Count */}
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isGroupAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isGroupSomeSelected;
                          }}
                          onChange={() => handleToggleSelectIndustry(group.items)}
                          className="accent-rose-500 rounded cursor-pointer w-3.5 h-3.5 shrink-0"
                          title={isGroupAllSelected ? "取消勾选本行业全部标的" : "一键勾选本行业全部标的"}
                        />

                        <button
                          onClick={() => handleToggleCollapseIndustry(group.industry)}
                          className="flex items-center gap-2 font-bold text-slate-100 hover:text-white transition text-left group"
                        >
                          <div className={`p-1.5 rounded-lg ${meta.badgeBg} border ${meta.border}`}>
                            <Icon className={`w-4 h-4 ${meta.color}`} />
                          </div>
                          <span className="text-sm font-black">{group.industry}</span>
                          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${meta.border} ${meta.color}`}>
                            {group.items.length} 只标的
                          </span>
                        </button>
                      </div>

                      {/* Middle: Industry Sector Aggregates */}
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        {group.reachedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{group.reachedCount} 只已达标</span>
                          </span>
                        )}

                        {group.closeCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[11px] font-semibold flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-orange-400" />
                            <span>{group.closeCount} 只临界</span>
                          </span>
                        )}

                        <div className="text-[11px] text-slate-400 hidden md:flex items-center gap-2 font-mono">
                          <span>现行均值: <strong className="text-rose-400">{group.avgCurrentYield.toFixed(2)}%</strong></span>
                          <span>•</span>
                          <span>目标均值: <strong className="text-amber-400">{group.avgTargetYield.toFixed(2)}%</strong></span>
                          <span>•</span>
                          <span>均需跌: <strong className={group.avgDropNeeded <= 0 ? 'text-emerald-400' : 'text-slate-300'}>{group.avgDropNeeded.toFixed(1)}%</strong></span>
                        </div>
                      </div>

                      {/* Right: Quick Batch Yield for This Sector & Collapse Arrow */}
                      <div className="flex items-center gap-2">
                        {/* 行业定制理想股息率快捷点选 */}
                        <div className="hidden sm:flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5">
                          <span className="text-[10px] text-slate-400 pl-1">行业设:</span>
                          {meta.presets.map((p) => (
                            <button
                              key={p}
                              onClick={() => handleApplyIndustryTargetYield(group.industry, p)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:text-white hover:bg-slate-750 transition"
                              title={`将【${group.industry}】板块所有标的理想股息率一键设为 ${p}%`}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>

                        {/* 单行业一键导出高清图片清单 (表头格式：该行业名称·理想目标买入价测算清单) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportIndustryImage(group.industry);
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition flex items-center gap-1 active:scale-95 shadow-sm"
                          title={`一键导出【${group.industry}·理想目标买入价测算清单】高清图片`}
                        >
                          <Target className="w-3 h-3 text-rose-400" />
                          <span className="hidden sm:inline">导出清单图</span>
                          <span className="sm:hidden">导图</span>
                        </button>

                        {/* Collapse/Expand Arrow */}
                        <button
                          onClick={() => handleToggleCollapseIndustry(group.industry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                          title={isCollapsed ? "展开本行业" : "折叠本行业"}
                        >
                          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                    </div>

                    {/* Stock Rows inside this Industry */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-800/80 bg-slate-950/40">
                        {group.items.map((item) => renderStockRow(item))}
                      </div>
                    )}

                  </div>
                );
              })}

            </div>
          ) : (
            /* Mode B: 平铺列表视图 (Flat List) */
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
              
              {/* Table Header Row */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none sticky top-0 z-10">
                <div className="col-span-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="accent-rose-500 rounded cursor-pointer w-3.5 h-3.5 shrink-0"
                    title={isAllSelected ? "取消全选" : "全选当前标的"}
                  />
                  <span>股票名称 / 代码 / 行业</span>
                </div>
                <div className="col-span-2 text-right">现价 / 现行股息率</div>
                <div className="col-span-2 text-center">理想目标股息率</div>
                <div className="col-span-2 text-right">目标买入价位</div>
                <div className="col-span-2 text-center">需跌百分比 / 状态</div>
                <div className="col-span-1 text-right">操作</div>
              </div>

              {/* Table Content Rows */}
              {displayedItems.map((item) => renderStockRow(item))}

            </div>
          )}

          {/* Educational Calculation Formula & Value Principle Card */}
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <HelpCircle className="w-4 h-4 text-rose-400" />
                <span>目标买入价与需跌空间测算逻辑</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">格雷厄姆与巴菲特高股息安全边际模型 · 支持行业横向对比</span>
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
                <div className="text-slate-300 font-medium mb-1 font-mono">3. 分行业目标股息率配置心法</div>
                <p className="text-slate-400">
                  周期性煤炭/航运可定 7%~8% 安全垫；银行/公路公用事业可定 5%~6%；高成长家电食品饮料定 4%~5% 即可具备强劲复利护城河。
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
                <span>
                  当前正在测算【{strategyInfo.title}】的 {selectedIndustry !== 'all' ? `${selectedIndustry}板块` : '全部'} {displayedItems.length} 只股票
                </span>
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
              <Target className="w-4 h-4 text-amber-400" />
              <span>{selectedCodes.length > 0 ? `导出已选测算图 (${selectedCodes.length})` : '导出图片清单'}</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold shadow-md shadow-rose-950/40 transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>{selectedCodes.length > 0 ? `导出已选Excel (${selectedCodes.length})` : '导出Excel方案'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Export Target Watchlist Image Modal */}
      <ExportTargetWatchlistImageModal
        isOpen={isExportImageOpen}
        onClose={() => {
          setIsExportImageOpen(false);
          setIndustryExportTarget(null);
        }}
        items={exportItems}
        avatarStyle={avatarStyle}
        criteria={criteria}
        defaultTitle={exportImageTitle}
      />
    </div>
  );
};
