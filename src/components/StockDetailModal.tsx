import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Award, Percent, DollarSign, Calendar, TrendingUp, ShieldCheck, 
  Calculator, Landmark, ChevronRight, BarChart2, PieChart, Sparkles, Activity,
  RefreshCw, Clock, Zap, ArrowUpRight, ArrowDownRight, CheckCircle2
} from 'lucide-react';
import { Stock } from '../types';
import { PEValuationChart } from './PEValuationChart';
import { BuyOpportunityIndicator } from './BuyOpportunityIndicator';
import { IndustryComparisonRadar } from './IndustryComparisonRadar';
import { ValuationCushionBar } from './ValuationCushionBar';
import { fetchRealtimeQuote, applyRealtimeQuoteToStock, getTradingStatus, RealtimeQuote } from '../utils/realtimeQuoteService';

interface StockDetailModalProps {
  stock: Stock | null;
  allStocks?: Stock[];
  onClose: () => void;
  onUpdateStock?: (updated: Stock) => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, allStocks, onClose, onUpdateStock }) => {
  if (!stock) return null;

  const [currentStock, setCurrentStock] = useState<Stock>(stock);
  const [realtimeQuote, setRealtimeQuote] = useState<RealtimeQuote | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);

  const [investmentAmount, setInvestmentAmount] = useState<number>(100000); // 默认投资10万元
  const [holdingYears, setHoldingYears] = useState<number>(5); // 模拟持有年数

  const tradingInfo = getTradingStatus();

  // 刷新查询当天真实股价
  const handleRefreshRealtime = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const quote = await fetchRealtimeQuote(currentStock.code);
      if (quote) {
        setRealtimeQuote(quote);
        const updated = applyRealtimeQuoteToStock(currentStock, quote);
        setCurrentStock(updated);
        setLastRefreshedAt(quote.updateTime || new Date().toLocaleTimeString());
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 2500);
        if (onUpdateStock) {
          onUpdateStock(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch real-time quote for detail modal:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentStock.code, onUpdateStock]);

  // 当 Modal 打开时自动查询当天最新真实股价
  useEffect(() => {
    setCurrentStock(stock);
    handleRefreshRealtime();
  }, [stock.code]);

  // 计算投资回报
  const shares = Math.floor(investmentAmount / (currentStock.price || 1));
  const actualInvestment = shares * currentStock.price;
  const annualDividendGross = shares * currentStock.ttmDividendPerShare;
  const annualDividendTaxFree = annualDividendGross; // 个人持股满1年免征红利税
  const monthlyCashflow = annualDividendGross / 12;

  // 股息再投资 (DRIP) 简易复利测算 (假设股息率恒定)
  const yieldRate = currentStock.ttmDividendYield / 100;
  const compoundFutureValue = actualInvestment * Math.pow(1 + yieldRate, holdingYears);
  const totalDividendsEarned = compoundFutureValue - actualInvestment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              {currentStock.name.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-100">{currentStock.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {currentStock.code}.{currentStock.market}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {currentStock.industry}
                </span>
                {currentStock.isAristocrat && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    连续{currentStock.dividendYears}年分红贵族
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${tradingInfo.badgeClass}`}>
                  {tradingInfo.label}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  行情时间: <span className="font-mono text-slate-300">{currentStock.updateTime || '15:00:00'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshRealtime}
              disabled={isRefreshing}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                refreshSuccess
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border-rose-500/40 hover:text-rose-200'
              }`}
              title="查询并同步当天真实股价"
            >
              {refreshSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>已同步今日实盘</span>
                </>
              ) : (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-400' : 'text-rose-400'}`} />
                  <span>{isRefreshing ? '正在同步行情...' : '刷新今日真实股价'}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-200">

          {/* 当天真实行情高亮信息条 (Real-time Live Quote Banner) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-700/80 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-300">当日真实股价 (实时行情)</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-[10px] text-emerald-400 font-mono">交易所直连</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-extrabold font-mono text-slate-100">
                      ¥{currentStock.price.toFixed(2)}
                    </span>
                    <span className={`text-sm font-mono font-bold flex items-center ${
                      currentStock.changePercent >= 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {currentStock.changePercent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {currentStock.change >= 0 ? '+' : ''}{currentStock.change.toFixed(2)} ({currentStock.changePercent >= 0 ? '+' : ''}{currentStock.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* 盘口细分数据 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] bg-slate-900/80 px-3.5 py-2 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500">今开:</span>
                  <span className="font-mono text-slate-200 ml-1 font-semibold">
                    ¥{realtimeQuote?.open ? realtimeQuote.open.toFixed(2) : (currentStock.prevClose || currentStock.price).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">昨收:</span>
                  <span className="font-mono text-slate-200 ml-1 font-semibold">
                    ¥{(currentStock.prevClose || currentStock.price).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">最高:</span>
                  <span className="font-mono text-rose-400 ml-1 font-semibold">
                    ¥{realtimeQuote?.high ? realtimeQuote.high.toFixed(2) : currentStock.price.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">最低:</span>
                  <span className="font-mono text-emerald-400 ml-1 font-semibold">
                    ¥{realtimeQuote?.low ? realtimeQuote.low.toFixed(2) : currentStock.price.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Key Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 text-[11px] mb-1">最新真实价</div>
              <div className="text-base font-bold text-slate-100 font-mono">¥{currentStock.price.toFixed(2)}</div>
              <div className={`text-[11px] font-mono mt-0.5 ${currentStock.changePercent >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {currentStock.changePercent >= 0 ? '+' : ''}{currentStock.changePercent.toFixed(2)}%
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-rose-500/30">
              <div className="text-rose-300 text-[11px] mb-1 font-semibold flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" />
                滚动股息率(TTM)
              </div>
              <div className="text-base font-bold text-rose-400 font-mono">{currentStock.ttmDividendYield.toFixed(2)}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                近12月: ¥{currentStock.ttmDividendPerShare.toFixed(3)}/股
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 text-[11px] mb-1">静态股息率</div>
              <div className="text-base font-bold text-slate-200 font-mono">{currentStock.staticDividendYield.toFixed(2)}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                上年: ¥{currentStock.lastYearDividendPerShare.toFixed(3)}/股
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-amber-500/30">
              <div className="text-amber-300 text-[11px] mb-1 font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                龙头综合得分
              </div>
              <div className="text-base font-bold text-amber-400 font-mono">{currentStock.leaderScore?.toFixed(1) || '85.0'} 分</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                四维归一加权
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 text-[11px] mb-1">市盈率 PE / PB</div>
              <div className="text-sm font-bold text-slate-200 font-mono">
                {currentStock.pe.toFixed(1)} / {currentStock.pb.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                市值: {currentStock.marketCap >= 10000 ? `${(currentStock.marketCap/10000).toFixed(2)}万亿` : `${currentStock.marketCap.toFixed(1)}亿`}
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 text-[11px] mb-1">ROE & 股利支付率</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">
                {currentStock.roe.toFixed(1)}% / {currentStock.payoutRatio.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {currentStock.dividendCycle}
              </div>
            </div>

          </div>
          
          {/* Buy Opportunity Score & Margin of Safety Indicator */}
          <BuyOpportunityIndicator stock={currentStock} />

          {/* 5-Year PE Valuation Cushion Progress Bar & Quantification */}
          <ValuationCushionBar stock={currentStock} />

          {/* Industry 4-Dimension Relative Advantage Radar (Dividend Yield, PE, ROE, Growth vs Industry Average) */}
          <IndustryComparisonRadar stock={currentStock} allStocks={allStocks} />

          {/* 12-Month PE Rolling Valuation Trend & Valuation Bottom Judgment */}
          <PEValuationChart stock={currentStock} />

          {/* Leader Score Radar & Deconstruction */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              龙头综合分四维归一化得分拆解
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              
              <div className="bg-slate-900 p-3 rounded-lg border border-indigo-500/30">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-indigo-300 font-semibold">总市值权重 (40%)</span>
                  <span className="font-mono font-bold text-slate-100">{currentStock.normMarketCap ?? 80} 分</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-indigo-500" style={{ width: `${currentStock.normMarketCap ?? 80}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400">当前市值: {currentStock.marketCap.toFixed(1)} 亿元</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-emerald-500/30">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-emerald-300 font-semibold">ROE 权重 (25%)</span>
                  <span className="font-mono font-bold text-slate-100">{currentStock.normROE ?? 85} 分</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-emerald-500" style={{ width: `${currentStock.normROE ?? 85}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400">当前ROE: {currentStock.roe.toFixed(1)}%</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-cyan-500/30">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-cyan-300 font-semibold">营收增速 (15%)</span>
                  <span className="font-mono font-bold text-slate-100">{currentStock.normRevGrowth ?? 75} 分</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-cyan-500" style={{ width: `${currentStock.normRevGrowth ?? 75}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400">营收增速: {currentStock.revGrowth.toFixed(1)}%</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-rose-500/30">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-rose-300 font-semibold">净利增速 (20%)</span>
                  <span className="font-mono font-bold text-slate-100">{currentStock.normNetProfitGrowth ?? 78} 分</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-rose-500" style={{ width: `${currentStock.normNetProfitGrowth ?? 78}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400">净利增速: {currentStock.netProfitGrowth.toFixed(1)}%</span>
              </div>

            </div>
          </div>

          {/* Interactive Dividend Return Simulator */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 border border-rose-500/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-rose-400" />
                红利现金流投资回报测算器 (基于当日真实股价)
              </h4>
              <span className="text-[11px] text-slate-400">持股超1年免征个人所得税</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mb-4">
              
              <div className="sm:col-span-6">
                <label className="block text-[11px] text-slate-400 mb-1">拟投资本金 (元)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="10000"
                    min="1000"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(Math.max(100, Number(e.target.value)))}
                    className="w-full bg-slate-800 text-slate-100 font-mono font-bold rounded-lg px-3 py-1.5 text-sm border border-slate-700 focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex gap-1">
                    {[50000, 100000, 300000, 500000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setInvestmentAmount(amt)}
                        className={`px-2 py-1 rounded text-[10px] font-medium border ${
                          investmentAmount === amt
                            ? 'bg-rose-600 text-white border-rose-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {amt / 10000}万
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-[11px] text-slate-400 mb-1">复利持有期限 (年)</label>
                <div className="flex gap-2">
                  {[1, 3, 5, 10].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setHoldingYears(yr)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        holdingYears === yr
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {yr} 年期
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Output Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              
              <div>
                <span className="text-slate-400 text-[11px]">可买入股数</span>
                <div className="font-mono font-bold text-slate-100 text-sm mt-0.5">
                  {shares.toLocaleString()} 股
                </div>
                <span className="text-[10px] text-slate-500">约 {(shares / 100).toFixed(0)} 手</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">预计年现金分红</span>
                <div className="font-mono font-bold text-rose-400 text-sm mt-0.5">
                  ¥{annualDividendGross.toFixed(0)} / 年
                </div>
                <span className="text-[10px] text-emerald-400">月均现金流: ¥{monthlyCashflow.toFixed(0)}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">{holdingYears}年累计分红</span>
                <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">
                  ¥{(annualDividendGross * holdingYears).toFixed(0)}
                </div>
                <span className="text-[10px] text-slate-400">单利累计回报</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">股息复投预期终值</span>
                <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                  ¥{compoundFutureValue.toFixed(0)}
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">
                  净增益: +¥{totalDividendsEarned.toFixed(0)}
                </span>
              </div>

            </div>
          </div>

          {/* Historical Dividends Table */}
          {currentStock.history && currentStock.history.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-100 mb-2.5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-400" />
                近历年分红派息记录
              </h4>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">分红年度</th>
                      <th className="py-2.5 px-3">每股派息(税前)</th>
                      <th className="py-2.5 px-3">派息方案</th>
                      <th className="py-2.5 px-3">当年股息率</th>
                      <th className="py-2.5 px-3">股利支付率</th>
                      <th className="py-2.5 px-3">分红总额</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-300">
                    {currentStock.history.map((h) => (
                      <tr key={h.year} className="hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{h.year}年度</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-400">¥{h.dividendPerShare.toFixed(3)}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{h.scheme}</td>
                        <td className="py-2.5 px-3 font-mono text-amber-400">{h.dividendYield.toFixed(1)}%</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{h.payoutRatio.toFixed(1)}%</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{h.cashTotal} 亿元</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Company Moat & Investment Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <h4 className="text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-indigo-400" />
                主营业务与行业地位
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentStock.description}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-rose-500/20">
              <h4 className="text-xs font-bold text-rose-300 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                高分红护城河与股东回报规划
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentStock.dividendAdvantage}
              </p>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            标的代码: <span className="font-mono text-slate-200">{currentStock.code}</span> · 当前真实价: <span className="font-mono text-rose-400 font-bold">¥{currentStock.price.toFixed(2)}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition"
          >
            关闭详情
          </button>
        </div>

      </div>
    </div>
  );
};
