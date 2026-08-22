import React, { useState } from 'react';
import { 
  Target, Sparkles, TrendingUp, TrendingDown, ShieldCheck, 
  ShieldAlert, Compass, CheckCircle2, ChevronRight, HelpCircle,
  Zap, Award, ArrowUpRight, Scale
} from 'lucide-react';
import { Stock, BuyOpportunityEvaluation } from '../types';
import { calculateBuyOpportunityScore, get12MonthPEHistory } from '../utils/calculator';

interface BuyOpportunityIndicatorProps {
  stock: Stock;
}

export const BuyOpportunityIndicator: React.FC<BuyOpportunityIndicatorProps> = ({ stock }) => {
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  const valuation = get12MonthPEHistory(stock);
  const evaluation: BuyOpportunityEvaluation = calculateBuyOpportunityScore(stock, valuation);

  const { score, grade, gradeLabel, actionAdvice, timingTag, factors, summary } = evaluation;

  // Grade color themes
  const gradeStyles = {
    S: {
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40',
      ring: 'from-emerald-500 to-teal-400',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bgGlow: 'bg-emerald-950/20',
      needleRotation: ((score / 100) * 180) - 90,
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />
    },
    A: {
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-950/40',
      ring: 'from-cyan-500 to-emerald-400',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      bgGlow: 'bg-cyan-950/20',
      needleRotation: ((score / 100) * 180) - 90,
      icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />
    },
    B: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/40',
      ring: 'from-amber-500 to-yellow-400',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      bgGlow: 'bg-amber-950/20',
      needleRotation: ((score / 100) * 180) - 90,
      icon: <Scale className="w-4 h-4 text-amber-400" />
    },
    C: {
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-950/40',
      ring: 'from-rose-500 to-amber-500',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      bgGlow: 'bg-rose-950/20',
      needleRotation: ((score / 100) * 180) - 90,
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />
    }
  }[grade];

  // SVG Semi-Circle Gauge Parameters
  const radius = 70;
  const strokeWidth = 12;
  const circumference = Math.PI * radius;
  const progressOffset = circumference - (score / 100) * circumference;

  return (
    <div className={`p-5 rounded-2xl border transition-all ${gradeStyles.border} ${gradeStyles.bgGlow} bg-slate-900/90 shadow-xl`}>
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shadow-inner">
            <Target className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-100">
                买入机会评分与安全垫指示器
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                PE估值分位 + 股息收益模型
              </span>
            </div>
            <p className="text-xs text-slate-400">
              结合过去12个月PE滚动分位数、即期股息保底收益与均值偏离弹性进行综合决策评级
            </p>
          </div>
        </div>

        {/* Grade Pill Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-md ${gradeStyles.badge}`}>
            {gradeStyles.icon}
            <span className="font-mono text-sm">{grade}级</span>
            <span>·</span>
            <span>{gradeLabel}</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 items-center">
        
        {/* Left Column: Semi-Circle Gauge (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <div className="relative w-48 h-28 flex items-center justify-center overflow-hidden">
            <svg className="w-48 h-48 -rotate-180 transform" viewBox="0 0 160 160">
              {/* Background Arc */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                className="text-slate-800"
              />
              {/* Colored Segments Background Markers */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="url(#opportunityGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={progressOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              {/* Gradient Definition */}
              <defs>
                <linearGradient id="opportunityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="75%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>

            {/* Score Text in Center */}
            <div className="absolute bottom-1 flex flex-col items-center text-center">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-100">
                {score.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                满分 100 分
              </span>
            </div>
          </div>

          {/* Scale Labels Under Gauge */}
          <div className="w-full flex justify-between px-4 text-[10px] text-slate-500 font-mono -mt-1">
            <span className="text-rose-400">0 (偏高)</span>
            <span className="text-amber-400">60 (中性)</span>
            <span className="text-emerald-400">100 (极佳)</span>
          </div>

          <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>时机诊断: </span>
            <span className={gradeStyles.text}>{timingTag}</span>
          </div>
        </div>

        {/* Middle & Right Column: 4 Factor Bars (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          
          {/* Factor 1: PE Percentile (40%) */}
          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                PE历史估值底部安全垫 (权重 40%)
              </span>
              <span className="font-mono font-bold text-slate-200">
                {factors.pePercentileScore}分 
                <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                  (分位: <strong className="text-indigo-300">{factors.pePercentile}%</strong>)
                </span>
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500" 
                style={{ width: `${factors.pePercentileScore}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>当前PE: {valuation.currentPE}倍 (12月区间: {valuation.minPE} ~ {valuation.maxPE}倍)</span>
              <span className={factors.pePercentile <= 30 ? 'text-emerald-400' : 'text-slate-400'}>
                {factors.pePercentile <= 25 ? '★ 处于历史极限估值底' : factors.pePercentile <= 50 ? '低于估值中枢' : '分位偏高'}
              </span>
            </div>
          </div>

          {/* Factor 2: Dividend Yield Buffer (30%) */}
          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                滚动股息率保底收益 (权重 30%)
              </span>
              <span className="font-mono font-bold text-slate-200">
                {factors.dividendYieldScore}分
                <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                  (股息率: <strong className="text-rose-400">{factors.actualYield}%</strong>)
                </span>
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500" 
                style={{ width: `${factors.dividendYieldScore}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>每股已宣布分红: ¥{stock.ttmDividendPerShare.toFixed(3)} 元</span>
              <span className={factors.actualYield >= 5.0 ? 'text-rose-400 font-medium' : 'text-slate-400'}>
                {factors.actualYield >= 6.0 ? '★ 超高现金分红回报' : factors.actualYield >= 4.0 ? '高股息防御性良好' : '收益率一般'}
              </span>
            </div>
          </div>

          {/* Factor 3 & 4 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Factor 3: 1Y Mean PE Discount (15%) */}
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  较1年均值偏离 (15%)
                </span>
                <span className="font-mono font-bold text-slate-200">{factors.meanDeviationScore}分</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${factors.meanDeviationScore}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>1年PE均值: {valuation.avgPE}倍</span>
                <span className={factors.discountToMean > 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                  {factors.discountToMean > 0 ? `折价 ${factors.discountToMean}%` : `溢价 ${Math.abs(factors.discountToMean)}%`}
                </span>
              </div>
            </div>

            {/* Factor 4: Quality & Defense (15%) */}
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  ROE盈利护城河 (15%)
                </span>
                <span className="font-mono font-bold text-slate-200">{factors.qualityDefenseScore}分</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
                  style={{ width: `${factors.qualityDefenseScore}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>ROE: {factors.roe}%</span>
                <span>连续分红: {stock.dividendYears}年</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Actionable Advice & Decision Strategy Banner */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              操盘策略指引：
            </span>
            <span className="font-semibold text-slate-100">{actionAdvice}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {summary}
          </p>
        </div>

        <button
          onClick={() => setShowFormulaDetails(!showFormulaDetails)}
          className="text-slate-400 hover:text-slate-200 text-[11px] underline underline-offset-2 flex items-center gap-1 shrink-0 transition"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showFormulaDetails ? '收起打分公式' : '评分算法说明'}</span>
        </button>
      </div>

      {/* Expandable Formula Explanation */}
      {showFormulaDetails && (
        <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 space-y-2 animate-in fade-in duration-200">
          <div className="font-semibold text-slate-200 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            买入机会评分（Buy Opportunity Score）模型权重公式：
          </div>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 space-y-1">
            <div><strong>综合评分 =</strong> PE分位得分×40% + 股息率得分×30% + 均值折价得分×15% + ROE质量得分×15%</div>
            <div className="text-slate-400">
              ● <strong>PE分位得分</strong>: 历史分位数越低得分越高，0%分位得100分（极佳安全边际）；
            </div>
            <div className="text-slate-400">
              ● <strong>股息率得分</strong>: 滚动股息率越高得分越高，&ge;8%得95~100分，防范低息高估值；
            </div>
            <div className="text-slate-400">
              ● <strong>均值折价得分</strong>: 较近1年PE均值折价比例，折价越深向上弹性与估值修复空间越大；
            </div>
            <div className="text-slate-400">
              ● <strong>ROE盈利护城河</strong>: 结合资本回报率与连续分红年限，有效排除“亏损分红”或“高息陷阱”。
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
