import React from 'react';
import { 
  X, Bell, AlertTriangle, TrendingUp, TrendingDown, Sparkles, 
  Trash2, ExternalLink, Zap, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { DividendAnomalyAlert } from '../types';

interface DividendAlertHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: DividendAnomalyAlert[];
  onClearAll: () => void;
  onSelectStock: (stockCode: string) => void;
  onTriggerShock: () => void;
}

export const DividendAlertHistoryModal: React.FC<DividendAlertHistoryModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onClearAll,
  onSelectStock,
  onTriggerShock
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  盘中股息率异动监控中心
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  阈值: 波动 ≥ ±10%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                实时追踪盘中股价剧烈波动导致股息率发生 ±10% 以上异动的标的
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Logic Explanation Box */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 text-xs text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              监控触发逻辑与判定公式：
            </span>
            <button
              onClick={onTriggerShock}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-sm transition active:scale-95 flex items-center gap-1"
              title="模拟1-2只股票盘中产生±10%振幅，触发实时预警气泡"
            >
              <Zap className="w-3 h-3" />
              <span>模拟盘中大波动测试</span>
            </button>
          </div>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed">
            <div><strong>股息率相对变动率：</strong> ΔYield% = ((当前盘中股息率 - 昨收基准股息率) ÷ 昨收基准股息率) × 100%</div>
            <div className="text-slate-400 mt-1 flex flex-wrap gap-4 text-[10px]">
              <span className="text-emerald-400">● 股息率相对飙升 ≥ +10%：因股价下跌导致即期股息率快速走阔（安全垫增厚）</span>
              <span className="text-rose-400">● 股息率相对骤降 ≤ -10%：因股价急涨导致即期股息率被快速稀释</span>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {alerts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-300">当前各标的盘中股息率运行平稳</p>
                <p className="text-xs text-slate-500 max-w-md">
                  暂未检测到盘中股息率波动超过 ±10% 的异动事件。点击上方【模拟盘中大波动测试】可快速验证异动预警悬浮气泡。
                </p>
              </div>
            </div>
          ) : (
            alerts.map((alert) => {
              const isSurge = alert.direction === 'surge';
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSurge
                      ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                      : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm">{alert.stockName}</span>
                      <span className="font-mono text-xs text-slate-400">{alert.stockCode}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {alert.industry}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 ${
                        isSurge 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {isSurge ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>股息率 {alert.yieldChangePercent > 0 ? '+' : ''}{alert.yieldChangePercent}%</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-slate-400">{alert.timestamp}</span>
                      <button
                        onClick={() => {
                          onSelectStock(alert.stockCode);
                          onClose();
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-[11px] font-medium transition flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>研判档案</span>
                      </button>
                    </div>
                  </div>

                  {/* Pricing and Yield Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500">盘中现价</span>
                      <div className="font-mono font-bold text-slate-200">
                        ¥{alert.currentPrice.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">股价涨跌幅</span>
                      <div className={`font-mono font-semibold ${alert.priceChangePercent >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {alert.priceChangePercent >= 0 ? '+' : ''}{alert.priceChangePercent.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">昨收基准股息率</span>
                      <div className="font-mono text-slate-300">
                        {alert.baseYield.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">当前滚动股息率</span>
                      <div className={`font-mono font-bold ${isSurge ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {alert.currentYield.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed opacity-90">
                    {alert.reason}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {alerts.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              共记录 <strong className="text-slate-200">{alerts.length}</strong> 条异动事件
            </span>
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空所有记录</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
