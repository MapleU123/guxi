import React, { useState } from 'react';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Award, TrendingUp, TrendingDown, 
  ExternalLink, ShieldCheck, Flame, Star, Info, ChevronRight, CheckCircle2
} from 'lucide-react';
import { Stock, SortConfig, SortField } from '../types';

interface StockTableProps {
  stocks: Stock[];
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onSelectStock: (stock: Stock) => void;
  selectedStockCodes: string[];
  onToggleSelectStock: (code: string) => void;
  onToggleSelectAll: () => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  sortConfig,
  onSort,
  onSelectStock,
  selectedStockCodes,
  onToggleSelectStock,
  onToggleSelectAll
}) => {
  const [hoveredScoreStock, setHoveredScoreStock] = useState<string | null>(null);

  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />;
    }
    return sortConfig.direction === 'desc' 
      ? <ArrowDown className="w-3.5 h-3.5 text-rose-400 font-bold" />
      : <ArrowUp className="w-3.5 h-3.5 text-emerald-400 font-bold" />;
  };

  const isAllSelected = stocks.length > 0 && selectedStockCodes.length === stocks.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
      
      {/* Table Toolbar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            已筛选标的清单
            <span className="bg-slate-800 px-2 py-0.5 rounded text-rose-400 font-bold text-xs border border-slate-700">
              共 {stocks.length} 只
            </span>
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            点击任意列头可按该维度快速排序，默认按龙头综合分降序
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSort('leaderScore')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition border flex items-center gap-1 ${
              sortConfig.field === 'leaderScore'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>按龙头分排序</span>
          </button>

          <button
            onClick={() => onSort('ttmDividendYield')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition border flex items-center gap-1 ${
              sortConfig.field === 'ttmDividendYield'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>按股息率排序</span>
          </button>
        </div>
      </div>

      {/* Table Body Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          
          {/* Header */}
          <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-20 select-none">
            <tr>
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="accent-rose-500 rounded cursor-pointer w-3.5 h-3.5"
                  title="全选/取消全选"
                />
              </th>
              
              <th className="py-3 px-2 w-12 text-center">
                排名
              </th>

              <th className="py-3 px-3 font-semibold text-slate-300 min-w-[150px]">
                股票代码 / 简称
              </th>

              <th className="py-3 px-2 font-semibold text-slate-300 min-w-[90px]">
                所属行业
              </th>

              <th 
                onClick={() => onSort('price')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[95px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>现价 / 涨跌</span>
                  {renderSortIcon('price')}
                </div>
              </th>

              <th 
                onClick={() => onSort('ttmDividendYield')}
                className="py-3 px-3 font-semibold text-rose-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[130px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>滚动股息率(TTM)</span>
                  {renderSortIcon('ttmDividendYield')}
                </div>
              </th>

              <th 
                onClick={() => onSort('staticDividendYield')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[105px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>静态股息率</span>
                  {renderSortIcon('staticDividendYield')}
                </div>
              </th>

              <th 
                onClick={() => onSort('leaderScore')}
                className="py-3 px-3 font-semibold text-amber-300 cursor-pointer hover:bg-slate-800/50 transition min-w-[160px]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    龙头综合分
                  </span>
                  {renderSortIcon('leaderScore')}
                </div>
              </th>

              <th 
                onClick={() => onSort('pe')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[85px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>市盈率PE</span>
                  {renderSortIcon('pe')}
                </div>
              </th>

              <th 
                onClick={() => onSort('pb')}
                className="py-3 px-2 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[75px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>市净率PB</span>
                  {renderSortIcon('pb')}
                </div>
              </th>

              <th 
                onClick={() => onSort('marketCap')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[110px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>总市值(亿元)</span>
                  {renderSortIcon('marketCap')}
                </div>
              </th>

              <th 
                onClick={() => onSort('roe')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[85px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>ROE</span>
                  {renderSortIcon('roe')}
                </div>
              </th>

              <th 
                onClick={() => onSort('revGrowth')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[95px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>营收增速</span>
                  {renderSortIcon('revGrowth')}
                </div>
              </th>

              <th 
                onClick={() => onSort('netProfitGrowth')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-right min-w-[95px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>净利增速</span>
                  {renderSortIcon('netProfitGrowth')}
                </div>
              </th>

              <th 
                onClick={() => onSort('dividendYears')}
                className="py-3 px-3 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50 transition text-center min-w-[90px]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>分红年数</span>
                  {renderSortIcon('dividendYears')}
                </div>
              </th>

              <th className="py-3 px-3 text-center min-w-[80px]">
                操作
              </th>
            </tr>
          </thead>

          {/* Rows */}
          <tbody className="divide-y divide-slate-800/70 text-slate-200">
            {stocks.length === 0 ? (
              <tr>
                <td colSpan={16} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Info className="w-8 h-8 text-slate-600" />
                    <p className="text-sm text-slate-400">未找到符合当前筛选条件的股票</p>
                    <p className="text-xs text-slate-600">请尝试放宽股息率、PE限制或清空行业过滤条件</p>
                  </div>
                </td>
              </tr>
            ) : (
              stocks.map((stock, index) => {
                const isSelected = selectedStockCodes.includes(stock.code);
                const isUp = stock.changePercent >= 0;

                return (
                  <tr 
                    key={stock.code}
                    className={`hover:bg-slate-800/60 transition group cursor-pointer ${
                      isSelected ? 'bg-rose-950/20' : index % 2 === 1 ? 'bg-slate-950/20' : ''
                    }`}
                    onClick={() => onSelectStock(stock)}
                  >
                    
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectStock(stock.code)}
                        className="accent-rose-500 rounded cursor-pointer w-3.5 h-3.5"
                      />
                    </td>

                    {/* Rank Badge */}
                    <td className="py-3 px-2 text-center font-bold">
                      {index === 0 ? (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] inline-flex items-center justify-center font-black shadow-sm shadow-amber-500/50">
                          1
                        </span>
                      ) : index === 1 ? (
                        <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-950 text-[11px] inline-flex items-center justify-center font-black">
                          2
                        </span>
                      ) : index === 2 ? (
                        <span className="w-5 h-5 rounded-full bg-amber-700 text-amber-100 text-[11px] inline-flex items-center justify-center font-black">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">{index + 1}</span>
                      )}
                    </td>

                    {/* Code & Name */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100 group-hover:text-rose-400 transition text-sm">
                            {stock.name}
                          </span>
                          {stock.isST && (
                            <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              ST
                            </span>
                          )}
                          {stock.isDelisted && (
                            <span className="text-[10px] px-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              退市
                            </span>
                          )}
                          {stock.isAristocrat && (
                            <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              10年贵族
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="font-mono">{stock.code}</span>
                          <span className="text-slate-600 font-mono text-[9px]">{stock.market}</span>
                        </div>
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] border border-slate-700">
                        {stock.industry}
                      </span>
                    </td>

                    {/* Price & Change */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-mono font-semibold text-slate-100 text-sm">
                        ¥{stock.price.toFixed(2)}
                      </div>
                      <div className={`font-mono text-[11px] font-medium flex items-center justify-end gap-0.5 ${
                        isUp ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                      </div>
                    </td>

                    {/* TTM Dividend Yield */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-sm font-bold text-rose-400">
                          {stock.ttmDividendYield.toFixed(2)}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full"
                            style={{ width: `${Math.min(100, (stock.ttmDividendYield / 10) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Static Dividend Yield */}
                    <td className="py-3 px-3 text-right font-mono text-slate-300 text-xs">
                      {stock.staticDividendYield.toFixed(2)}%
                    </td>

                    {/* Leader Score */}
                    <td className="py-3 px-3 relative" onMouseEnter={() => setHoveredScoreStock(stock.code)} onMouseLeave={() => setHoveredScoreStock(null)}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-sm min-w-[34px]">
                          {stock.leaderScore?.toFixed(1)}
                        </span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-emerald-400 rounded-full"
                            style={{ width: `${stock.leaderScore ?? 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Tooltip on Hover showing 4 Dimensions */}
                      {hoveredScoreStock === stock.code && (
                        <div className="absolute left-0 bottom-full mb-1 z-30 w-64 p-2.5 bg-slate-950 text-slate-200 text-[11px] rounded-xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 pointer-events-none">
                          <div className="font-bold text-amber-300 mb-1 flex items-center justify-between">
                            <span>{stock.name} 综合分拆解</span>
                            <span>{stock.leaderScore?.toFixed(1)}分</span>
                          </div>
                          <div className="space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-indigo-300">市值分 (40%):</span>
                              <span className="font-mono">{stock.normMarketCap} 分</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-emerald-300">ROE分 (25%):</span>
                              <span className="font-mono">{stock.normROE} 分</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-cyan-300">营收增速分 (15%):</span>
                              <span className="font-mono">{stock.normRevGrowth} 分</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-rose-300">净利增速分 (20%):</span>
                              <span className="font-mono">{stock.normNetProfitGrowth} 分</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* PE Ratio */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-200">
                      {stock.pe > 0 ? stock.pe.toFixed(1) : <span className="text-slate-500">亏损</span>}
                    </td>

                    {/* PB Ratio */}
                    <td className="py-3 px-2 text-right font-mono text-slate-300">
                      {stock.pb.toFixed(2)}
                    </td>

                    {/* Market Cap */}
                    <td className="py-3 px-3 text-right font-mono text-slate-200">
                      {stock.marketCap >= 10000 
                        ? `${(stock.marketCap / 10000).toFixed(2)}万亿` 
                        : `${stock.marketCap.toFixed(1)}亿`}
                    </td>

                    {/* ROE */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                      {stock.roe.toFixed(1)}%
                    </td>

                    {/* Revenue Growth */}
                    <td className={`py-3 px-3 text-right font-mono ${
                      stock.revGrowth >= 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {stock.revGrowth >= 0 ? '+' : ''}{stock.revGrowth.toFixed(1)}%
                    </td>

                    {/* Net Profit Growth */}
                    <td className={`py-3 px-3 text-right font-mono ${
                      stock.netProfitGrowth >= 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {stock.netProfitGrowth >= 0 ? '+' : ''}{stock.netProfitGrowth.toFixed(1)}%
                    </td>

                    {/* Dividend Years */}
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                        stock.dividendYears >= 10 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {stock.dividendYears}年
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectStock(stock)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition font-medium text-[11px] border border-slate-700 hover:border-rose-500 inline-flex items-center gap-1"
                      >
                        <span>分红档案</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
