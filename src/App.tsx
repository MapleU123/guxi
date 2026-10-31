import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Stock, FilterCriteria, SortConfig, SortField, DividendAnomalyAlert, TargetDividendWatchItem, TargetDividendCalculatedStock, UserSession } from './types';
import { INITIAL_STOCKS } from './data/stocksData';
import { 
  filterStocks, 
  calculateNormalizedScores, 
  simulateRealtimeQuotes, 
  checkDividendYieldAnomalies,
  simulateMarketShock,
  getStockValuationStatus,
  calculateTargetDividendProfile
} from './utils/calculator';
import { fetchBatchRealtimeQuotes, applyRealtimeQuoteToStock } from './utils/realtimeQuoteService';
import { Header } from './components/Header';
import { MarketOverviewBar } from './components/MarketOverviewBar';
import { StrategyPresets } from './components/StrategyPresets';
import { FilterPanel } from './components/FilterPanel';
import { StockTable } from './components/StockTable';
import { StockDetailModal } from './components/StockDetailModal';
import { LeaderScoreExplainerModal } from './components/LeaderScoreExplainerModal';
import { DividendPortfolioDrawer } from './components/DividendPortfolioDrawer';
import { DividendAnomalyFloatingAlert } from './components/DividendAnomalyFloatingAlert';
import { DividendAlertHistoryModal } from './components/DividendAlertHistoryModal';
import { ExportImageModal } from './components/ExportImageModal';
import { ExportTargetWatchlistImageModal } from './components/ExportTargetWatchlistImageModal';
import { AvatarSelectorModal, AvatarStyle } from './components/AvatarSelectorModal';
import { CustomStockImportModal } from './components/CustomStockImportModal';
import { MarketUniverseModal } from './components/MarketUniverseModal';
import { TargetWatchlistModal } from './components/TargetWatchlistModal';
import { AuthModal } from './components/AuthModal';
import { PieChart, Download, Layers, ShieldCheck, Sparkles, HelpCircle, Image as ImageIcon, Target, BookmarkPlus } from 'lucide-react';
import { exportToExcel } from './utils/exportExcel';
import { getOfficialAccountConfig } from './utils/wechatPairingService';

const CUSTOM_STOCKS_STORAGE_KEY = 'a_share_dividend_custom_stocks';
const TARGET_WATCHLIST_STORAGE_KEY = 'a_share_dividend_target_watchlist_v1';
const USER_SESSION_STORAGE_KEY = 'a_share_user_session_v1';

function loadStoredUserSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(USER_SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isLoggedIn) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load user session', e);
  }
  return null;
}

const DEFAULT_TARGET_WATCHLIST: TargetDividendWatchItem[] = [
  { code: '601088', name: '中国神华', targetYield: 7.0, targetDividendYield: 7.0, notes: '煤炭现金奶牛，等待理想7%股息率低吸', customNote: '煤炭现金奶牛，等待理想7%股息率低吸', addedAt: '2026-03-01' },
  { code: '600036', name: '招商银行', targetYield: 6.0, targetDividendYield: 6.0, notes: '零售银行龙头，目标6%股息率分批建仓', customNote: '零售银行龙头，目标6%股息率分批建仓', addedAt: '2026-03-01' },
  { code: '600066', name: '宇通客车', targetYield: 6.2, targetDividendYield: 6.2, notes: '汽车现金奶牛超高分红，目标6.2%股息率', customNote: '汽车现金奶牛超高分红，目标6.2%股息率', addedAt: '2026-03-01' },
  { code: '600863', name: '内蒙华电', targetYield: 5.5, targetDividendYield: 5.5, notes: '华能蒙电70%分红率承诺，目标5.5%股息率', customNote: '华能蒙电70%分红率承诺，目标5.5%股息率', addedAt: '2026-03-01' },
  { code: '002807', name: '江阴银行', targetYield: 5.2, targetDividendYield: 5.2, notes: '苏南优质农商行，目标5.2%股息率', customNote: '苏南优质农商行，目标5.2%股息率', addedAt: '2026-03-01' },
  { code: '600900', name: '长江电力', targetYield: 4.5, targetDividendYield: 4.5, notes: '水电大公用事业，理想4.5%股息率配置', customNote: '水电大公用事业，理想4.5%股息率配置', addedAt: '2026-03-01' },
  { code: '000651', name: '格力电器', targetYield: 6.5, targetDividendYield: 6.5, notes: '家电高股息龙头，目标6.5%股息率', customNote: '家电高股息龙头，目标6.5%股息率', addedAt: '2026-03-01' },
  { code: '601225', name: '陕西煤业', targetYield: 7.5, targetDividendYield: 7.5, notes: '高分红标杆，关注理想7.5%收益率买点', customNote: '高分红标杆，关注理想7.5%收益率买点', addedAt: '2026-03-01' }
];

function loadStoredTargetWatchlist(): TargetDividendWatchItem[] {
  try {
    const raw = localStorage.getItem(TARGET_WATCHLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          ...item,
          targetYield: item.targetYield ?? item.targetDividendYield ?? 5.0,
          targetDividendYield: item.targetDividendYield ?? item.targetYield ?? 5.0
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load target watchlist from storage', e);
  }
  return DEFAULT_TARGET_WATCHLIST;
}

function loadStoredCustomStocks(): Stock[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STOCKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(s => ({ ...s, isCustom: true }));
      }
    }
  } catch (e) {
    console.error('Failed to load custom stocks from storage', e);
  }
  return [];
}

const DEFAULT_CRITERIA: FilterCriteria = {
  dividendYieldType: 'ttm',
  minDividendYield: 3.0,
  maxPE: 20,
  excludeST: true,
  excludeDelisted: true,
  selectedIndustries: [],
  minMarketCap: 0,
  minROE: 0,
  minDividendYears: 0,
  searchQuery: ''
};

export default function App() {
  // 1. Raw Stock Universe (合并内置标的与用户自定义导入标的)
  const [stocks, setStocks] = useState<Stock[]>(() => {
    const stored = loadStoredCustomStocks();
    if (stored.length === 0) return INITIAL_STOCKS;
    const customCodes = new Set(stored.map(s => s.code));
    const baseWithoutCustom = INITIAL_STOCKS.filter(s => !customCodes.has(s.code));
    return [...stored, ...baseWithoutCustom];
  });

  // 2. Filter Criteria
  const [criteria, setCriteria] = useState<FilterCriteria>(DEFAULT_CRITERIA);

  // 3. Sorting Configuration (默认按龙头综合分降序)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'leaderScore',
    direction: 'desc'
  });

  // 4. Real-time Refresh State
  const [lastUpdated, setLastUpdated] = useState<string>('15:00:00');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // 默认10秒自动刷新

  // 5. Selected Stocks for Portfolio / Comparison
  const [selectedStockCodes, setSelectedStockCodes] = useState<string[]>([
    '601088', '600036', '600900', '000651', '601225' // 默认预选5只标杆
  ]);

  // 6. Real-time Dividend Yield Anomaly Alerts State (波动超过 ±10%)
  const [activeFloatingAlerts, setActiveFloatingAlerts] = useState<DividendAnomalyAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<DividendAnomalyAlert[]>([]);
  const [isAlertHistoryOpen, setIsAlertHistoryOpen] = useState<boolean>(false);

  // 7. Modals & Drawers
  const [selectedStockDetail, setSelectedStockDetail] = useState<Stock | null>(null);
  const [isExplainerOpen, setIsExplainerOpen] = useState<boolean>(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(false); // 默认收起，点击任意入口即可打开
  const [rightSidebarMode, setRightSidebarMode] = useState<'docked' | 'drawer'>('drawer'); // 默认全屏覆盖抽屉，保证任何视口立即可见
  const [isExportImageModalOpen, setIsExportImageModalOpen] = useState<boolean>(false);
  const [customExportStocks, setCustomExportStocks] = useState<Stock[] | null>(null);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('whiteThreeSoldiers');
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isMarketUniverseOpen, setIsMarketUniverseOpen] = useState<boolean>(false);
  const [isTargetWatchlistOpen, setIsTargetWatchlistOpen] = useState<boolean>(false);
  const [isTargetExportModalOpen, setIsTargetExportModalOpen] = useState<boolean>(false);
  const [targetExportItems, setTargetExportItems] = useState<TargetDividendCalculatedStock[]>([]);

  // 8. 用户鉴权状态 (微信 / 邮箱 登录限制)
  const [userSession, setUserSession] = useState<UserSession | null>(() => loadStoredUserSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalPrompt, setAuthModalPrompt] = useState<string | undefined>(undefined);

  const handleLoginSuccess = useCallback((session: UserSession) => {
    setUserSession(session);
    try {
      localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save user session', e);
    }
    setIsAuthModalOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    setUserSession(null);
    try {
      localStorage.removeItem(USER_SESSION_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove user session', e);
    }
  }, []);

  const [authModalTab, setAuthModalTab] = useState<'wechat' | 'email'>('wechat');

  const handleOpenAuthModal = useCallback((tab: 'wechat' | 'email' = 'wechat') => {
    setAuthModalTab(tab);
    setAuthModalPrompt(tab === 'email' ? '输入电子邮箱账号，免关注即可登录并解锁全站 5,652 只标的与全部功能' : '微信扫码关注公众号，回复配对码即可免密解锁全部权限');
    setIsAuthModalOpen(true);
  }, []);

  const handleRequireLogin = useCallback((prompt?: string, tab: 'wechat' | 'email' = 'wechat') => {
    setAuthModalTab(tab);
    setAuthModalPrompt(prompt || '当前仅预览前 8 只高股息标的，微信或邮箱一键登录后立即解锁全部标的与高级导出功能');
    setIsAuthModalOpen(true);
  }, []);

  // 9. 理想股息率备选股票池状态
  const [watchItems, setWatchItems] = useState<TargetDividendWatchItem[]>(() => loadStoredTargetWatchlist());

  // 同步保存备选股票池到 LocalStorage
  const saveWatchItems = useCallback((items: TargetDividendWatchItem[]) => {
    setWatchItems(items);
    try {
      localStorage.setItem(TARGET_WATCHLIST_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save target watchlist:', e);
    }
  }, []);

  const handleSaveTargetWatchItem = useCallback((item: TargetDividendWatchItem) => {
    setWatchItems((prev) => {
      const idx = prev.findIndex(w => w.code === item.code);
      let next: TargetDividendWatchItem[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = item;
      } else {
        next = [item, ...prev];
      }
      try {
        localStorage.setItem(TARGET_WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  const handleRemoveTargetWatchItem = useCallback((code: string) => {
    setWatchItems((prev) => {
      const next = prev.filter(w => w.code !== code);
      try {
        localStorage.setItem(TARGET_WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  const handleToggleTargetWatchlist = useCallback((stock: Stock) => {
    setWatchItems((prev) => {
      const currentList = Array.isArray(prev) ? prev : [];
      const exists = currentList.some(w => w?.code === stock.code);
      let next: TargetDividendWatchItem[];
      if (exists) {
        next = currentList.filter(w => w?.code !== stock.code);
      } else {
        const defaultTargetYield = Math.max(5.0, Number((stock.ttmDividendYield * 1.15).toFixed(1)));
        next = [
          {
            code: stock.code,
            name: stock.name,
            targetYield: defaultTargetYield,
            targetDividendYield: defaultTargetYield,
            notes: '',
            customNote: '',
            addedAt: new Date().toISOString().split('T')[0]
          },
          ...currentList
        ];
      }
      try {
        localStorage.setItem(TARGET_WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  // 计算备选池中达标的数量
  const targetReachedCount = useMemo(() => {
    let count = 0;
    if (!Array.isArray(watchItems)) return 0;
    for (const item of watchItems) {
      if (!item || !item.code) continue;
      const st = stocks.find(s => s.code === item.code);
      if (st) {
        const targetYield = item.targetDividendYield ?? item.targetYield ?? 5.0;
        const profile = calculateTargetDividendProfile(st, targetYield);
        if (profile.isReached) {
          count++;
        }
      }
    }
    return count;
  }, [watchItems, stocks]);

  // Custom Stock Handlers
  const handleAddCustomStocks = useCallback((newStocks: Stock[]) => {
    setStocks((prev) => {
      const newCodes = new Set(newStocks.map(s => s.code));
      const filteredPrev = prev.filter(s => !newCodes.has(s.code));
      const combined = [...newStocks, ...filteredPrev];
      
      const allCustom = combined.filter(s => s.isCustom);
      try {
        localStorage.setItem(CUSTOM_STOCKS_STORAGE_KEY, JSON.stringify(allCustom));
      } catch (e) {
        console.error(e);
      }
      return combined;
    });
  }, []);

  const handleUpdateCustomStock = useCallback((updatedStock: Stock) => {
    setStocks((prev) => {
      const next = prev.map(s => s.code === updatedStock.code ? { ...updatedStock } : s);
      const allCustom = next.filter(s => s.isCustom);
      try {
        localStorage.setItem(CUSTOM_STOCKS_STORAGE_KEY, JSON.stringify(allCustom));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  const handleDeleteCustomStock = useCallback((code: string) => {
    setStocks((prev) => {
      const baseStock = INITIAL_STOCKS.find(s => s.code === code);
      let next: Stock[];
      if (baseStock) {
        next = prev.map(s => s.code === code ? { ...baseStock, isCustom: false } : s);
      } else {
        next = prev.filter(s => s.code !== code);
      }
      const allCustom = next.filter(s => s.isCustom);
      try {
        localStorage.setItem(CUSTOM_STOCKS_STORAGE_KEY, JSON.stringify(allCustom));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  const handleClearAllCustomStocks = useCallback(() => {
    try {
      localStorage.removeItem(CUSTOM_STOCKS_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    setStocks(INITIAL_STOCKS);
  }, []);

  // Count of custom stocks
  const customStocksCount = useMemo(() => {
    return stocks.filter(s => s.isCustom).length;
  }, [stocks]);

  // 查询当天真实股价与刷新行情处理器
  const handleRefreshQuotes = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 提取当前所有股票代码进行批量真实行情查询
      const codes = stocks.map(s => s.code);
      const quotesMap = await fetchBatchRealtimeQuotes(codes);
      
      const hasRealQuotes = Object.keys(quotesMap).length > 0;

      setStocks((prev) => {
        let next: Stock[];
        if (hasRealQuotes) {
          next = prev.map(s => {
            const q = quotesMap[s.code] || quotesMap[s.code.replace(/\D/g, '')];
            return q ? applyRealtimeQuoteToStock(s, q) : s;
          });
        } else {
          // 若网络离线则使用微波动模拟
          next = simulateRealtimeQuotes(prev);
        }

        // 检测是否有标的盘中股息率波动超过 ±10%
        const anomalies = checkDividendYieldAnomalies(next, 10.0);
        if (anomalies.length > 0) {
          setActiveFloatingAlerts((old) => {
            const existingIds = new Set(old.map(a => a.stockCode));
            const newOnes = anomalies.filter(a => !existingIds.has(a.stockCode));
            return [...anomalies, ...old.filter(o => !newOnes.some(n => n.stockCode === o.stockCode))].slice(0, 6);
          });
          setAlertHistory((old) => [...anomalies, ...old].slice(0, 50));
        }
        return next;
      });

      const now = new Date();
      setLastUpdated(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
    } catch (err) {
      console.error('Failed to refresh realtime quotes:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [stocks]);

  // 初次加载时自动从交易所查询当天的真实股价
  useEffect(() => {
    handleRefreshQuotes();
  }, []);

  // Trigger Flash Market Shock (模拟盘中剧烈振幅，触发 ±10% 股息率异动预警)
  const handleTriggerShock = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setStocks((prev) => {
        const next = simulateMarketShock(prev);
        const anomalies = checkDividendYieldAnomalies(next, 10.0);
        if (anomalies.length > 0) {
          setActiveFloatingAlerts((old) => [...anomalies, ...old].slice(0, 6));
          setAlertHistory((old) => [...anomalies, ...old].slice(0, 50));
        }
        return next;
      });
      const now = new Date();
      setLastUpdated(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
      setIsRefreshing(false);
    }, 250);
  }, []);

  // Auto Refresh Interval Effect
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const timer = setInterval(() => {
      handleRefreshQuotes();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval, handleRefreshQuotes]);

  // Filter & Compute Normalized Scores
  const processedStocks = useMemo(() => {
    // Step 1: Filter
    const filtered = filterStocks(stocks, criteria);

    // Step 2: Compute Result-Set Normalization & Leader Scores
    // (综合分 = 市值×40% + ROE×25% + 营收增速×15% + 净利增速×20%)
    const scored = calculateNormalizedScores(filtered);

    // Step 3: Sort
    const sorted = [...scored].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortConfig.field === 'valuation') {
        aVal = getStockValuationStatus(a).score;
        bVal = getStockValuationStatus(b).score;
      } else if (sortConfig.field === 'pePercentile') {
        aVal = a.pePercentile ?? 50;
        bVal = b.pePercentile ?? 50;
      } else {
        aVal = a[sortConfig.field] as number;
        bVal = b[sortConfig.field] as number;
      }

      if (aVal === undefined || isNaN(aVal)) aVal = 0;
      if (bVal === undefined || isNaN(bVal)) bVal = 0;

      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return sorted;
  }, [stocks, criteria, sortConfig]);

  // Sorting Toggle Handler
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'desc' ? 'asc' : 'desc'
        };
      }
      return {
        field,
        direction: (field === 'valuation' || field === 'pe' || field === 'pePercentile') ? 'asc' : 'desc' // 估值与PE默认低估优先
      };
    });
  };

  // Stock Selection Handlers
  const handleToggleSelectStock = (code: string) => {
    setSelectedStockCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedStockCodes.length === processedStocks.length) {
      setSelectedStockCodes([]);
    } else {
      setSelectedStockCodes(processedStocks.map((s) => s.code));
    }
  };

  const handleRemoveFromPortfolio = (code: string) => {
    setSelectedStockCodes((prev) => prev.filter((c) => c !== code));
  };

  const handleClearPortfolio = () => {
    setSelectedStockCodes([]);
  };

  // Alert Bubble Handlers
  const handleDismissFloatingAlert = (id: string) => {
    setActiveFloatingAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDismissAllFloatingAlerts = () => {
    setActiveFloatingAlerts([]);
  };

  const handleSelectStockByCode = (stockCode: string) => {
    const target = stocks.find((s) => s.code === stockCode);
    if (target) {
      setSelectedStockDetail(target);
    }
  };

  // Portfolio Stocks Object List
  const selectedPortfolioStocks = useMemo(() => {
    return stocks.filter((s) => selectedStockCodes.includes(s.code));
  }, [stocks, selectedStockCodes]);

  // 批量将股票加入理想股息率备选池
  const handleBatchAddTargetWatchlist = useCallback((stocksToAdd: Stock[]) => {
    if (stocksToAdd.length === 0) return;
    setWatchItems((prev) => {
      const currentList = Array.isArray(prev) ? prev : [];
      const currentCodes = new Set(currentList.map(w => w?.code));
      const newItems: TargetDividendWatchItem[] = [];

      stocksToAdd.forEach(stock => {
        if (!currentCodes.has(stock.code)) {
          const defaultTargetYield = Math.max(5.0, Number((stock.ttmDividendYield * 1.15).toFixed(1)));
          newItems.push({
            code: stock.code,
            name: stock.name,
            targetYield: defaultTargetYield,
            targetDividendYield: defaultTargetYield,
            notes: '从主表勾选批量自选加入',
            customNote: '从主表勾选批量自选加入',
            addedAt: new Date().toISOString().split('T')[0]
          });
        }
      });

      const next = [...newItems, ...currentList];
      try {
        localStorage.setItem(TARGET_WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    setIsTargetWatchlistOpen(true);
  }, []);

  // 导出已选标的的理想目标买入价测算
  const handleExportTargetWatchlistForSelected = useCallback(() => {
    if (selectedStockCodes.length === 0) return;
    if (!userSession?.isLoggedIn) {
      handleRequireLogin(`🎁 导出目标买入价测算高清长图：关注公众号【${getOfficialAccountConfig().name}】回复配对码即可免费打包下载！`);
      return;
    }
    const selectedStocks = stocks.filter((s) => selectedStockCodes.includes(s.code));
    const calculated: TargetDividendCalculatedStock[] = selectedStocks.map((stock) => {
      // 优先读取自选池设定的理想股息率，否则根据当前股息率给一个有吸引力的进取目标值 (如现股息率+1.0%或至少5.5%)
      const watchItem = watchItems.find((w) => w.code === stock.code);
      const targetYield = watchItem?.targetDividendYield ?? watchItem?.targetYield ?? (
        stock.ttmDividendYield > 0 ? Number((stock.ttmDividendYield + 1.0).toFixed(1)) : 6.0
      );
      return calculateTargetDividendProfile(stock, targetYield);
    });
    setTargetExportItems(calculated);
    setIsTargetExportModalOpen(true);
  }, [selectedStockCodes, stocks, watchItems, userSession, handleRequireLogin]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white pb-20">
      
      {/* Realtime Floating Anomaly Alert Bubble (悬浮提示小气泡实时预警) */}
      <DividendAnomalyFloatingAlert
        alerts={activeFloatingAlerts}
        onDismiss={handleDismissFloatingAlert}
        onDismissAll={handleDismissAllFloatingAlerts}
        onSelectStock={handleSelectStockByCode}
        onToggleSelectStock={handleToggleSelectStock}
        selectedStockCodes={selectedStockCodes}
      />

      {/* Header Bar */}
      <Header
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshQuotes}
        autoRefreshInterval={autoRefreshInterval}
        setAutoRefreshInterval={setAutoRefreshInterval}
        filteredStocks={processedStocks}
        criteria={criteria}
        onOpenExplainer={() => setIsExplainerOpen(true)}
        alertsCount={activeFloatingAlerts.length || alertHistory.length}
        onOpenAlerts={() => setIsAlertHistoryOpen(true)}
        onTriggerShock={handleTriggerShock}
        onOpenExportImage={() => {
          if (!userSession?.isLoggedIn) {
            handleRequireLogin(`🎁 导出高清无水印估值清单长图：关注公众号【${getOfficialAccountConfig().name}】回复配对码即可免费打包下载！`);
            return;
          }
          setCustomExportStocks(null);
          setIsExportImageModalOpen(true);
        }}
        avatarStyle={avatarStyle}
        onOpenAvatarSelector={() => setIsAvatarSelectorOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenMarketUniverse={() => setIsMarketUniverseOpen(true)}
        customStocksCount={customStocksCount}
        onOpenTargetWatchlist={() => setIsTargetWatchlistOpen(true)}
        targetWatchlistCount={watchItems.length}
        targetReachedCount={targetReachedCount}
        onOpenPortfolioDrawer={() => {
          setIsRightSidebarOpen(true);
          setRightSidebarMode('drawer');
        }}
        portfolioCount={selectedStockCodes.length}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={() => {
          setIsRightSidebarOpen(prev => !prev);
          setRightSidebarMode('drawer');
        }}
        userSession={userSession}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300 ${
        isRightSidebarOpen && rightSidebarMode === 'docked' ? 'max-w-[1920px]' : 'max-w-7xl'
      }`}>
        
        {/* Strategy Presets Bar */}
        <StrategyPresets
          currentCriteria={criteria}
          onApplyPreset={(newCrit) => setCriteria((prev) => ({ ...prev, ...newCrit }))}
          onReset={() => setCriteria(DEFAULT_CRITERIA)}
          matchedCount={processedStocks.length}
        />

        {/* Market Overview Ribbon */}
        <MarketOverviewBar
          filteredStocks={processedStocks}
          totalStockCount={stocks.length}
          onSelectStock={(stock) => setSelectedStockDetail(stock)}
          onOpenMarketUniverse={() => setIsMarketUniverseOpen(true)}
          selectedIndustries={criteria.selectedIndustries}
          onFilterIndustry={(industry) => {
            setCriteria((prev) => {
              const exists = prev.selectedIndustries.includes(industry);
              const nextInds = exists && prev.selectedIndustries.length === 1 ? [] : [industry];
              const newCrit = {
                ...prev,
                selectedIndustries: nextInds
              };
              if (nextInds.length === 1) {
                if (nextInds[0] === '水电' && prev.minDividendYield > 1.8) {
                  newCrit.minDividendYield = 1.8;
                  newCrit.maxPE = Math.max(prev.maxPE, 25);
                } else if (nextInds[0] === '保险' && prev.minDividendYield > 2.0) {
                  newCrit.minDividendYield = 2.0;
                }
              }
              return newCrit;
            });
          }}
        />

        {/* Filter Control Panel */}
        <FilterPanel
          criteria={criteria}
          onChange={setCriteria}
          allStocks={stocks}
          filteredCount={processedStocks.length}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onSelectStock={(stock) => setSelectedStockDetail(stock)}
          onAddCustomStock={handleAddCustomStocks}
          onOpenMarketUniverse={() => setIsMarketUniverseOpen(true)}
        />

        {/* Main Content Flex Section: Left Stock Table, Right Sidebar */}
        <div className="flex flex-col xl:flex-row items-start gap-6">
          <div className="flex-1 min-w-0 w-full">
            <StockTable
              stocks={processedStocks}
              sortConfig={sortConfig}
              onSort={handleSort}
              onSelectStock={(stock) => setSelectedStockDetail(stock)}
              selectedStockCodes={selectedStockCodes}
              onToggleSelectStock={handleToggleSelectStock}
              onToggleSelectAll={handleToggleSelectAll}
              searchQuery={criteria.searchQuery}
              onClearSearch={() => setCriteria((prev) => ({ ...prev, searchQuery: '' }))}
              onAddCustomStock={handleAddCustomStocks}
              targetWatchlistCodes={watchItems.map(w => w.code)}
              onToggleTargetWatchlist={handleToggleTargetWatchlist}
              onOpenTargetWatchlist={() => setIsTargetWatchlistOpen(true)}
              onExportTargetWatchlistForSelected={handleExportTargetWatchlistForSelected}
              onOpenExportImage={() => {
                if (!userSession?.isLoggedIn) {
                  handleRequireLogin('导出高清估值图片清单需要先登录账号');
                  return;
                }
                setCustomExportStocks(null);
                setIsExportImageModalOpen(true);
              }}
              onOpenPortfolioDrawer={() => {
                setIsRightSidebarOpen(true);
                setRightSidebarMode('drawer');
              }}
              isLoggedIn={Boolean(userSession?.isLoggedIn)}
              onRequireLogin={handleRequireLogin}
              onLoginSuccess={handleLoginSuccess}
            />
          </div>

          {/* DOCKED RIGHT SIDEBAR (常驻右侧分屏栏) */}
          {isRightSidebarOpen && rightSidebarMode === 'docked' && (
            <DividendPortfolioDrawer
              isOpen={true}
              mode="docked"
              onToggleMode={() => setRightSidebarMode('drawer')}
              onClose={() => setIsRightSidebarOpen(false)}
              selectedStocks={selectedPortfolioStocks}
              onRemoveStock={handleRemoveFromPortfolio}
              onClearAll={handleClearPortfolio}
              onAddPresetStocks={() => {
                setSelectedStockCodes(['601088', '600036', '600900', '000651', '601225']);
              }}
              onAddAllFiltered={() => {
                setSelectedStockCodes(processedStocks.map(s => s.code));
              }}
              filteredCount={processedStocks.length}
            />
          )}
        </div>

        {/* Bottom Educational Banner */}
        <div className="mt-8 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              已严格执行选股准则：默认剔除ST、*ST及退市整理期风险标的，动态追踪每股分红与盘口现价，支持理想股息率备选池自动倒推目标建仓价与需跌空间。
            </span>
          </div>
          <button
            onClick={() => setIsExplainerOpen(true)}
            className="text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap transition underline underline-offset-2 flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            查看龙头综合分权重拆解
          </button>
        </div>

      </main>

      {/* Floating Bottom Bar for Portfolio Action */}
      {selectedStockCodes.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-rose-500/40 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200 flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-xs text-slate-200 font-medium">
              已勾选 <strong className="text-rose-400 font-bold">{selectedStockCodes.length}</strong> 只高股息标的
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 一键将选中的标的加入我的自选备选池 */}
            <button
              onClick={() => handleBatchAddTargetWatchlist(selectedPortfolioStocks)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs shadow-md transition active:scale-95 cursor-pointer"
              title="将勾选的标的一键加入【我的自选备选池】并进入目标价测算"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>加入自选备选池 ({selectedStockCodes.length})</span>
            </button>

            {/* 核心：选中目标之后，导出理想目标买入价测算图 */}
            <button
              onClick={handleExportTargetWatchlistForSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:via-rose-500/30 hover:to-emerald-500/30 text-amber-300 border border-amber-500/50 font-semibold text-xs shadow-md transition active:scale-95 cursor-pointer"
              title="导出已勾选标的的理想目标买入价、每股分红、需跌空间及测算公式高清图"
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>导出目标买入价测算 ({selectedStockCodes.length})</span>
            </button>

            <button
              onClick={() => {
                setIsRightSidebarOpen(true);
                setRightSidebarMode('drawer');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>测算组合现金流</span>
            </button>

            <button
              onClick={() => {
                if (!userSession?.isLoggedIn) {
                  handleRequireLogin(`🎁 导出高清无水印估值清单长图：关注公众号【${getOfficialAccountConfig().name}】回复配对码即可免费打包下载！`);
                  return;
                }
                setCustomExportStocks(selectedPortfolioStocks);
                setIsExportImageModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 font-medium text-xs transition active:scale-95 cursor-pointer"
              title="将已勾选标的高清导出为综合估值图片清单"
            >
              <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>导出估值图片</span>
            </button>

            <button
              onClick={() => {
                if (!userSession?.isLoggedIn) {
                  handleRequireLogin(`🎁 打包下载已选高股息投资 Excel 底表：关注公众号【${getOfficialAccountConfig().name}】回复配对码即可免费获取！`);
                  return;
                }
                exportToExcel(selectedPortfolioStocks, criteria);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>导出已选 ({selectedStockCodes.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Stock Detail Dossier Modal */}
      <StockDetailModal
        stock={selectedStockDetail}
        allStocks={stocks}
        onClose={() => setSelectedStockDetail(null)}
        onUpdateStock={handleUpdateCustomStock}
        targetWatchItem={selectedStockDetail ? watchItems.find(w => w.code === selectedStockDetail.code) : undefined}
        onSaveTargetWatchItem={handleSaveTargetWatchItem}
        onRemoveTargetWatchItem={handleRemoveTargetWatchItem}
      />

      {/* 理想股息率备选股票池 (Target Dividend Watchlist) Modal */}
      <TargetWatchlistModal
        isOpen={isTargetWatchlistOpen}
        onClose={() => setIsTargetWatchlistOpen(false)}
        allStocks={stocks}
        filteredStocks={processedStocks}
        criteria={criteria}
        watchItems={watchItems}
        onUpdateWatchItems={saveWatchItems}
        onSelectStock={(stock) => setSelectedStockDetail(stock)}
        onAddCustomStock={handleAddCustomStocks}
        avatarStyle={avatarStyle}
        onRefreshQuotes={handleRefreshQuotes}
        isRefreshing={isRefreshing}
      />

      {/* Export Image Preview & Download Modal (基础估值清单) */}
      <ExportImageModal
        isOpen={isExportImageModalOpen}
        onClose={() => {
          setIsExportImageModalOpen(false);
          setCustomExportStocks(null);
        }}
        stocks={customExportStocks || processedStocks}
        criteria={criteria}
        avatarStyle={avatarStyle}
        onSwitchToTargetExport={handleExportTargetWatchlistForSelected}
      />

      {/* 导出目标买入价测算图 (针对选中目标，包含推算公式与水印) */}
      <ExportTargetWatchlistImageModal
        isOpen={isTargetExportModalOpen}
        onClose={() => {
          setIsTargetExportModalOpen(false);
          setTargetExportItems([]);
        }}
        items={targetExportItems}
        avatarStyle={avatarStyle}
        defaultTitle={(() => {
          const uniqueIndustries = Array.from(
            new Set(targetExportItems.map((i) => i.stock.industry).filter(Boolean))
          );
          if (uniqueIndustries.length === 1) {
            return `${uniqueIndustries[0]}·理想目标买入价测算清单`;
          }
          if (criteria?.selectedIndustries && criteria.selectedIndustries.length === 1) {
            return `${criteria.selectedIndustries[0]}·理想目标买入价测算清单`;
          }
          return '全行业·理想目标买入价测算清单';
        })()}
      />

      {/* Avatar Style Selector Modal */}
      <AvatarSelectorModal
        isOpen={isAvatarSelectorOpen}
        onClose={() => setIsAvatarSelectorOpen(false)}
        currentStyle={avatarStyle}
        onChangeStyle={(style) => setAvatarStyle(style)}
      />

      {/* Leader Score Explainer Modal */}
      <LeaderScoreExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />

      {/* Persistent Right Edge Trigger Tab (当右侧栏收起时显示，点击一键展开) */}
      {!isRightSidebarOpen && (
        <button
          onClick={() => {
            setIsRightSidebarOpen(true);
            setRightSidebarMode('drawer');
          }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-l from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white pl-3 pr-2 py-3.5 rounded-l-2xl shadow-2xl flex flex-col items-center gap-1.5 transition-all duration-200 hover:scale-105 group border-y border-l border-white/30 ring-4 ring-rose-500/25 active:scale-95 cursor-pointer backdrop-blur-md"
          title="点击展开右侧栏：高股息投资组合模拟器与现金流测算"
        >
          <PieChart className="w-4 h-4 text-white group-hover:rotate-45 transition-transform duration-300 drop-shadow" />
          <div className="flex flex-col items-center text-[11px] font-bold leading-tight py-0.5 text-white drop-shadow select-none tracking-widest">
            <span>组</span>
            <span>合</span>
            <span>测</span>
            <span>算</span>
          </div>
          <span className="bg-black/45 text-amber-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-white/20 shadow-inner">
            {selectedStockCodes.length}
          </span>
        </button>
      )}

      {/* Dividend Portfolio Drawer (全屏覆盖抽屉模式) */}
      {isRightSidebarOpen && rightSidebarMode === 'drawer' && (
        <DividendPortfolioDrawer
          isOpen={true}
          mode="drawer"
          onToggleMode={() => setRightSidebarMode('docked')}
          onClose={() => setIsRightSidebarOpen(false)}
          selectedStocks={selectedPortfolioStocks}
          onRemoveStock={handleRemoveFromPortfolio}
          onClearAll={handleClearPortfolio}
          onAddPresetStocks={() => {
            setSelectedStockCodes(['601088', '600036', '600900', '000651', '601225']);
          }}
          onAddAllFiltered={() => {
            setSelectedStockCodes(processedStocks.map(s => s.code));
          }}
          filteredCount={processedStocks.length}
        />
      )}

      {/* Dividend Anomaly Alert History Modal */}
      <DividendAlertHistoryModal
        isOpen={isAlertHistoryOpen}
        onClose={() => setIsAlertHistoryOpen(false)}
        alerts={alertHistory}
        onClearAll={() => {
          setAlertHistory([]);
          setActiveFloatingAlerts([]);
        }}
        onSelectStock={handleSelectStockByCode}
        onTriggerShock={handleTriggerShock}
      />

      {/* Market Universe (大A 5,652 支股票全景透析与全域检索) Modal */}
      <MarketUniverseModal
        isOpen={isMarketUniverseOpen}
        onClose={() => setIsMarketUniverseOpen(false)}
        allStocks={stocks}
        filteredCount={processedStocks.length}
        onSelectStock={(stock) => setSelectedStockDetail(stock)}
        onAddCustomStock={handleAddCustomStocks}
        onApplyCriteria={(newCrit) => setCriteria((prev) => ({ ...prev, ...newCrit }))}
      />

      {/* Custom Stock Import / Batch Add Modal */}
      <CustomStockImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingStocks={stocks}
        onAddStocks={handleAddCustomStocks}
        onUpdateStock={handleUpdateCustomStock}
        onDeleteCustomStock={handleDeleteCustomStock}
        onClearCustomStocks={handleClearAllCustomStocks}
      />

      {/* 微信 / 邮箱 登录鉴权限制弹窗 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialPrompt={authModalPrompt}
        initialTab={authModalTab}
      />

    </div>
  );
}

