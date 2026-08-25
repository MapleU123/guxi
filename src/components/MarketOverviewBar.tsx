import React from 'react';
import { TrendingUp, Percent, Award, Landmark, PieChart, Shield, Database, ArrowRight } from 'lucide-react';
import { Stock } from '../types';

interface MarketOverviewBarProps {
  filteredStocks: Stock[];
  totalStockCount: number;
  onSelectStock: (stock: Stock) => void;
  onOpenMarketUniverse?: () => void;
}

export const MarketOverviewBar: React.FC<MarketOverviewBarProps> = ({
  filteredStocks,
  totalStockCount,
  onSelectStock,
  onOpenMarketUniverse
}) => {
  if (filteredStocks.length === 0) return null;

  // 计算平均指标
  const avgYield = (
    filteredStocks.reduce((acc, s) => acc + s.ttmDividendYield, 0) / filteredStocks.length
  ).toFixed(2);

  const avgStaticYield = (
    filteredStocks.reduce((acc, s) => acc + s.staticDividendYield, 0) / filteredStocks.length
  ).toFixed(2);

  const avgPE = (
    filteredStocks.reduce((acc, s) => acc + s.pe, 0) / filteredStocks.length
  ).toFixed(2);

  const avgROE = (
    filteredStocks.reduce((acc, s) => acc + s.roe, 0) / filteredStocks.length
  ).toFixed(2);

  // 股息率冠军
  const topYieldStock = [...filteredStocks].sort((a, b) => b.ttmDividendYield - a.ttmDividendYield)[0];

  // 龙头分冠军
  const topLeaderStock = [...filteredStocks].sort((a, b) => (b.leaderScore ?? 0) - (a.leaderScore ?? 0))[0];

  // 计算占 5652 支股票的比例
  const universeRatio = ((filteredStocks.length / 5652) * 100).toFixed(1);

  return (
    <div className="space-y-2.5 mb-5">
      {/* 5652 支大A宏观全景通栏 */}
      {onOpenMarketUniverse && (
        <div 
          onClick={onOpenMarketUniverse}
          className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 border border-rose-500/30 hover:border-rose-500/60 rounded-xl px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition group shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-rose-600/80 flex items-center justify-center text-white shrink-0">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-200 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span><strong>大A全市场共 5,652 支股票</strong></span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-slate-400">
                当前筛选选出 <strong className="text-rose-400 font-mono">{filteredStocks.length}</strong> 支核心资产 (占全市场约 {universeRatio}%)
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                沙里淘金90%+
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold group-hover:text-rose-200 transition shrink-0 self-end sm:self-auto">
            <span>查看 5,652 支宏观分布与分红金字塔</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition transform" />
          </div>
        </div>
      )}

      {/* 6 指标卡片网格 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          
          {/* 1. 筛选样本量 */}
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <PieChart className="w-3.5 h-3.5 text-rose-400" />
              <span>选出标的数</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-100">{filteredStocks.length}</span>
              <span className="text-xs text-slate-500">/ 5652全域</span>
            </div>
          </div>

          {/* 2. 平均滚动股息率 (TTM) */}
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <Percent className="w-3.5 h-3.5 text-rose-400" />
              <span>平均股息率(TTM)</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-rose-400">{avgYield}%</span>
              <span className="text-[10px] text-slate-400">静态: {avgStaticYield}%</span>
            </div>
          </div>

          {/* 3. 平均市盈率 PE */}
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <Landmark className="w-3.5 h-3.5 text-indigo-400" />
              <span>平均市盈率(PE)</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-slate-200">{avgPE}</span>
              <span className="text-[10px] text-emerald-400 font-medium">低估值</span>
            </div>
          </div>

          {/* 4. 平均 ROE */}
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>平均 ROE 质量</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-amber-400">{avgROE}%</span>
              <span className="text-[10px] text-slate-400">高盈利</span>
            </div>
          </div>

          {/* 5. 股息率最高 */}
          {topYieldStock && (
            <div 
              onClick={() => onSelectStock(topYieldStock)}
              className="bg-slate-800/60 hover:bg-slate-800 rounded-lg p-2.5 border border-rose-500/20 hover:border-rose-500/50 transition cursor-pointer group"
            >
              <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-rose-400" />
                  最高股息率
                </span>
                <span className="text-[10px] text-rose-400 group-hover:underline">详情</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-100 truncate max-w-[80px]">{topYieldStock.name}</span>
                <span className="text-sm font-bold text-rose-400">{topYieldStock.ttmDividendYield.toFixed(2)}%</span>
              </div>
            </div>
          )}

          {/* 6. 龙头综合分最高 */}
          {topLeaderStock && (
            <div 
              onClick={() => onSelectStock(topLeaderStock)}
              className="bg-slate-800/60 hover:bg-slate-800 rounded-lg p-2.5 border border-amber-500/20 hover:border-amber-500/50 transition cursor-pointer group"
            >
              <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  综合分冠军
                </span>
                <span className="text-[10px] text-amber-400 group-hover:underline">详情</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-100 truncate max-w-[80px]">{topLeaderStock.name}</span>
                <span className="text-sm font-bold text-amber-400">{topLeaderStock.leaderScore?.toFixed(1)}分</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
