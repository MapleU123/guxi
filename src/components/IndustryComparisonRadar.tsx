import React, { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import {
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Scale,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Percent,
  Coins,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Stock, IndustryComparisonResult } from '../types';
import { getIndustryComparison } from '../utils/calculator';

interface IndustryComparisonRadarProps {
  stock: Stock;
  allStocks?: Stock[];
}

export const IndustryComparisonRadar: React.FC<IndustryComparisonRadarProps> = ({ stock, allStocks }) => {
  const [viewMode, setViewMode] = useState<'radar' | 'table'>('radar');
  const [showFormula, setShowFormula] = useState<boolean>(false);

  const comparison: IndustryComparisonResult = getIndustryComparison(stock, allStocks);
  const { industryName, stockCount, dimensions, radarData, superiorCount, overallVerdict, leaderAdvantageTitle } = comparison;

  // Custom Radar Tooltip
  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0]?.payload;
      if (!dataItem) return null;

      const dimInfo = dimensions.find(d => d.dimension === dataItem.dimension);

      return (
        <div className="bg-slate-900/95 p-3 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-md text-xs z-50 min-w-[200px]">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              {dataItem.dimension}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              dimInfo?.status === 'superior' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : dimInfo?.status === 'inferior' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-slate-300'
            }`}>
              {dimInfo?.status === 'superior' ? '优于行业' : dimInfo?.status === 'inferior' ? '落后行业' : '行业相仿'}
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between items-center text-cyan-300 font-semibold">
              <span className="font-sans text-slate-400 text-[11px]">{stock.name}:</span>
              <span>{dataItem.stockRaw}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-sans text-slate-400 text-[11px]">{industryName}均值:</span>
              <span>{dataItem.industryRaw}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[11px]">
              <span className="font-sans text-slate-400">相对优势:</span>
              <span className={dimInfo?.status === 'superior' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-medium'}>
                {dataItem.advantageText}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                行业多维相对优势对比雷达
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                所属【{industryName}】行业
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700">
                样本对比池: {stockCount}只
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              对比【股息率、PE估值、ROE水平、成长增速】四大核心维度与行业均值的优劣势
            </p>
          </div>
        </div>

        {/* Advantage Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm ${
            superiorCount >= 3 
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
              : superiorCount >= 2
              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            <Award className="w-4 h-4 text-amber-400" />
            <span>{leaderAdvantageTitle}</span>
            <span className="font-mono bg-slate-900/80 px-1.5 py-0.2 rounded text-[10px] border border-slate-700">
              {superiorCount}/4维领先
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Radar Chart & 4 Dimension Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        
        {/* Left Side: Radar Chart (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
          <div className="w-full flex items-center justify-between px-2 text-[11px] text-slate-400 mb-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-cyan-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
                {stock.name}
              </span>
              <span className="flex items-center gap-1 text-slate-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-500"></span>
                行业平均值
              </span>
            </div>
            <span className="text-[10px] text-slate-500">外圈代表更优</span>
          </div>

          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                <PolarAngleAxis 
                  dataKey="dimension" 
                  tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }} 
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={false} 
                  axisLine={false} 
                />
                {/* Industry Average Radar */}
                <Radar
                  name={`${industryName}均值`}
                  dataKey="industryScore"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="#64748b"
                  fillOpacity={0.2}
                />
                {/* Current Stock Radar */}
                <Radar
                  name={stock.name}
                  dataKey="stockScore"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="#06b6d4"
                  fillOpacity={0.45}
                  dot={{ r: 4, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 1.5 }}
                />
                <Tooltip content={<CustomRadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full text-center text-[10px] text-slate-500 border-t border-slate-800/80 pt-2">
            * PE估值已转化为估值吸引力得分（PE越低/折价越大，外延得分越高）
          </div>
        </div>

        {/* Right Side: 4 Dimensions Benchmark Breakdown (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-2.5">
          {dimensions.map((dim) => {
            const isSuperior = dim.status === 'superior';
            const isInferior = dim.status === 'inferior';

            // Theme colors per dimension
            const dimConfig = {
              '股息率': {
                icon: <Coins className="w-4 h-4 text-rose-400" />,
                borderAccent: 'border-rose-500/30',
                color: 'text-rose-400',
                barColor: 'bg-gradient-to-r from-rose-500 to-amber-400'
              },
              'PE估值': {
                icon: <Scale className="w-4 h-4 text-indigo-400" />,
                borderAccent: 'border-indigo-500/30',
                color: 'text-indigo-400',
                barColor: 'bg-gradient-to-r from-indigo-500 to-cyan-400'
              },
              'ROE水平': {
                icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
                borderAccent: 'border-emerald-500/30',
                color: 'text-emerald-400',
                barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400'
              },
              '成长增速': {
                icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
                borderAccent: 'border-amber-500/30',
                color: 'text-amber-400',
                barColor: 'bg-gradient-to-r from-amber-500 to-yellow-400'
              }
            }[dim.dimension];

            return (
              <div 
                key={dim.dimension} 
                className={`p-3 rounded-xl bg-slate-950/60 border ${dimConfig.borderAccent} hover:bg-slate-950/90 transition-all`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    {dimConfig.icon}
                    <span className="font-bold text-slate-200">{dim.dimension}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      isSuperior 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : isInferior 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {isSuperior && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {isSuperior ? '优于行业' : isInferior ? '弱于行业' : '与行业持平'}
                    </span>
                  </div>
                </div>

                {/* Values Comparison Bar & Numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 text-xs py-1 items-center font-mono">
                  
                  {/* Stock Value */}
                  <div className="sm:col-span-5 bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-[11px] font-sans text-slate-400">{stock.name}:</span>
                    <span className={`font-bold text-sm ${dimConfig.color}`}>
                      {dim.dimension === '成长增速' && dim.stockValue >= 0 ? '+' : ''}
                      {dim.stockValue} {dim.unit}
                    </span>
                  </div>

                  {/* Industry Average Value */}
                  <div className="sm:col-span-4 bg-slate-900/60 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-[11px] font-sans text-slate-500">行业均值:</span>
                    <span className="font-medium text-slate-300 text-xs">
                      {dim.dimension === '成长增速' && dim.industryAvg >= 0 ? '+' : ''}
                      {dim.industryAvg} {dim.unit}
                    </span>
                  </div>

                  {/* Advantage Diff */}
                  <div className="col-span-2 sm:col-span-3 text-right sm:text-center">
                    <span className={`text-[11px] font-bold ${isSuperior ? 'text-emerald-400' : isInferior ? 'text-amber-400' : 'text-slate-400'}`}>
                      {dim.dimension === 'PE估值' 
                        ? (dim.diffPercent >= 0 ? `折价 ${dim.diffPercent}%` : `溢价 ${Math.abs(dim.diffPercent)}%`)
                        : (dim.diff >= 0 ? `+${dim.diff}${dim.unit}` : `${dim.diff}${dim.unit}`)
                      }
                    </span>
                  </div>
                </div>

                {/* One-sentence concise conclusion */}
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span className="leading-snug">{dim.evaluation}</span>
                  <span className="text-[10px] text-slate-500 shrink-0 font-mono ml-2">
                    雷达评分: <strong className={dimConfig.color}>{dim.stockRadarScore}分</strong> vs 行业{dim.industryRadarScore}分
                  </span>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Comprehensive Diagnostic Banner */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              行业相对优劣综合研判：
            </span>
            <span className="font-semibold text-slate-200">
              领先维度 {superiorCount} / 4 项
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {overallVerdict}
          </p>
        </div>

        <button
          onClick={() => setShowFormula(!showFormula)}
          className="text-slate-400 hover:text-slate-200 text-[11px] underline underline-offset-2 flex items-center gap-1 shrink-0 transition"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showFormula ? '收起对比说明' : '雷达模型说明'}</span>
        </button>
      </div>

      {/* Expandable Model Details */}
      {showFormula && (
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 space-y-2 animate-in fade-in duration-200">
          <div className="font-semibold text-slate-200 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            行业多维相对优势雷达对比计算规则：
          </div>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 space-y-1">
            <div>● <strong>股息率维度</strong>: 取滚动 TTM 股息率，对比所属行业所有样本均值，股息率越高代表安全边际与分红回报越坚实。</div>
            <div>● <strong>PE估值维度</strong>: 转化为估值吸引力指标，当个股市盈率低于行业平均值（即折价）时，得分更高、向上修复弹性更大。</div>
            <div>● <strong>ROE水平维度</strong>: 衡量资本使用效率与护城河深浅，ROE 显著超越行业均值代表单位资本创造利润能力更强。</div>
            <div>● <strong>成长增速维度</strong>: 结合最新财报归母净利润同比增速，评估企业在稳健高分红的同时是否具备穿越周期的内生增长动力。</div>
          </div>
        </div>
      )}

    </div>
  );
};
