import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, TrendingUp, TrendingDown, X, ExternalLink, 
  ShieldAlert, ShieldCheck, Sparkles, Volume2, VolumeX, Bell,
  ChevronRight, CheckCircle2, Zap
} from 'lucide-react';
import { DividendAnomalyAlert, Stock } from '../types';

interface DividendAnomalyFloatingAlertProps {
  alerts: DividendAnomalyAlert[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onSelectStock: (stockCode: string) => void;
  onToggleSelectStock?: (stockCode: string) => void;
  selectedStockCodes?: string[];
}

export const DividendAnomalyFloatingAlert: React.FC<DividendAnomalyFloatingAlertProps> = ({
  alerts,
  onDismiss,
  onDismissAll,
  onSelectStock,
  onToggleSelectStock,
  selectedStockCodes = []
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Auto dismiss oldest alert after 8 seconds if not paused by hover
  useEffect(() => {
    if (alerts.length === 0 || isPaused) return;

    const timer = setTimeout(() => {
      onDismiss(alerts[0].id);
    }, 8500);

    return () => clearTimeout(timer);
  }, [alerts, isPaused, onDismiss]);

  if (alerts.length === 0) return null;

  // We display the latest alert as primary bubble, and stack badge for others
  const activeAlert = alerts[0];
  const isSurge = activeAlert.direction === 'surge';
  const isSelected = selectedStockCodes.includes(activeAlert.stockCode);

  return (
    <div 
      className="fixed top-20 right-3 sm:right-6 z-50 max-w-md w-[calc(100vw-1.5rem)] sm:w-[410px] space-y-2 pointer-events-auto select-none animate-in slide-in-from-top-4 fade-in duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Primary Floating Alert Bubble */}
      <div 
        className={`relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          isSurge 
            ? 'bg-slate-950/95 border-emerald-500/50 shadow-emerald-950/50' 
            : 'bg-slate-950/95 border-rose-500/50 shadow-rose-950/50'
        }`}
      >
        {/* Glowing Top Accent Bar */}
        <div className={`h-1 w-full ${isSurge ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400' : 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500'}`} />

        <div className="p-4 space-y-3">
          
          {/* Header Row: Badge, Time, and Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-2.5 w-2.5 relative`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSurge ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSurge ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>

              <div className={`px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 ${
                isSurge 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {isSurge ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>盘中股息率剧烈异动 ({activeAlert.yieldChangePercent > 0 ? '+' : ''}{activeAlert.yieldChangePercent}%)</span>
              </div>

              {alerts.length > 1 && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                  +{alerts.length - 1}条未读
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-slate-400">
                {activeAlert.timestamp}
              </span>
              <button
                onClick={() => onDismiss(activeAlert.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                title="忽略此预警"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stock Identification & Price Move */}
          <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100 text-sm">{activeAlert.stockName}</span>
                <span className="font-mono text-xs text-slate-400">{activeAlert.stockCode}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {activeAlert.industry}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <span>现价:</span>
                <strong className="font-mono text-slate-200">¥{activeAlert.currentPrice.toFixed(2)}</strong>
                <span className={`font-mono font-semibold ${activeAlert.priceChangePercent >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ({activeAlert.priceChangePercent >= 0 ? '+' : ''}{activeAlert.priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Yield Shift Comparison Pill */}
            <div className="text-right">
              <div className="text-[10px] text-slate-400">滚动股息率突变</div>
              <div className="flex items-center gap-1 font-mono font-bold text-xs mt-0.5">
                <span className="text-slate-400 line-through text-[11px]">{activeAlert.baseYield.toFixed(2)}%</span>
                <span className="text-slate-400 text-[10px]">→</span>
                <span className={`text-sm ${isSurge ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activeAlert.currentYield.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Narrative Reason Callout */}
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
            {activeAlert.reason}
          </p>

          {/* Quick Action Footer */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectStock(activeAlert.stockCode)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition active:scale-95"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>研判估值与PE底</span>
                <ChevronRight className="w-3 h-3" />
              </button>

              {onToggleSelectStock && (
                <button
                  onClick={() => onToggleSelectStock(activeAlert.stockCode)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition active:scale-95 ${
                    isSelected 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {isSelected ? <CheckCircle2 className="w-3 h-3 text-rose-400" /> : <Zap className="w-3 h-3 text-amber-400" />}
                  <span>{isSelected ? '已在组合' : '加入组合'}</span>
                </button>
              )}
            </div>

            {alerts.length > 1 && (
              <button
                onClick={onDismissAll}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition underline underline-offset-2"
              >
                全部清空 ({alerts.length})
              </button>
            )}
          </div>

        </div>

        {/* Progress Countdown Line */}
        {!isPaused && (
          <div className="h-0.5 w-full bg-slate-800 overflow-hidden">
            <div 
              className={`h-full animate-[progress_8.5s_linear_forwards] ${
                isSurge ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
              style={{
                animation: 'shrinkWidth 8.5s linear forwards'
              }}
            />
          </div>
        )}
      </div>

      {/* Extra floating chips if multiple alerts exist */}
      {alerts.length > 1 && (
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 backdrop-blur-md">
          <span className="flex items-center gap-1.5 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>还有 {alerts.length - 1} 只标的盘中股息率波动超 ±10%</span>
          </span>
          <button
            onClick={() => onDismiss(activeAlert.id)}
            className="text-[11px] text-indigo-300 hover:text-indigo-200 font-medium transition flex items-center"
          >
            <span>看下一条</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
