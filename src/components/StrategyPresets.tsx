import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Shield, 
  Flame, 
  Gem, 
  Compass, 
  BarChart3, 
  SlidersHorizontal, 
  Filter, 
  Check, 
  RotateCcw, 
  Percent, 
  Gauge, 
  ChevronDown, 
  ChevronUp, 
  Zap,
  Plus,
  Minus
} from 'lucide-react';
import { FilterCriteria, StrategyPreset } from '../types';

interface StrategyPresetsProps {
  currentCriteria: FilterCriteria;
  onApplyPreset: (criteria: Partial<FilterCriteria>) => void;
  onReset: () => void;
  matchedCount?: number;
}

const PRESETS: StrategyPreset[] = [
  {
    id: 'default_core',
    name: '标准高股息 (默认)',
    badge: '3% + PE≤20',
    description: '股息率≥3% · PE≤20 · 排除ST与退市',
    iconName: 'Sparkles',
    criteria: {
      minDividendYield: 3.0,
      maxPE: 20,
      excludeST: true,
      excludeDelisted: true,
      selectedIndustries: [],
      minMarketCap: 0,
      minROE: 0,
      minDividendYears: 0,
      searchQuery: ''
    }
  },
  {
    id: 'leader_core',
    name: '红利龙头核心池',
    badge: '高ROE + 大市值',
    description: '股息率≥4% · PE≤15 · 市值≥500亿 · ROE≥10%',
    iconName: 'Gem',
    criteria: {
      minDividendYield: 4.0,
      maxPE: 15,
      excludeST: true,
      excludeDelisted: true,
      minMarketCap: 500,
      minROE: 10,
      minDividendYears: 5
    }
  },
  {
    id: 'aristocrat',
    name: '十年红利贵族',
    badge: '连续分红≥10年',
    description: '连续分红≥10年 · 股息率≥3.5% · PE≤18',
    iconName: 'Shield',
    criteria: {
      minDividendYield: 3.5,
      maxPE: 18,
      excludeST: true,
      excludeDelisted: true,
      minDividendYears: 10
    }
  },
  {
    id: 'super_yield',
    name: '超高股息精选',
    badge: '股息率≥5.5%',
    description: '滚动股息率≥5.5% · PE≤12 · 极致现金收益',
    iconName: 'Flame',
    criteria: {
      minDividendYield: 5.5,
      maxPE: 12,
      excludeST: true,
      excludeDelisted: true
    }
  },
  {
    id: 'growth_dividend',
    name: '高成长红利兼备',
    badge: '净利增速≥8%',
    description: '股息率≥3% · 净利增速≥8% · ROE≥12%',
    iconName: 'BarChart3',
    criteria: {
      minDividendYield: 3.0,
      maxPE: 20,
      minROE: 12,
      minNetProfitGrowth: 8,
      excludeST: true,
      excludeDelisted: true
    }
  }
];

const QUICK_COMBOS = [
  { name: '低估稳健', yieldVal: 4.0, peVal: 15.0, desc: '股息≥4%, PE≤15' },
  { name: '高息防守', yieldVal: 5.0, peVal: 12.0, desc: '股息≥5%, PE≤12' },
  { name: '极致红利', yieldVal: 6.0, peVal: 10.0, desc: '股息≥6%, PE≤10' },
  { name: '宽幅成长', yieldVal: 3.0, peVal: 22.0, desc: '股息≥3%, PE≤22' }
];

export const StrategyPresets: React.FC<StrategyPresetsProps> = ({
  currentCriteria,
  onApplyPreset,
  onReset,
  matchedCount
}) => {
  // Local state for custom PE and Dividend Yield inputs
  const [customYield, setCustomYield] = useState<number>(currentCriteria.minDividendYield ?? 3.0);
  const [customPE, setCustomPE] = useState<number>(currentCriteria.maxPE ?? 20);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [justApplied, setJustApplied] = useState<boolean>(false);

  // Sync inputs when external criteria changes (e.g. from preset click or reset)
  useEffect(() => {
    setCustomYield(currentCriteria.minDividendYield ?? 3.0);
    setCustomPE(currentCriteria.maxPE ?? 20);
  }, [currentCriteria.minDividendYield, currentCriteria.maxPE]);

  // Check if current inputs match the currently applied criteria
  const isApplied = 
    Math.abs(customYield - (currentCriteria.minDividendYield ?? 0)) < 0.001 &&
    Math.abs(customPE - (currentCriteria.maxPE ?? 0)) < 0.001;

  const handleApplyFilter = () => {
    const validYield = Math.max(0, Math.min(30, Number(customYield) || 0));
    const validPE = Math.max(1, Math.min(200, Number(customPE) || 20));
    
    setCustomYield(validYield);
    setCustomPE(validPE);

    onApplyPreset({
      minDividendYield: validYield,
      maxPE: validPE
    });

    setJustApplied(true);
    setTimeout(() => {
      setJustApplied(false);
    }, 1800);
  };

  const adjustYield = (delta: number) => {
    setCustomYield(prev => {
      const next = Math.max(0, Math.min(30, Number((prev + delta).toFixed(1))));
      return next;
    });
  };

  const adjustPE = (delta: number) => {
    setCustomPE(prev => {
      const next = Math.max(1, Math.min(200, Number((prev + delta).toFixed(1))));
      return next;
    });
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-4 shadow-sm backdrop-blur-md transition-all">
      {/* Top Presets Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mr-1 shrink-0">
          <Compass className="w-4 h-4 text-rose-400" />
          快捷策略预设:
        </span>

        {/* Built-in Strategy Presets */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {PRESETS.map((preset) => {
            const isSelected =
              currentCriteria.minDividendYield === preset.criteria.minDividendYield &&
              currentCriteria.maxPE === preset.criteria.maxPE &&
              (preset.criteria.minDividendYears === undefined || currentCriteria.minDividendYears === preset.criteria.minDividendYears);

            return (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset.criteria)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950/30'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600'
                }`}
                title={preset.description}
              >
                <span>{preset.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                  isSelected ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-700/80 text-slate-400'
                }`}>
                  {preset.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Custom Filter Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border cursor-pointer ${
              isExpanded
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="展开/收起市盈率与股息率自定义筛选器"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>自定指标筛选</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-400 font-mono">
              ≥{currentCriteria.minDividendYield}% · ≤{currentCriteria.maxPE}PE
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Reset to defaults */}
          <button
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 transition flex items-center gap-1 hover:underline cursor-pointer"
            title="恢复系统初始默认筛选条件"
          >
            <RotateCcw className="w-3 h-3" />
            <span>恢复默认</span>
          </button>
        </div>
      </div>

      {/* 热门特色红利赛道快速通道 (水电、电信运营商、大众服饰、纺织服饰、保险等) */}
      <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-800/60 text-xs flex-wrap">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>核心红利赛道一键直达:</span>
        </span>
        {[
          { name: '水电', desc: '长电/华能/川投等大水电金牛', yieldVal: 2.0, peVal: 25 },
          { name: '电信运营商', desc: '移动/电信/联通三大运营商', yieldVal: 3.0, peVal: 20 },
          { name: '大众服饰', desc: '海澜之家/雅戈尔/森马等高派息', yieldVal: 4.0, peVal: 15 },
          { name: '纺织服饰', desc: '富安娜/罗莱等家纺制造高分红', yieldVal: 4.0, peVal: 15 },
          { name: '保险', desc: '中国平安/太保/人保等险资龙头', yieldVal: 2.5, peVal: 15 },
          { name: '煤炭开采', desc: '中国神华/陕煤等高股息龙头', yieldVal: 4.0, peVal: 12 },
          { name: '银行', desc: '国有大行与优质城农商高股息', yieldVal: 4.0, peVal: 10 }
        ].map((sec) => {
          const isSelected = currentCriteria.selectedIndustries.length === 1 && currentCriteria.selectedIndustries[0] === sec.name;
          return (
            <button
              key={sec.name}
              onClick={() => {
                if (isSelected) {
                  onApplyPreset({ selectedIndustries: [] });
                } else {
                  onApplyPreset({ 
                    selectedIndustries: [sec.name],
                    minDividendYield: sec.yieldVal,
                    maxPE: sec.peVal
                  });
                }
              }}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 border cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm font-semibold'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/60 hover:border-slate-600'
              }`}
              title={`${sec.name}: ${sec.desc}`}
            >
              <span>{sec.name}</span>
              {isSelected && <span className="text-[10px] text-emerald-400">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Custom PE & Dividend Yield Requirements Filtering Panel */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/50">
          <div className="flex flex-wrap items-center gap-3 xl:gap-4">
            {/* Title / Badge */}
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>指标要求设定:</span>
            </div>

            {/* Field 1: 股息率要求 */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-inner">
              <div className="flex items-center gap-1 text-rose-400 font-medium">
                <Percent className="w-3.5 h-3.5" />
                <span>股息率要求</span>
              </div>
              <span className="text-slate-400 font-bold">≥</span>
              
              {/* Stepper Down */}
              <button
                type="button"
                onClick={() => adjustYield(-0.5)}
                className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="减小 0.5%"
              >
                <Minus className="w-3 h-3" />
              </button>

              {/* Number Input */}
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  value={customYield}
                  onChange={(e) => setCustomYield(parseFloat(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyFilter();
                  }}
                  className="w-14 bg-slate-950 text-rose-300 font-semibold font-mono text-center text-xs rounded border border-rose-500/30 focus:border-rose-400 focus:outline-none py-0.5 px-1"
                  placeholder="3.0"
                />
                <span className="text-slate-400 ml-1 font-medium">%</span>
              </div>

              {/* Stepper Up */}
              <button
                type="button"
                onClick={() => adjustYield(0.5)}
                className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="增加 0.5%"
              >
                <Plus className="w-3 h-3" />
              </button>

              {/* Quick tags for yield */}
              <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-800">
                {[3.0, 4.0, 5.0, 6.0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCustomYield(val)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                      Math.abs(customYield - val) < 0.05
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* Field 2: 市盈率 PE 要求 */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-inner">
              <div className="flex items-center gap-1 text-sky-400 font-medium">
                <Gauge className="w-3.5 h-3.5" />
                <span>市盈率要求</span>
              </div>
              <span className="text-slate-400 font-bold">≤</span>

              {/* Stepper Down */}
              <button
                type="button"
                onClick={() => adjustPE(-1)}
                className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="减小 1 倍"
              >
                <Minus className="w-3 h-3" />
              </button>

              {/* Number Input */}
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="200"
                  value={customPE}
                  onChange={(e) => setCustomPE(parseFloat(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyFilter();
                  }}
                  className="w-14 bg-slate-950 text-sky-300 font-semibold font-mono text-center text-xs rounded border border-sky-500/30 focus:border-sky-400 focus:outline-none py-0.5 px-1"
                  placeholder="20"
                />
                <span className="text-slate-400 ml-1 font-medium">倍</span>
              </div>

              {/* Stepper Up */}
              <button
                type="button"
                onClick={() => adjustPE(1)}
                className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="增加 1 倍"
              >
                <Plus className="w-3 h-3" />
              </button>

              {/* Quick tags for PE */}
              <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-800">
                {[10, 15, 20, 25].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCustomPE(val)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                      Math.abs(customPE - val) < 0.05
                        ? 'bg-sky-500/30 text-sky-300 border border-sky-500/50'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    ≤{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Combo Shortcuts */}
            <div className="hidden xl:flex items-center gap-1 text-[11px]">
              <span className="text-slate-400 text-[10px]">快捷组合:</span>
              {QUICK_COMBOS.map((combo) => (
                <button
                  key={combo.name}
                  type="button"
                  onClick={() => {
                    setCustomYield(combo.yieldVal);
                    setCustomPE(combo.peVal);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
                  title={combo.desc}
                >
                  {combo.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Area: Filter Button & Status Feedback */}
          <div className="flex items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/50">
            {/* Status indicator */}
            <div className="text-[11px] flex items-center gap-1.5 mr-1 font-mono">
              {isApplied ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <Check className="w-3 h-3 text-emerald-400" />
                  当前筛选已生效
                  {matchedCount !== undefined && ` (${matchedCount}只)`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  参数已修改，请点击筛选
                </span>
              )}
            </div>

            {/* Main Action Button: 点击筛选 */}
            <button
              type="button"
              onClick={handleApplyFilter}
              className={`px-4 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                justApplied
                  ? 'bg-emerald-500 text-white shadow-emerald-900/50 ring-2 ring-emerald-400/50'
                  : !isApplied
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-rose-950/50 ring-1 ring-rose-400/50'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
              }`}
            >
              {justApplied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>已完成筛选!</span>
                </>
              ) : (
                <>
                  <Filter className="w-3.5 h-3.5" />
                  <span>点击筛选</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
