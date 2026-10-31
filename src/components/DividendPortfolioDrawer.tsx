import React, { useState, useEffect } from 'react';
import { 
  X, PieChart, DollarSign, Calendar, TrendingUp, Download, 
  Trash2, Plus, Sparkles, CheckCircle2, ShieldCheck, ArrowRight,
  Maximize2, Minimize2, PanelRightClose, Pin
} from 'lucide-react';
import { Stock } from '../types';
import * as XLSX from 'xlsx';

export interface DividendPortfolioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStocks: Stock[];
  onRemoveStock: (code: string) => void;
  onClearAll: () => void;
  onAddPresetStocks?: () => void;
  onAddAllFiltered?: () => void;
  filteredCount?: number;
  mode?: 'docked' | 'drawer';
  onToggleMode?: () => void;
}

export const DividendPortfolioDrawer: React.FC<DividendPortfolioDrawerProps> = ({
  isOpen,
  onClose,
  selectedStocks,
  onRemoveStock,
  onClearAll,
  onAddPresetStocks,
  onAddAllFiltered,
  filteredCount = 0,
  mode = 'drawer',
  onToggleMode
}) => {
  const [totalCapital, setTotalCapital] = useState<number>(500000); // 默认50万总资金

  // 监听 ESC 键关闭抽屉 (仅在 drawer 模式下启用)
  useEffect(() => {
    if (!isOpen || mode !== 'drawer') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, onClose]);

  if (!isOpen) return null;

  // 过滤有效标的，避免任何异常对象
  const validStocks = selectedStocks.filter(s => Boolean(s && s.code));
  const stockCount = validStocks.length;
  const weightPerStock = stockCount > 0 ? 1 / stockCount : 0;
  const capitalPerStock = stockCount > 0 ? totalCapital / stockCount : 0;

  // 组合加权指标（高度防错处理，杜绝 NaN 或 undefined 抛错）
  const portfolioYield = stockCount > 0
    ? validStocks.reduce((acc, s) => acc + (Number(s.ttmDividendYield) || 0) * weightPerStock, 0)
    : 0;

  const portfolioStaticYield = stockCount > 0
    ? validStocks.reduce((acc, s) => acc + (Number(s.staticDividendYield) || 0) * weightPerStock, 0)
    : 0;

  const portfolioPE = stockCount > 0
    ? validStocks.reduce((acc, s) => acc + (Number(s.pe) || 0) * weightPerStock, 0)
    : 0;

  const portfolioROE = stockCount > 0
    ? validStocks.reduce((acc, s) => acc + (Number(s.roe) || 0) * weightPerStock, 0)
    : 0;

  const annualTotalDividend = (totalCapital * (portfolioYield / 100));
  const monthlyAverageDividend = annualTotalDividend / 12;

  // 导出组合方案
  const handleExportPortfolio = () => {
    if (validStocks.length === 0) return;

    const data = validStocks.map((s, idx) => {
      const allocatedMoney = capitalPerStock;
      const stockPrice = Math.max(0.01, Number(s.price) || 1);
      const shares = Math.floor(allocatedMoney / stockPrice);
      const divPerShare = Number(s.ttmDividendPerShare) || (stockPrice * ((Number(s.ttmDividendYield) || 0) / 100));
      const estAnnualDiv = shares * divPerShare;

      return {
        '序号': idx + 1,
        '股票代码': s.code,
        '股票简称': s.name,
        '行业': s.industry,
        '配置权重': (weightPerStock * 100).toFixed(1) + '%',
        '拟分配金额(元)': allocatedMoney.toFixed(0),
        '建议买入股数': shares,
        '现价(元)': stockPrice.toFixed(2),
        '滚动股息率TTM(%)': (Number(s.ttmDividendYield) || 0).toFixed(2) + '%',
        '静态股息率(%)': (Number(s.staticDividendYield) || 0).toFixed(2) + '%',
        '市盈率PE': (Number(s.pe) || 0).toFixed(1),
        '预计年分红(元)': estAnnualDiv.toFixed(1),
        '龙头综合分': s.leaderScore ?? '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '高股息组合配置方案');
    XLSX.writeFile(workbook, `A股高股息组合方案_${(totalCapital / 10000).toFixed(0)}万元_共${stockCount}只.xlsx`);
  };

  const bodyContent = (
    <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs text-slate-200">
      
      {/* Capital Setting */}
      <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          组合总拟投资金额 (元)
        </label>
        <div className="flex items-center gap-2 mb-1.5">
          <input
            type="number"
            step="50000"
            value={totalCapital}
            onChange={(e) => setTotalCapital(Math.max(10000, Number(e.target.value)))}
            className="flex-1 bg-slate-900 text-slate-100 font-mono font-bold text-sm rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-rose-500"
          />
          <div className="flex gap-1">
            {[200000, 500000, 1000000].map((amt) => (
              <button
                key={amt}
                onClick={() => setTotalCapital(amt)}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                  totalCapital === amt
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                }`}
              >
                {amt / 10000}万
              </button>
            ))}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>单只配置: <strong className="text-slate-200 font-mono">¥{(stockCount > 0 ? capitalPerStock : 0).toFixed(0)}</strong></span>
          <span className="text-emerald-400 font-medium">等权重分散</span>
        </div>
      </div>

      {/* Portfolio Summary Stats */}
      {stockCount > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-rose-500/30">
            <span className="text-slate-400 text-[11px]">组合加权股息率(TTM)</span>
            <div className="text-lg font-mono font-bold text-rose-400 mt-0.5">
              {portfolioYield.toFixed(2)}%
            </div>
            <span className="text-[10px] text-slate-400">静态: {portfolioStaticYield.toFixed(2)}%</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-emerald-500/30">
            <span className="text-slate-400 text-[11px]">预计年现金分红</span>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
              ¥{annualTotalDividend.toFixed(0)}
            </div>
            <span className="text-[10px] text-emerald-300">月均: ¥{monthlyAverageDividend.toFixed(0)}</span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 text-[11px]">组合加权市盈率 (PE)</span>
            <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
              {portfolioPE.toFixed(1)} 倍
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 text-[11px]">组合加权 ROE</span>
            <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">
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
              清空
            </button>
          )}
        </div>

        {stockCount === 0 ? (
          <div className="p-5 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-300 text-xs font-semibold">暂未加入任何组合标的</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                在主选股表格勾选股票，或点击下方快捷按钮载入：
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1 max-w-sm mx-auto">
              {onAddPresetStocks && (
                <button
                  onClick={onAddPresetStocks}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>一键预置 5 只高分红核心标杆</span>
                </button>
              )}
              {onAddAllFiltered && filteredCount > 0 && (
                <button
                  onClick={onAddAllFiltered}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>加入当前筛选的 {filteredCount} 只股票</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {validStocks.map((stock) => {
              const stockPrice = Math.max(0.01, Number(stock.price) || 1);
              const shares = Math.floor(capitalPerStock / stockPrice);
              const divPerShare = Number(stock.ttmDividendPerShare) || (stockPrice * ((Number(stock.ttmDividendYield) || 0) / 100));
              const annualDiv = shares * divPerShare;

              return (
                <div
                  key={stock.code}
                  className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/80 hover:border-slate-600 transition flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-100 text-xs truncate">{stock.name}</span>
                      <span className="font-mono text-slate-400 text-[10px] bg-slate-900 px-1 py-0.2 rounded border border-slate-700">
                        {stock.code}
                      </span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-slate-700 text-slate-300">
                        {stock.industry}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2.5 flex-wrap">
                      <span>股息率: <strong className="text-rose-400 font-mono">{(Number(stock.ttmDividendYield) || 0).toFixed(2)}%</strong></span>
                      <span>拟买: <strong className="text-slate-200 font-mono">{shares}股</strong></span>
                      <span>年分红: <strong className="text-emerald-400 font-mono">¥{annualDiv.toFixed(0)}</strong></span>
                      <span>PE: <strong className="text-slate-300 font-mono">{Number(stock.pe) > 0 ? (Number(stock.pe)).toFixed(1) : '-'}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveStock(stock.code)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                    title="从组合移除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );

  // 1. DOCKED MODE (嵌入式右侧分栏)
  if (mode === 'docked') {
    return (
      <aside className="w-full xl:w-[410px] 2xl:w-[450px] shrink-0 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col max-h-[calc(100vh-100px)] sticky top-20 overflow-hidden">
        {/* Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                高股息组合右侧栏
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30 font-mono">
                  {stockCount}只
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">实时现金流测算与配置</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onToggleMode && (
              <button
                onClick={onToggleMode}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                title="展开为全屏抽屉视图"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="收起右侧栏"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        {bodyContent}

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          {stockCount > 0 ? (
            <button
              onClick={handleExportPortfolio}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs shadow-md hover:from-emerald-500 hover:to-teal-500 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              导出方案 Excel ({stockCount}只)
            </button>
          ) : (
            <div className="text-[11px] text-slate-500">
              提示：可勾选标的模拟配置
            </div>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            收起
          </button>
        </div>
      </aside>
    );
  }

  // 2. DRAWER MODE (覆盖式全屏抽屉)
  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-900 border-l border-slate-700 w-full max-w-xl h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                高股息投资组合模拟器
                <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 font-mono">
                  已选 {stockCount} 只
                </span>
              </h3>
              <p className="text-xs text-slate-400">测算一揽子红利资产的组合现金流与配置收益</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleMode && (
              <button
                onClick={onToggleMode}
                className="px-2.5 py-1.5 rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium flex items-center gap-1 transition"
                title="固定常驻在主界面右侧栏"
              >
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">固定为右侧分栏</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              title="关闭抽屉 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        {bodyContent}

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          {stockCount > 0 ? (
            <button
              onClick={handleExportPortfolio}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs shadow-md hover:from-emerald-500 hover:to-teal-500 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              导出组合配置 Excel ({stockCount}只)
            </button>
          ) : (
            <div className="text-xs text-slate-500">
              提示：可勾选多只股票进行模拟测算
            </div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition"
          >
            关闭抽屉
          </button>
        </div>
      </div>
    </div>
  );
};
