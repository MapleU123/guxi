import React from 'react';
import { Sparkles, Shield, Flame, Gem, Compass, BarChart3 } from 'lucide-react';
import { FilterCriteria, StrategyPreset } from '../types';

interface StrategyPresetsProps {
  currentCriteria: FilterCriteria;
  onApplyPreset: (criteria: Partial<FilterCriteria>) => void;
  onReset: () => void;
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

export const StrategyPresets: React.FC<StrategyPresetsProps> = ({
  currentCriteria,
  onApplyPreset,
  onReset
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
        <Compass className="w-3.5 h-3.5 text-rose-400" />
        快捷策略预设:
      </span>
      {PRESETS.map((preset) => {
        const isSelected =
          currentCriteria.minDividendYield === preset.criteria.minDividendYield &&
          currentCriteria.maxPE === preset.criteria.maxPE &&
          (preset.criteria.minDividendYears === undefined || currentCriteria.minDividendYears === preset.criteria.minDividendYears);

        return (
          <button
            key={preset.id}
            onClick={() => onApplyPreset(preset.criteria)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
              isSelected
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
            title={preset.description}
          >
            <span>{preset.name}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
              isSelected ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-700/80 text-slate-400'
            }`}>
              {preset.badge}
            </span>
          </button>
        );
      })}

      <button
        onClick={onReset}
        className="ml-auto text-xs text-slate-400 hover:text-slate-200 px-2 py-1 transition underline underline-offset-2"
      >
        恢复默认筛选条件
      </button>
    </div>
  );
};
