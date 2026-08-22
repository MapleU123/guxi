import React from 'react';
import { RefreshCw, Download, TrendingUp, Clock, ShieldCheck, Zap, HelpCircle } from 'lucide-react';
import { Stock, FilterCriteria } from '../types';
import { exportToExcel } from '../utils/exportExcel';

interface HeaderProps {
  lastUpdated: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  autoRefreshInterval: number; // in seconds, 0 = off
  setAutoRefreshInterval: (seconds: number) => void;
  filteredStocks: Stock[];
  criteria: FilterCriteria;
  onOpenExplainer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  isRefreshing,
  onRefresh,
  autoRefreshInterval,
  setAutoRefreshInterval,
  filteredStocks,
  criteria,
  onOpenExplainer
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          
          {/* Logo & Main Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-950/40 text-white font-black text-xl">
              红
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  A股高股息股票筛选器
                  <span className="hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    实盘级加权引擎
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>股息率≥3% · PE≤20 · 排除ST · 龙头综合赋权排序</span>
                <button 
                  onClick={onOpenExplainer}
                  className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5 text-xs transition underline underline-offset-2"
                >
                  <HelpCircle className="w-3 h-3" />
                  算法说明
                </button>
              </p>
            </div>
          </div>

          {/* Market Status & Realtime Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Live Market Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/60 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium">A股交易监控</span>
              <span className="text-slate-500 text-[11px]">|</span>
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Clock className="w-3 h-3" />
                {lastUpdated}
              </span>
            </div>

            {/* Auto-Refresh Select */}
            <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700/80 p-0.5 text-xs">
              <span className="text-slate-400 px-2 flex items-center gap-1 text-[11px]">
                <Zap className="w-3 h-3 text-amber-400" />
                自动刷新:
              </span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-slate-900 text-slate-200 rounded px-2 py-1 text-xs border border-slate-700 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value={0}>关闭</option>
                <option value={5}>5秒/次</option>
                <option value={10}>10秒/次</option>
                <option value={30}>30秒/次</option>
                <option value={60}>60秒/次</option>
              </select>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition active:scale-95 ${
                isRefreshing ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              title="获取最新实时行情并重新计算股息率与加权龙头分"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? '计算中...' : '刷新行情'}</span>
            </button>

            {/* Excel Export Button */}
            <button
              onClick={() => exportToExcel(filteredStocks, criteria)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-950/40 border border-emerald-500/30 transition active:scale-95"
              title="导出当前筛选结果为 Excel (.xlsx) 表格"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出 Excel ({filteredStocks.length})</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
