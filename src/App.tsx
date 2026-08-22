import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Stock, FilterCriteria, SortConfig, SortField } from './types';
import { INITIAL_STOCKS } from './data/stocksData';
import { filterStocks, calculateNormalizedScores, simulateRealtimeQuotes } from './utils/calculator';
import { Header } from './components/Header';
import { MarketOverviewBar } from './components/MarketOverviewBar';
import { StrategyPresets } from './components/StrategyPresets';
import { FilterPanel } from './components/FilterPanel';
import { StockTable } from './components/StockTable';
import { StockDetailModal } from './components/StockDetailModal';
import { LeaderScoreExplainerModal } from './components/LeaderScoreExplainerModal';
import { DividendPortfolioDrawer } from './components/DividendPortfolioDrawer';
import { PieChart, Download, Layers, ShieldCheck, Sparkles, HelpCircle } from 'lucide-react';
import { exportToExcel } from './utils/exportExcel';

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
  // 1. Raw Stock Universe
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);

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

  // 6. Modals & Drawers
  const [selectedStockDetail, setSelectedStockDetail] = useState<Stock | null>(null);
  const [isExplainerOpen, setIsExplainerOpen] = useState<boolean>(false);
  const [isPortfolioDrawerOpen, setIsPortfolioDrawerOpen] = useState<boolean>(false);

  // Manual & Auto Refresh Quotes Handler
  const handleRefreshQuotes = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setStocks((prev) => simulateRealtimeQuotes(prev));
      const now = new Date();
      setLastUpdated(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
      setIsRefreshing(false);
    }, 300);
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
      let aVal = a[sortConfig.field] as number;
      let bVal = b[sortConfig.field] as number;

      if (aVal === undefined) aVal = 0;
      if (bVal === undefined) bVal = 0;

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
        direction: 'desc'
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

  // Portfolio Stocks Object List
  const selectedPortfolioStocks = useMemo(() => {
    return stocks.filter((s) => selectedStockCodes.includes(s.code));
  }, [stocks, selectedStockCodes]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white pb-20">
      
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
        />

        {/* Filter Control Panel */}
        <FilterPanel
          criteria={criteria}
          onChange={setCriteria}
          allStocks={stocks}
          filteredCount={processedStocks.length}
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
        />

        {/* Bottom Educational Banner */}
        <div className="mt-8 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              已严格执行选股准则：默认剔除ST、*ST及退市整理期风险标的，动态追踪每股分红与盘口现价，保障选股指标精准可靠。
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
        onClose={() => setSelectedStockDetail(null)}
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

    </div>
  );
}
