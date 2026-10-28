import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Percent, 
  Award, 
  Landmark, 
  PieChart, 
  Database, 
  ArrowRight,
  Activity,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { Stock } from '../types';

interface MarketOverviewBarProps {
  filteredStocks: Stock[];
  totalStockCount: number;
  onSelectStock: (stock: Stock) => void;
  onOpenMarketUniverse?: () => void;
  onFilterIndustry?: (industry: string) => void;
  selectedIndustries?: string[];
}

interface IndustryBubbleData {
  industry: string;
  count: number;
  avgYield: number;
  avgVolatility: number;
  avgPE: number;
  totalMarketCap: number;
  topStock: Stock;
}

export const MarketOverviewBar: React.FC<MarketOverviewBarProps> = ({
  filteredStocks,
  totalStockCount,
  onSelectStock,
  onOpenMarketUniverse,
  onFilterIndustry,
  selectedIndustries = []
}) => {
  const [isBubbleChartOpen, setIsBubbleChartOpen] = useState(true);
  const [hoveredIndustry, setHoveredIndustry] = useState<IndustryBubbleData | null>(null);

  // 聚合各行业活跃度与平均股息率数据 (始终在组件顶层调用 Hook)
  const industryStats: IndustryBubbleData[] = useMemo(() => {
    if (!filteredStocks || filteredStocks.length === 0) return [];
    const map = new Map<string, Stock[]>();
    filteredStocks.forEach((s) => {
      let ind = s.industry || '其他';
      if (ind === '煤炭') ind = '煤炭开采';
      if (ind === '公共事业') ind = '公用事业';
      const list = map.get(ind) || [];
      list.push(s);
      map.set(ind, list);
    });

    const result: IndustryBubbleData[] = [];
    map.forEach((stocks, ind) => {
      const count = stocks.length;
      const sumYield = stocks.reduce((acc, s) => acc + s.ttmDividendYield, 0);
      const avgY = sumYield / count;

      const sumAbsChange = stocks.reduce((acc, s) => acc + Math.abs(s.changePercent), 0);
      const avgVol = Math.max(0.6, Number(((sumAbsChange / count) * 0.95 + 0.35).toFixed(2)));

      const sumPE = stocks.reduce((acc, s) => acc + (s.pe > 0 ? s.pe : 15), 0);
      const avgP = Number((sumPE / count).toFixed(1));

      const totalCap = Number(stocks.reduce((acc, s) => acc + s.marketCap, 0).toFixed(1));
      const top = [...stocks].sort((a, b) => b.ttmDividendYield - a.ttmDividendYield)[0];

      result.push({
        industry: ind,
        count,
        avgYield: Number(avgY.toFixed(2)),
        avgVolatility: avgVol,
        avgPE: avgP,
        totalMarketCap: totalCap,
        topStock: top
      });
    });

    return result.sort((a, b) => b.count - a.count);
  }, [filteredStocks]);

  if (!filteredStocks || filteredStocks.length === 0) return null;

  // 计算整体平均指标
  const avgYield = (
    filteredStocks.reduce((acc, s) => acc + s.ttmDividendYield, 0) / filteredStocks.length
  ).toFixed(2);

  const avgStaticYield = (
    filteredStocks.reduce((acc, s) => acc + s.staticDividendYield, 0) / filteredStocks.length
  ).toFixed(2);

  const avgPE = (
    filteredStocks.reduce((acc, s) => acc + s.pe, 0) / filteredStocks.length
  ).toFixed(2);

  const avgROE = (
    filteredStocks.reduce((acc, s) => acc + s.roe, 0) / filteredStocks.length
  ).toFixed(2);

  // 股息率冠军
  const topYieldStock = [...filteredStocks].sort((a, b) => b.ttmDividendYield - a.ttmDividendYield)[0];

  // 龙头分冠军
  const topLeaderStock = [...filteredStocks].sort((a, b) => (b.leaderScore ?? 0) - (a.leaderScore ?? 0))[0];

  // 计算占 5652 支股票的比例
  const universeRatio = ((filteredStocks.length / 5652) * 100).toFixed(1);



  // 计算气泡图的坐标极值用于相对定位
  const minYield = Math.min(...industryStats.map((d) => d.avgYield), 2.0);
  const maxYield = Math.max(...industryStats.map((d) => d.avgYield), 6.5);
  const minVol = Math.min(...industryStats.map((d) => d.avgVolatility), 0.5);
  const maxVol = Math.max(...industryStats.map((d) => d.avgVolatility), 2.5);
  const maxCount = Math.max(...industryStats.map((d) => d.count), 1);

  return (
    <div className="space-y-2.5 mb-5">
      {/* 5652 支大A宏观全景通栏 */}
      {onOpenMarketUniverse && (
        <div 
          onClick={onOpenMarketUniverse}
          className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 border border-rose-500/30 hover:border-rose-500/60 rounded-xl px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition group shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-rose-600/80 flex items-center justify-center text-white shrink-0">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-200 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span><strong>大A全市场共 5,652 支股票</strong></span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-slate-400">
                当前筛选选出 <strong className="text-rose-400 font-mono">{filteredStocks.length}</strong> 支核心资产 (占全市场约 {universeRatio}%)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                沙里淘金90%+
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold group-hover:text-rose-200 transition shrink-0 self-end sm:self-auto">
            <span>查看 5,652 支宏观分布与分红金字塔</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition transform" />
          </div>
        </div>
      )}

      {/* 6 指标卡片网格 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          
          {/* 1. 筛选样本量 */}
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <PieChart className="w-3.5 h-3.5 text-rose-400" />
              <span>选出标的数</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-100">{filteredStocks.length}</span>
              <span className="text-xs text-slate-500">/ 5652全域</span>
            </div>
          </div>

          {/* 2. 平均滚动股息率 (TTM) */}
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <Percent className="w-3.5 h-3.5 text-rose-400" />
              <span>平均股息率(TTM)</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-rose-400">{avgYield}%</span>
              <span className="text-[10px] text-slate-400">静态: {avgStaticYield}%</span>
            </div>
          </div>

          {/* 3. 平均市盈率 PE */}
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <Landmark className="w-3.5 h-3.5 text-indigo-400" />
              <span>平均市盈率(PE)</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-slate-200">{avgPE}</span>
              <span className="text-[10px] text-emerald-400 font-medium">低估值</span>
            </div>
          </div>

          {/* 4. 平均 ROE */}
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>平均 ROE 质量</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-amber-400">{avgROE}%</span>
              <span className="text-[10px] text-slate-400">高盈利</span>
            </div>
          </div>

          {/* 5. 股息率最高 */}
          {topYieldStock && (
            <div 
              onClick={() => onSelectStock(topYieldStock)}
              className="bg-slate-800/60 hover:bg-slate-800 rounded-lg p-2.5 border border-rose-500/20 hover:border-rose-500/50 transition cursor-pointer group"
            >
              <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-rose-400" />
                  最高股息率
                </span>
                <span className="text-[10px] text-rose-400 group-hover:underline">详情</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-100 truncate max-w-[80px]">{topYieldStock.name}</span>
                <span className="text-sm font-bold text-rose-400">{topYieldStock.ttmDividendYield.toFixed(2)}%</span>
              </div>
            </div>
          )}

          {/* 6. 龙头综合分最高 */}
          {topLeaderStock && (
            <div 
              onClick={() => onSelectStock(topLeaderStock)}
              className="bg-slate-800/60 hover:bg-slate-800 rounded-lg p-2.5 border border-amber-500/20 hover:border-amber-500/50 transition cursor-pointer group"
            >
              <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  综合分冠军
                </span>
                <span className="text-[10px] text-amber-400 group-hover:underline">详情</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-100 truncate max-w-[80px]">{topLeaderStock.name}</span>
                <span className="text-sm font-bold text-amber-400">{topLeaderStock.leaderScore?.toFixed(1)}分</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 行业资金活跃度与股息率气泡图 (支持一键过滤) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span>行业资金活跃度与平均股息率全景</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-normal">
                  点击气泡一键过滤行业
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                横轴: 平均股息率(TTM) | 纵轴: 成交波动强度 | 气泡大小: 标的数量
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIndustries.length > 0 && onFilterIndustry && (
              <button
                onClick={() => onFilterIndustry(selectedIndustries[0])}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 transition"
              >
                <span>已过滤: {selectedIndustries.join(', ')}</span>
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setIsBubbleChartOpen(!isBubbleChartOpen)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 transition"
            >
              <span>{isBubbleChartOpen ? '收起气泡图' : '展开气泡图'}</span>
              {isBubbleChartOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isBubbleChartOpen && (
          <div className="space-y-3">
            {/* 气泡散点画布区域 */}
            <div className="relative w-full h-56 sm:h-64 bg-slate-950/70 border border-slate-800/90 rounded-xl overflow-hidden p-4 select-none">
              
              {/* 背景参考网格线与四象限轴 */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="w-full h-1/2 border-b border-dashed border-indigo-400/50"></div>
                <div className="h-full w-1/2 border-r border-dashed border-indigo-400/50 absolute top-0 left-0"></div>
              </div>

              {/* 坐标轴标签 */}
              <div className="absolute top-2 left-3 text-[10px] text-slate-400 flex items-center gap-1">
                <span>↑ 高波动 / 资金活跃</span>
              </div>
              <div className="absolute bottom-1 right-3 text-[10px] text-slate-400 flex items-center gap-1">
                <span>高股息率 →</span>
              </div>
              <div className="absolute bottom-1 left-3 text-[10px] text-slate-400">
                <span>稳健防御区</span>
              </div>
              <div className="absolute top-2 right-3 text-[10px] text-amber-300/80 font-medium">
                ★ 攻守兼备热点区
              </div>

              {/* 气泡列表渲染 */}
              <div className="relative w-full h-full">
                {industryStats.map((item) => {
                  const isSelected = selectedIndustries.includes(item.industry);
                  
                  // 计算气泡相对坐标百分比 (留出两端边距 8% ~ 90%)
                  const yieldRange = Math.max(0.1, maxYield - minYield);
                  const volRange = Math.max(0.1, maxVol - minVol);

                  const leftPct = 8 + ((item.avgYield - minYield) / yieldRange) * 82;
                  // Y轴倒置 (波动越大越靠上)
                  const topPct = 90 - ((item.avgVolatility - minVol) / volRange) * 80;

                  // 气泡大小：根据标的数量计算 28px ~ 58px
                  const bubbleSize = Math.max(30, Math.min(62, 28 + (item.count / maxCount) * 32));

                  // 颜色分配：按股息率梯度
                  let colorClass = 'from-indigo-600/80 to-blue-600/80 border-indigo-400/60 text-white';
                  if (item.avgYield >= 5.5) {
                    colorClass = 'from-rose-600/85 to-red-600/85 border-rose-400 text-white shadow-rose-900/40';
                  } else if (item.avgYield >= 4.5) {
                    colorClass = 'from-amber-600/80 to-orange-600/80 border-amber-400/80 text-white shadow-amber-900/40';
                  } else if (item.avgYield >= 3.5) {
                    colorClass = 'from-emerald-600/80 to-teal-600/80 border-emerald-400/70 text-white shadow-emerald-900/40';
                  }

                  return (
                    <div
                      key={item.industry}
                      onClick={() => onFilterIndustry?.(item.industry)}
                      onMouseEnter={() => setHoveredIndustry(item)}
                      onMouseLeave={() => setHoveredIndustry(null)}
                      style={{
                        left: `${Math.max(5, Math.min(92, leftPct))}%`,
                        top: `${Math.max(8, Math.min(88, topPct))}%`,
                        width: `${bubbleSize}px`,
                        height: `${bubbleSize}px`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      className={`absolute rounded-full cursor-pointer transition-all duration-300 flex flex-col items-center justify-center shadow-lg bg-gradient-to-br border ${colorClass} ${
                        isSelected 
                          ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900 scale-110 z-20 animate-pulse' 
                          : 'hover:scale-115 hover:z-30 hover:shadow-xl'
                      }`}
                    >
                      <span className="text-[10px] font-bold tracking-tight text-center px-1 leading-tight line-clamp-1">
                        {item.industry}
                      </span>
                      <span className="text-[9px] font-mono opacity-90 leading-none">
                        {item.avgYield}%
                      </span>
                      <span className="text-[8px] opacity-75 font-mono">
                        ({item.count}只)
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 悬停详情 Tooltip 卡片 */}
              {hoveredIndustry && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-indigo-500/50 shadow-2xl rounded-xl px-3 py-2 z-40 text-xs backdrop-blur-md flex items-center gap-3 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                  <div className="font-bold text-slate-100 flex items-center gap-1.5 border-r border-slate-700/80 pr-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>{hoveredIndustry.industry}</span>
                    <span className="text-[10px] px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {hoveredIndustry.count}只标的
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px] text-slate-300 font-mono">
                    <div>
                      <span className="text-slate-400">平均股息: </span>
                      <span className="text-rose-400 font-bold">{hoveredIndustry.avgYield}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">平均PE: </span>
                      <span className="text-slate-100">{hoveredIndustry.avgPE}倍</span>
                    </div>
                    <div>
                      <span className="text-slate-400">波动度: </span>
                      <span className="text-amber-400">{hoveredIndustry.avgVolatility}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">最高股息: </span>
                      <span className="text-emerald-300">{hoveredIndustry.topStock.name} ({hoveredIndustry.topStock.ttmDividendYield}%)</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/30 flex items-center gap-0.5">
                    <Filter className="w-3 h-3" />
                    <span>点击即过滤</span>
                  </div>
                </div>
              )}
            </div>

            {/* 快捷行业气泡过滤标签栏 */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 mr-1">
                <Layers className="w-3 h-3 text-slate-500" />
                行业直通:
              </span>
              {industryStats.map((item) => {
                const isSelected = selectedIndustries.includes(item.industry);
                return (
                  <button
                    key={item.industry}
                    onClick={() => onFilterIndustry?.(item.industry)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm font-semibold'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    <span>{item.industry}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-400' : 'text-rose-400/90'}`}>
                      {item.avgYield}%
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      ({item.count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
