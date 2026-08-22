import React, { useState } from 'react';
import { X, PieChart, DollarSign, Calendar, TrendingUp, Download, Trash2, Plus, Sparkles } from 'lucide-react';
import { Stock } from '../types';
import * as XLSX from 'xlsx';

interface DividendPortfolioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStocks: Stock[];
  onRemoveStock: (code: string) => void;
  onClearAll: () => void;
}

export const DividendPortfolioDrawer: React.FC<DividendPortfolioDrawerProps> = ({
  isOpen,
  onClose,
  selectedStocks,
  onRemoveStock,
  onClearAll
}) => {
  const [totalCapital, setTotalCapital] = useState<number>(500000); // 默认50万总资金

  if (!isOpen) return null;

  // 等权重分配资金
  const stockCount = selectedStocks.length;
  const weightPerStock = stockCount > 0 ? 1 / stockCount : 0;
  const capitalPerStock = stockCount > 0 ? totalCapital / stockCount : 0;

  // 组合加权指标
  const portfolioYield = stockCount > 0
    ? selectedStocks.reduce((acc, s) => acc + s.ttmDividendYield * weightPerStock, 0)
    : 0;

  const portfolioStaticYield = stockCount > 0
    ? selectedStocks.reduce((acc, s) => acc + s.staticDividendYield * weightPerStock, 0)
    : 0;

  const portfolioPE = stockCount > 0
    ? selectedStocks.reduce((acc, s) => acc + s.pe * weightPerStock, 0)
    : 0;

  const portfolioROE = stockCount > 0
    ? selectedStocks.reduce((acc, s) => acc + s.roe * weightPerStock, 0)
    : 0;

  const annualTotalDividend = (totalCapital * (portfolioYield / 100));
  const monthlyAverageDividend = annualTotalDividend / 12;

  // 导出组合方案
  const handleExportPortfolio = () => {
    if (selectedStocks.length === 0) return;

    const data = selectedStocks.map((s, idx) => {
      const allocatedMoney = capitalPerStock;
      const shares = Math.floor(allocatedMoney / s.price);
      const estAnnualDiv = shares * s.ttmDividendPerShare;

      return {
        '序号': idx + 1,
        '股票代码': s.code,
        '股票简称': s.name,
        '行业': s.industry,
        '配置权重': (weightPerStock * 100).toFixed(1) + '%',
        '拟分配金额(元)': allocatedMoney.toFixed(0),
        '建议买入股数': shares,
        '现价(元)': s.price.toFixed(2),
        '滚动股息率TTM(%)': s.ttmDividendYield.toFixed(2) + '%',
        '静态股息率(%)': s.staticDividendYield.toFixed(2) + '%',
        '市盈率PE': s.pe.toFixed(1),
        '预计年分红(元)': estAnnualDiv.toFixed(1),
        '龙头综合分': s.leaderScore ?? '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '高股息组合配置方案');
    XLSX.writeFile(workbook, `A股高股息组合方案_${totalCapital / 10000}万元_共${stockCount}只.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border-l border-slate-700 w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                高股息投资组合模拟器
                <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                  已选 {stockCount} 只
                </span>
              </h3>
              <p className="text-xs text-slate-400">测算一揽子红利股票的组合现金流与收益</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-200">
          
          {/* Capital Setting */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              组合总拟投资金额 (元)
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                step="50000"
                value={totalCapital}
                onChange={(e) => setTotalCapital(Math.max(10000, Number(e.target.value)))}
                className="flex-1 bg-slate-900 text-slate-100 font-mono font-bold text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-rose-500"
              />
              <div className="flex gap-1">
                {[200000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTotalCapital(amt)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium border ${
                      totalCapital === amt
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {amt / 10000}万
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Portfolio Summary Stats */}
          {stockCount > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-rose-500/30">
                <span className="text-slate-400 text-[11px]">组合加权股息率(TTM)</span>
                <div className="text-xl font-mono font-bold text-rose-400 mt-0.5">
                  {portfolioYield.toFixed(2)}%
                </div>
                <span className="text-[10px] text-slate-400">静态股息率: {portfolioStaticYield.toFixed(2)}%</span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-emerald-500/30">
                <span className="text-slate-400 text-[11px]">预计年现金分红</span>
                <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                  ¥{annualTotalDividend.toFixed(0)} / 年
                </div>
                <span className="text-[10px] text-emerald-300">月均入账: ¥{monthlyAverageDividend.toFixed(0)}</span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 text-[11px]">组合加权市盈率 (PE)</span>
                <div className="text-base font-mono font-bold text-slate-200 mt-0.5">
                  {portfolioPE.toFixed(1)} 倍
                </div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 text-[11px]">组合加权 ROE</span>
                <div className="text-base font-mono font-bold text-amber-400 mt-0.5">
                  {portfolioROE.toFixed(1)}%
                </div>
              </div>
            </div>
          ) : null}

          {/* Stock List in Portfolio */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300 text-xs">
                组合成分股明细 ({stockCount})
              </span>
              {stockCount > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空已选
                </button>
              )}
            </div>

            {stockCount === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                <p className="text-slate-400 text-xs">暂未勾选任何股票</p>
                <p className="text-slate-500 text-[11px] mt-1">
                  在主表格左侧勾选股票即可加入组合进行测算
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedStocks.map((stock) => {
                  const shares = Math.floor(capitalPerStock / stock.price);
                  const annualDiv = shares * stock.ttmDividendPerShare;

                  return (
                    <div
                      key={stock.code}
                      className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">{stock.name}</span>
                          <span className="font-mono text-slate-400 text-xs">{stock.code}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                            {stock.industry}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                          <span>股息率: <strong className="text-rose-400">{stock.ttmDividendYield.toFixed(2)}%</strong></span>
                          <span>拟买: <strong className="text-slate-200">{shares}股</strong></span>
                          <span>年红利: <strong className="text-emerald-400">¥{annualDiv.toFixed(0)}</strong></span>
                        </div>
                      </div>

                      <button
                        onClick={() => onRemoveStock(stock.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="从组合移除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        {stockCount > 0 && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleExportPortfolio}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs shadow-md hover:from-emerald-500 hover:to-teal-500 transition"
            >
              <Download className="w-3.5 h-3.5" />
              导出组合配置 Excel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition"
            >
              关闭
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
