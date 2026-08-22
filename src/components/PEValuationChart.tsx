import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Area, ComposedChart, Legend 
} from 'recharts';
import { TrendingDown, TrendingUp, Info, Activity, ShieldAlert, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { Stock } from '../types';
import { get12MonthPEHistory } from '../utils/calculator';

interface PEValuationChartProps {
  stock: Stock;
}

export const PEValuationChart: React.FC<PEValuationChartProps> = ({ stock }) => {
  const [showAverageLine, setShowAverageLine] = useState(true);
  const [showExtremes, setShowExtremes] = useState(true);
  const [showDividendYield, setShowDividendYield] = useState(true);

  // Compute 12-month PE valuation metrics
  const valuation = useMemo(() => {
    return get12MonthPEHistory(stock);
  }, [stock]);

  const {
    history,
    minPE,
    maxPE,
    avgPE,
    currentPE,
    percentile,
    percentileLevel,
    levelText,
    recommendation
  } = valuation;

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const peDiffFromAvg = Number((((dataPoint.pe - avgPE) / avgPE) * 100).toFixed(1));
      const isBelowAvg = peDiffFromAvg < 0;

      return (
        <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 z-50">
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
            <span className="text-amber-400 font-mono">{dataPoint.month}</span>
            <span className="text-[11px] font-normal text-slate-400">收盘价: ¥{dataPoint.price.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-indigo-300 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span>
              滚动市盈率 (PE-TTM):
            </span>
            <span className="font-mono font-bold text-slate-100 text-sm">
              {dataPoint.pe.toFixed(2)} 倍
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">较1年均值偏离:</span>
            <span className={`font-mono font-semibold ${isBelowAvg ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isBelowAvg ? '' : '+'}{peDiffFromAvg}%
            </span>
          </div>

          {dataPoint.dividendYield && (
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/80">
              <span className="text-rose-300 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
                对应滚动股息率:
              </span>
              <span className="font-mono font-bold text-rose-400">
                {dataPoint.dividendYield.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Determine badge styling based on percentile level
  const badgeStyle = {
    bottom: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40',
    low: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-950/40',
    mid: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/40',
    high: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-950/40'
  }[percentileLevel];

  const badgeIcon = {
    bottom: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
    low: <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />,
    mid: <Activity className="w-3.5 h-3.5 text-amber-400" />,
    high: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
  }[percentileLevel];

  // Calculate PE scale domain with padding
  const peDomainMin = Math.max(0, Math.floor(minPE * 0.88 * 10) / 10);
  const peDomainMax = Math.ceil(maxPE * 1.12 * 10) / 10;

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
      
      {/* Header & Valuation Bottom Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-400" />
              过去12个月 PE-TTM 滚动估值走势
            </h4>
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 shadow-sm ${badgeStyle}`}>
              {badgeIcon}
              <span>{levelText}</span>
              <span className="font-mono text-[11px] opacity-80">({percentile.toFixed(0)}%分位)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            动态跟踪近12个月市盈率估值中枢变动，判断当前高股息率的安全边际与估值底部位置
          </p>
        </div>

        {/* Toggle Options */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button
            onClick={() => setShowAverageLine(!showAverageLine)}
            className={`px-2 py-1 rounded-lg border transition flex items-center gap-1 ${
              showAverageLine
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            均值线 ({avgPE})
          </button>

          <button
            onClick={() => setShowExtremes(!showExtremes)}
            className={`px-2 py-1 rounded-lg border transition flex items-center gap-1 ${
              showExtremes
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-medium'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            极值底顶区间
          </button>

          <button
            onClick={() => setShowDividendYield(!showDividendYield)}
            className={`px-2 py-1 rounded-lg border transition flex items-center gap-1 ${
              showDividendYield
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-medium'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            叠加股息率走势
          </button>
        </div>
      </div>

      {/* 4 Metric Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">当前 PE (TTM)</span>
            <div className="text-sm font-bold font-mono text-indigo-400 mt-0.5">
              {currentPE.toFixed(2)} 倍
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500">距1年均值</span>
            <div className={`text-[11px] font-mono font-semibold ${currentPE <= avgPE ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentPE <= avgPE ? '' : '+'}{(((currentPE - avgPE) / avgPE) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">12个月平均 PE</span>
            <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
              {avgPE.toFixed(2)} 倍
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500">估值中枢</span>
            <div className="text-[11px] text-slate-400 font-mono">基准线</div>
          </div>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-300">12个月最低 PE (底部)</span>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              {minPE.toFixed(2)} 倍
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500">距历史底</span>
            <div className="text-[11px] font-mono text-emerald-300 font-semibold">
              +{(((currentPE - minPE) / minPE) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">12个月最高 PE</span>
            <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">
              {maxPE.toFixed(2)} 倍
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500">近1年振幅</span>
            <div className="text-[11px] font-mono text-slate-300">
              {(((maxPE - minPE) / minPE) * 100).toFixed(0)}%
            </div>
          </div>
        </div>

      </div>

      {/* Percentile Progress Bar */}
      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <span>估值分位数位置</span>
            <span className="text-slate-500">(0% = 12个月最低极值, 100% = 12个月最高极值)</span>
          </span>
          <span className="font-mono font-bold text-slate-200">
            {percentile.toFixed(1)}% 分位
          </span>
        </div>

        <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500" style={{ width: '25%' }} title="极低估值底部区 (0~25%)"></div>
          <div className="h-full bg-cyan-500" style={{ width: '25%' }} title="估值偏低区 (25~50%)"></div>
          <div className="h-full bg-amber-500" style={{ width: '25%' }} title="合理中枢区 (50~75%)"></div>
          <div className="h-full bg-rose-500" style={{ width: '25%' }} title="偏高估值区 (75~100%)"></div>
        </div>

        {/* Current Position Marker Indicator */}
        <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
          <span className="text-emerald-400">底部 (PE: {minPE})</span>
          <span className="text-cyan-400">低估区</span>
          <span className="text-amber-400">中枢 (PE: {avgPE})</span>
          <span className="text-rose-400">高位 (PE: {maxPE})</span>
        </div>
      </div>

      {/* Recharts Chart Area */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={history}
            margin={{ top: 10, right: showDividendYield ? 35 : 15, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="peAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
            
            {/* X-Axis */}
            <XAxis 
              dataKey="month" 
              stroke="#94a3b8" 
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
            />

            {/* Left Y-Axis for PE */}
            <YAxis 
              yAxisId="left"
              stroke="#818cf8" 
              fontSize={11}
              domain={[peDomainMin, peDomainMax]}
              tickFormatter={(val) => `${val.toFixed(1)}x`}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
            />

            {/* Right Y-Axis for Dividend Yield */}
            {showDividendYield && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#fb7185"
                fontSize={11}
                tickFormatter={(val) => `${val.toFixed(1)}%`}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                domain={['auto', 'auto']}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Average PE Reference Line */}
            {showAverageLine && (
              <ReferenceLine 
                yAxisId="left"
                y={avgPE} 
                stroke="#fbbf24" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                  value: `均值 ${avgPE}x`, 
                  fill: '#fbbf24', 
                  fontSize: 10, 
                  position: 'insideTopRight' 
                }} 
              />
            )}

            {/* Min PE Reference Line (Valuation Bottom) */}
            {showExtremes && (
              <ReferenceLine 
                yAxisId="left"
                y={minPE} 
                stroke="#34d399" 
                strokeDasharray="3 3" 
                strokeWidth={1.2}
                label={{ 
                  value: `12M底 ${minPE}x`, 
                  fill: '#34d399', 
                  fontSize: 10, 
                  position: 'insideBottomRight' 
                }} 
              />
            )}

            {/* Max PE Reference Line */}
            {showExtremes && (
              <ReferenceLine 
                yAxisId="left"
                y={maxPE} 
                stroke="#f43f5e" 
                strokeDasharray="3 3" 
                strokeWidth={1.2}
                label={{ 
                  value: `12M顶 ${maxPE}x`, 
                  fill: '#f43f5e', 
                  fontSize: 10, 
                  position: 'insideTopLeft' 
                }} 
              />
            )}

            {/* Shaded Area under PE curve */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="pe"
              stroke="none"
              fill="url(#peAreaGradient)"
            />

            {/* Main PE Curve Line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="pe"
              name="PE-TTM 估值"
              stroke="#818cf8"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#818cf8', strokeWidth: 1, stroke: '#1e1b4b' }}
              activeDot={{ r: 6, fill: '#a5b4fc', stroke: '#4338ca', strokeWidth: 2 }}
            />

            {/* Secondary Dividend Yield Line */}
            {showDividendYield && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="dividendYield"
                name="滚动股息率 %"
                stroke="#fb7185"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 2.5, fill: '#fb7185' }}
                activeDot={{ r: 5, fill: '#f43f5e' }}
              />
            )}

          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Valuation Assessment & Decision Advice Callout */}
      <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
        percentileLevel === 'bottom'
          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
          : percentileLevel === 'low'
          ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200'
          : percentileLevel === 'mid'
          ? 'bg-slate-900 border-slate-700 text-slate-300'
          : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
      }`}>
        <div className="font-bold mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>估值底部研判与股息安全垫分析：</span>
        </div>
        <p className="opacity-90">
          {recommendation}
        </p>
        <div className="mt-1.5 pt-1.5 border-t border-slate-700/50 flex flex-wrap items-center justify-between text-[11px] opacity-80">
          <span>* 核心投资逻辑：当股票处于“PE估值历史底部”且“股息率处于历史高位”时，呈现出显著的非对称赔率（下有现金红利保底防御，上有估值均值回归修复弹性）。</span>
        </div>
      </div>

    </div>
  );
};
