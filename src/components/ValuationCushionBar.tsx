import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  TrendingUp, 
  HelpCircle, 
  Info, 
  Compass, 
  ChevronRight, 
  Sparkles, 
  Scale, 
  Percent,
  Layers,
  ArrowUpRight,
  Zap
} from 'lucide-react';
import { Stock, FiveYearPEValuationCushion } from '../types';
import { calculateFiveYearPEValuationCushion } from '../utils/calculator';

interface ValuationCushionBarProps {
  stock: Stock;
}

export const ValuationCushionBar: React.FC<ValuationCushionBarProps> = ({ stock }) => {
  const [showLogicDetails, setShowLogicDetails] = useState<boolean>(false);

  const cushion: FiveYearPEValuationCushion = calculateFiveYearPEValuationCushion(stock);

  const {
    currentPE,
    fiveYearMinPE,
    fiveYearMaxPE,
    fiveYearAvgPE,
    fiveYearMedianPE,
    fiveYearPercentile,
    cushionPercent,
    cushionGrade,
    cushionGradeLabel,
    cushionFormulaDescription,
    repairPotentialPercent,
    historySamplePoints
  } = cushion;

  // Grade style mappings
  const theme = {
    extreme: {
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40',
      barGradient: 'from-emerald-600 via-emerald-400 to-teal-300',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      bgGlow: 'bg-emerald-950/15',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />
    },
    high: {
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-950/40',
      barGradient: 'from-cyan-600 via-teal-400 to-emerald-300',
      textColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      bgGlow: 'bg-cyan-950/15',
      icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />
    },
    medium: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/40',
      barGradient: 'from-amber-600 via-amber-400 to-yellow-300',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      bgGlow: 'bg-amber-950/15',
      icon: <Shield className="w-4 h-4 text-amber-400" />
    },
    low: {
      badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-orange-950/40',
      barGradient: 'from-orange-600 via-orange-400 to-amber-300',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-500/30',
      bgGlow: 'bg-orange-950/15',
      icon: <ShieldAlert className="w-4 h-4 text-orange-400" />
    },
    tight: {
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-950/40',
      barGradient: 'from-rose-600 via-rose-500 to-amber-400',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/30',
      bgGlow: 'bg-rose-950/15',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />
    }
  }[cushionGrade];

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${theme.borderColor} ${theme.bgGlow} bg-slate-900/90 shadow-xl space-y-4`}>
      
      {/* Header Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                5年历史PE估值安全垫量化指标
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                PE-TTM: {currentPE}倍
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono">
                5年分位: {fiveYearPercentile}%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              基于滚动市盈率与近五年历史PE分位数差值量化，评估下行防御厚度与均值修复空间
            </p>
          </div>
        </div>

        {/* Cushion Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm ${theme.badge}`}>
            {theme.icon}
            <span>{cushionGradeLabel}</span>
          </div>
        </div>
      </div>

      {/* Primary Visual: Cushion Percentage Metric & Multi-layer Progress Bar */}
      <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/90 space-y-3">
        
        {/* Top Metric Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              当前量化估值安全垫厚度
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${theme.textColor}`}>
                {cushionPercent}%
              </span>
              <span className="text-xs text-slate-400 font-medium">
                (计算逻辑: 100% - 5年分位 {fiveYearPercentile}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block font-sans">5年PE估值区间</span>
              <span className="text-slate-300 font-semibold">{fiveYearMinPE} ~ {fiveYearMaxPE} 倍</span>
            </div>
            <div className="w-[1px] h-7 bg-slate-800 hidden sm:block"></div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block font-sans">修复至5年均值弹性</span>
              <span className={`font-bold ${repairPotentialPercent > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {repairPotentialPercent > 0 ? `+${repairPotentialPercent}%` : `${repairPotentialPercent}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar Component */}
        <div className="space-y-1.5 pt-1">
          <div className="relative w-full h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden shadow-inner p-0.5">
            {/* Gradient Filled Safe Zone */}
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${theme.barGradient} transition-all duration-1000 ease-out shadow-lg relative`}
              style={{ width: `${cushionPercent}%` }}
            >
              {/* Subtle animated shimmer */}
              <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Scale Axis Markers */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-1">
            <span className="flex items-center gap-1 text-rose-400">
              <span>0% (高估无垫)</span>
            </span>
            <span className="text-slate-400">
              50% (中枢平衡)
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span>100% (极限极厚)</span>
            </span>
          </div>
        </div>

        {/* 5-Year PE Context Ruler */}
        <div className="pt-2 border-t border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
            <span className="text-[11px] text-slate-400">5年最低PE:</span>
            <span className="font-mono font-semibold text-emerald-400">{fiveYearMinPE}倍</span>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
            <span className="text-[11px] text-slate-400">5年中枢均值:</span>
            <span className="font-mono font-semibold text-amber-300">{fiveYearAvgPE}倍</span>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
            <span className="text-[11px] text-slate-400">当前PE-TTM:</span>
            <span className="font-mono font-bold text-cyan-300">{currentPE}倍</span>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
            <span className="text-[11px] text-slate-400">5年最高PE:</span>
            <span className="font-mono font-semibold text-rose-400">{fiveYearMaxPE}倍</span>
          </div>
        </div>

      </div>

      {/* 5-Year History Points Strip */}
      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
        <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            近五年 PE 历史轨迹采样对比
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            当前处于【{cushionPercent >= 70 ? '估值深水底' : cushionPercent >= 50 ? '合理估值带' : '估值景气区'}】
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono">
          {historySamplePoints.map((item, idx) => {
            const isCurrent = idx === historySamplePoints.length - 1;
            return (
              <div 
                key={item.year}
                className={`p-2 rounded-lg border text-xs ${
                  isCurrent 
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold' 
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-[10px] text-slate-500 font-sans">{item.year}</div>
                <div className="text-xs font-semibold mt-0.5">
                  {item.pe}倍
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quantitative Insight Banner & Toggle Formula */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              估值安全垫量化结论：
            </span>
            <span className="font-semibold text-slate-200">
              {cushionGradeLabel}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {cushionFormulaDescription}
          </p>
        </div>

        <button
          onClick={() => setShowLogicDetails(!showLogicDetails)}
          className="text-slate-400 hover:text-slate-200 text-[11px] underline underline-offset-2 flex items-center gap-1 shrink-0 transition"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showLogicDetails ? '收起计算公式' : '安全垫差值计算公式'}</span>
        </button>
      </div>

      {/* Expandable Formula Explanation */}
      {showLogicDetails && (
        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] text-slate-300 space-y-2 animate-in fade-in duration-200">
          <div className="font-semibold text-slate-200 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            估值安全垫差值计算数学逻辑（Margin of Safety Formula）：
          </div>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 space-y-1.5">
            <div>
              1. <strong>近五年历史PE分位数（Percentile）</strong> = <span className="text-cyan-300">(PE_TTM - 5年MinPE) / (5年MaxPE - 5年MinPE) × 100%</span>
            </div>
            <div>
              2. <strong>估值安全垫百分比（Cushion %）</strong> = <span className="text-emerald-300">100% - 近五年PE历史分位数</span>
            </div>
            <div className="text-slate-400 pt-1 border-t border-slate-800">
              ● <strong>当安全垫 &ge; 80% 时</strong>：代表当前市盈率位于近五年最低 20% 分位以内，估值底部形态极其坚固，向下回撤空间极小；<br/>
              ● <strong>当安全垫在 50% ~ 79% 时</strong>：估值处于历史中枢偏下，安全边际充足，叠加高股息率可提供丰厚的非对称确定性收益；<br/>
              ● <strong>当安全垫 &lt; 30% 时</strong>：估值处于历史高分位，安全垫较薄，需防范估值回撤风险。
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
