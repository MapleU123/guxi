import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, ShieldCheck, ShieldAlert, Activity, CheckCircle2, 
  AlertTriangle, Percent, DollarSign, Award, Info, Sliders, Calendar
} from 'lucide-react';
import { Stock } from '../types';
import { getDividendSustainabilityEvaluation } from '../utils/calculator';

interface DividendSustainabilityChartProps {
  stock: Stock;
}

export const DividendSustainabilityChart: React.FC<DividendSustainabilityChartProps> = ({ stock }) => {
  // Toggle switches for chart options
  const [viewScope, setViewScope] = useState<'3years' | 'all'>('3years');
  const [showYieldLine, setShowYieldLine] = useState<boolean>(true);
  const [showDPSLine, setShowDPSLine] = useState<boolean>(true);
  const [showPayoutLine, setShowPayoutLine] = useState<boolean>(true);
  const [showHealthyArea, setShowHealthyArea] = useState<boolean>(true);
  const [showAvgYieldRef, setShowAvgYieldRef] = useState<boolean>(true);

  // Compute sustainability evaluation metrics
  const evaluation = useMemo(() => {
    return getDividendSustainabilityEvaluation(stock);
  }, [stock]);

  const {
    points,
    threeYearAvgYield,
    threeYearAvgPayoutRatio,
    dpsCAGR,
    consecutiveYears,
    stabilityScore,
    sustainabilityGrade,
    gradeLabel,
    gradeColor,
    payoutHealthStatus,
    diagnosisItems,
    expertSummary
  } = evaluation;

  // Filter points according to selected view scope (recent 3 years vs all available up to 5)
  const chartData = useMemo(() => {
    if (viewScope === '3years') {
      return points.slice(-3);
    }
    return points.slice(-5);
  }, [points, viewScope]);

  // Determine dynamic axis ranges
  const maxYield = Math.max(...chartData.map(d => d.dividendYield), 10);
  const maxPayout = Math.max(...chartData.map(d => d.payoutRatio), 80);
  const leftAxisMax = Math.min(120, Math.ceil(Math.max(maxYield * 1.25, maxPayout * 1.1) / 10) * 10);

  const maxDPS = Math.max(...chartData.map(d => d.dividendPerShare), 0.5);
  const rightAxisMax = Number((maxDPS * 1.3).toFixed(2));

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 z-50 min-w-[210px]">
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              {data.year} 年度分红派息
            </span>
            <span className="text-[11px] font-mono text-slate-400">{data.scheme}</span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-rose-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                当年股息率:
              </span>
              <span className="font-mono font-bold text-rose-300">
                {data.dividendYield.toFixed(2)}%
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-amber-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                每股派息(税前):
              </span>
              <span className="font-mono font-bold text-amber-300">
                ¥{data.dividendPerShare.toFixed(3)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                股利支付率:
              </span>
              <span className="font-mono font-bold text-emerald-300">
                {data.payoutRatio.toFixed(1)}%
              </span>
            </div>

            {data.growthRate !== undefined && (
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 text-[11px]">每股分红同比:</span>
                <span className={`font-mono text-[11px] font-semibold ${
                  data.growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {data.growthRate >= 0 ? '+' : ''}{data.growthRate.toFixed(1)}%
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-0.5">
              <span className="text-slate-400 text-[11px]">年度现金分红总额:</span>
              <span className="font-mono text-[11px] text-slate-300">
                {data.cashTotal.toFixed(2)} 亿元
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 shadow-xl space-y-4">
      {/* Header with Title & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              近三年股息率趋势与分红稳定性分析
            </h3>
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${gradeColor}`}>
              <Award className="w-3.5 h-3.5" />
              <span>{gradeLabel} ({sustainabilityGrade}级 · {stabilityScore}分)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            动态跟踪近三年每股派息、实际股息率与股利支付率曲线，综合检验分红连续性与现金流可持续支撑度
          </p>
        </div>

        {/* View Scope Controls (3 Years vs 5 Years) */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewScope('3years')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              viewScope === '3years'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            近3年重点
          </button>
          <button
            onClick={() => setViewScope('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              viewScope === 'all'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            近5年全景
          </button>
        </div>
      </div>

      {/* 4 Quantitative Sustainability Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 3-Year Average Dividend Yield */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-rose-500/30">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 text-rose-300 font-semibold">
              <Percent className="w-3 h-3 text-rose-400" />
              近3年平均股息率
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-rose-400">
            {threeYearAvgYield.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            现价TTM: <span className="font-mono text-slate-200">{stock.ttmDividendYield.toFixed(2)}%</span>
            {stock.ttmDividendYield >= threeYearAvgYield ? (
              <span className="text-emerald-400 ml-1">(高于均值)</span>
            ) : (
              <span className="text-amber-400 ml-1">(贴近均值)</span>
            )}
          </div>
        </div>

        {/* 3-Year DPS CAGR Growth */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-amber-500/30">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 text-amber-300 font-semibold">
              <DollarSign className="w-3 h-3 text-amber-400" />
              近3年每股分红增速
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {dpsCAGR >= 0 ? `+${dpsCAGR}%` : `${dpsCAGR}%`}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            复合年均增速 (CAGR) · {dpsCAGR >= 0 ? '现金派发逐年稳增' : '随周期平稳韧性'}
          </div>
        </div>

        {/* 3-Year Average Payout Ratio */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-emerald-500/30">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 text-emerald-300 font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              平均股利支付率
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {threeYearAvgPayoutRatio.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {payoutHealthStatus === 'healthy' ? (
              <span className="text-emerald-400 font-medium">30%~75% 黄金健康带</span>
            ) : payoutHealthStatus === 'overpaid' ? (
              <span className="text-amber-400 font-medium">支付率偏高(&gt;80%)</span>
            ) : (
              <span className="text-cyan-400 font-medium">留存利润充足(&lt;25%)</span>
            )}
          </div>
        </div>

        {/* Consecutive Years & Score */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-indigo-500/30">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 text-indigo-300 font-semibold">
              <Activity className="w-3 h-3 text-indigo-400" />
              分红稳定性综合得分
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-indigo-400">
            {stabilityScore} / 100
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            连续分红 <span className="font-mono text-indigo-300 font-bold">{consecutiveYears}</span> 年无中断
          </div>
        </div>
      </div>

      {/* Chart Interactive Metric Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span>图表图层:</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Yield Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={showYieldLine}
              onChange={(e) => setShowYieldLine(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>股息率 (%)</span>
          </label>

          {/* DPS Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={showDPSLine}
              onChange={(e) => setShowDPSLine(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            <span>每股派息 (元/股)</span>
          </label>

          {/* Payout Ratio Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={showPayoutLine}
              onChange={(e) => setShowPayoutLine(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            <span>股利支付率 (%)</span>
          </label>

          {/* 30%~75% Healthy Zone Area Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={showHealthyArea}
              onChange={(e) => setShowHealthyArea(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500 inline-block"></span>
            <span>支付率健康带 (30~75%)</span>
          </label>

          {/* 3-Year Avg Ref Line */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={showAvgYieldRef}
              onChange={(e) => setShowAvgYieldRef(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-rose-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="w-3 border-t-2 border-dashed border-rose-400 inline-block"></span>
            <span>3年均值线 ({threeYearAvgYield}%)</span>
          </label>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="w-full h-72 sm:h-80 relative pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 25, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="dividendYieldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.5} />

            {/* X Axis: Years */}
            <XAxis 
              dataKey="yearLabel" 
              stroke="#94a3b8" 
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
            />

            {/* Left Y Axis: Yield & Payout Ratio (%) */}
            <YAxis 
              yAxisId="left"
              orientation="left"
              domain={[0, leftAxisMax]}
              stroke="#94a3b8" 
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(v) => `${v}%`}
            />

            {/* Right Y Axis: Dividend Per Share (¥) */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={[0, rightAxisMax]}
              stroke="#fbbf24" 
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(v) => `¥${v}`}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Healthy Payout Ratio Safe Range Reference Lines (30% ~ 75%) */}
            {showHealthyArea && (
              <>
                <ReferenceLine
                  yAxisId="left"
                  y={75}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: '支付率上限 75%',
                    fill: '#34d399',
                    fontSize: 10,
                    position: 'insideTopRight'
                  }}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={30}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: '支付率适度线 30%',
                    fill: '#34d399',
                    fontSize: 10,
                    position: 'insideBottomRight'
                  }}
                />
              </>
            )}

            {/* 3-Year Average Yield Reference Line */}
            {showAvgYieldRef && (
              <ReferenceLine
                yAxisId="left"
                y={threeYearAvgYield}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ 
                  value: `3年均率 ${threeYearAvgYield}%`, 
                  fill: '#fb7185', 
                  fontSize: 10,
                  position: 'insideTopLeft' 
                }}
              />
            )}

            {/* Dividend Yield Area & Line (Rose) */}
            {showYieldLine && (
              <>
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="dividendYield"
                  fill="url(#dividendYieldGradient)"
                  stroke="none"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="dividendYield"
                  name="股息率(%)"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#881337' }}
                  activeDot={{ r: 6, fill: '#fda4af', strokeWidth: 2, stroke: '#f43f5e' }}
                />
              </>
            )}

            {/* Dividend Per Share (DPS) Line (Amber, Right Axis) */}
            {showDPSLine && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="dividendPerShare"
                name="每股派息(元)"
                stroke="#fbbf24"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#fbbf24', strokeWidth: 2, stroke: '#78350f' }}
                activeDot={{ r: 6, fill: '#fef08a', strokeWidth: 2, stroke: '#fbbf24' }}
              />
            )}

            {/* Payout Ratio Line (Emerald dashed) */}
            {showPayoutLine && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="payoutRatio"
                name="股利支付率(%)"
                stroke="#34d399"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3.5, fill: '#34d399', strokeWidth: 1.5, stroke: '#064e3b' }}
                activeDot={{ r: 5, fill: '#6ee7b7', strokeWidth: 2, stroke: '#34d399' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sustainability 4-Dimension Diagnostic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {diagnosisItems.map((item, idx) => (
          <div 
            key={idx}
            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5"
          >
            <div className="mt-0.5 shrink-0">
              {item.status === 'good' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : item.status === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <Info className="w-4 h-4 text-cyan-400" />
              )}
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-200 flex items-center gap-2">
                <span>{item.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  item.status === 'good' ? 'bg-emerald-500/20 text-emerald-300' :
                  item.status === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-cyan-500/20 text-cyan-300'
                }`}>
                  {item.status === 'good' ? '健康达标' : item.status === 'warning' ? '需予关注' : '中性正常'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Expert Summary Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <div className="font-bold text-indigo-300 flex items-center gap-1.5 mb-0.5">
            <span>分红可持续性深度诊断意见</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {sustainabilityGrade}级评级
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {expertSummary}
          </p>
        </div>
      </div>
    </div>
  );
};
