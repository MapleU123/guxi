import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Stock, FilterCriteria, SortConfig, SortField, DividendAnomalyAlert, TargetDividendWatchItem } from './types';
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
import { AvatarSelectorModal, AvatarStyle } from './components/AvatarSelectorModal';
import { CustomStockImportModal } from './components/CustomStockImportModal';
import { MarketUniverseModal } from './components/MarketUniverseModal';
import { TargetWatchlistModal } from './components/TargetWatchlistModal';
import { PieChart, Download, Layers, ShieldCheck, Sparkles, HelpCircle, Image as ImageIcon, Target } from 'lucide-react';
import { exportToExcel } from './utils/exportExcel';

const CUSTOM_STOCKS_STORAGE_KEY = 'a_share_dividend_custom_stocks';
const TARGET_WATCHLIST_STORAGE_KEY = 'a_share_dividend_target_watchlist_v1';

const DEFAULT_TARGET_WATCHLIST: TargetDividendWatchItem[] = [
  { code: '601088', name: '中国神华', targetYield: 7.0, targetDividendYield: 7.0, notes: '煤炭现金奶牛，等待理想7%股息率低吸', customNote: '煤炭现金奶牛，等待理想7%股息率低吸', addedAt: '2026-03-01' },
  { code: '600036', name: '招商银行', targetYield: 6.0, targetDividendYield: 6.0, notes: '零售银行龙头，目标6%股息率分批建仓', customNote: '零售银行龙头，目标6%股息率分批建仓', addedAt: '2026-03-01' },
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
  const [isPortfolioDrawerOpen, setIsPortfolioDrawerOpen] = useState<boolean>(false);
  const [isExportImageModalOpen, setIsExportImageModalOpen] = useState<boolean>(false);
  const [customExportStocks, setCustomExportStocks] = useState<Stock[] | null>(null);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('whiteThreeSoldiers');
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isMarketUniverseOpen, setIsMarketUniverseOpen] = useState<boolean>(false);
  const [isTargetWatchlistOpen, setIsTargetWatchlistOpen] = useState<boolean>(false);

  // 8. 理想股息率备选股票池状态
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
        direction: field === 'valuation' ? 'asc' : 'desc' // 估值默认低估优先
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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Strategy Presets Bar */}
        <StrategyPresets
          currentCriteria={criteria}
          onApplyPreset={(newCrit) => setCriteria((prev) => ({ ...prev, ...newCrit }))}
          onReset={() => setCriteria(DEFAULT_CRITERIA)}
        />

        {/* Market Overview Ribbon */}
        <MarketOverviewBar
          filteredStocks={processedStocks}
          totalStockCount={stocks.length}
          onSelectStock={(stock) => setSelectedStockDetail(stock)}
          onOpenMarketUniverse={() => setIsMarketUniverseOpen(true)}
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

        {/* Stock Result Table */}
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
          onOpenExportImage={() => {
            setCustomExportStocks(null);
            setIsExportImageModalOpen(true);
          }}
        />

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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-rose-500/40 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-xs text-slate-200 font-medium">
              已勾选 <strong className="text-rose-400 font-bold">{selectedStockCodes.length}</strong> 只高股息标的
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPortfolioDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-xs shadow-md transition active:scale-95"
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>测算组合现金流</span>
            </button>

            <button
              onClick={() => {
                setCustomExportStocks(selectedPortfolioStocks);
                setIsExportImageModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 font-medium text-xs transition active:scale-95"
              title="将已勾选标的高清导出为图片"
            >
              <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>导出已选图片</span>
            </button>

            <button
              onClick={() => exportToExcel(selectedPortfolioStocks, criteria)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition active:scale-95"
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

      {/* Export Image Preview & Download Modal */}
      <ExportImageModal
        isOpen={isExportImageModalOpen}
        onClose={() => {
          setIsExportImageModalOpen(false);
          setCustomExportStocks(null);
        }}
        stocks={customExportStocks || processedStocks}
        criteria={criteria}
        avatarStyle={avatarStyle}
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

      {/* Dividend Portfolio Drawer */}
      <DividendPortfolioDrawer
        isOpen={isPortfolioDrawerOpen}
        onClose={() => setIsPortfolioDrawerOpen(false)}
        selectedStocks={selectedPortfolioStocks}
        onRemoveStock={handleRemoveFromPortfolio}
        onClearAll={handleClearPortfolio}
      />

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
        onDeleteStock={handleDeleteCustomStock}
        onClearAllCustom={handleClearAllCustomStocks}
      />

    </div>
  );
}

