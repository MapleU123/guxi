import React, { useState } from 'react';
import { 
  X, Award, Percent, DollarSign, Calendar, TrendingUp, ShieldCheck, 
  Calculator, Landmark, ChevronRight, BarChart2, PieChart, Sparkles
} from 'lucide-react';
import { Stock } from '../types';

interface StockDetailModalProps {
  stock: Stock | null;
  onClose: () => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, onClose }) => {
  if (!stock) return null;

  const [investmentAmount, setInvestmentAmount] = useState<number>(100000); // 默认投资10万元
  const [holdingYears, setHoldingYears] = useState<number>(5); // 模拟持有年数

  // 计算投资回报
  const shares = Math.floor(investmentAmount / stock.price);
  const actualInvestment = shares * stock.price;
  const annualDividendGross = shares * stock.ttmDividendPerShare;
  const annualDividendTaxFree = annualDividendGross; // 个人持股满1年免征红利税
  const monthlyCashflow = annualDividendGross / 12;

  // 股息再投资 (DRIP) 简易复利测算 (假设股息率恒定)
  const yieldRate = stock.ttmDividendYield / 100;
  const compoundFutureValue = actualInvestment * Math.pow(1 + yieldRate, holdingYears);
  const totalDividendsEarned = compoundFutureValue - actualInvestment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              {stock.name.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-100">{stock.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {stock.code}.{stock.market}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {stock.industry}
                </span>
                {stock.isAristocrat && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    连续{stock.dividendYears}年分红贵族
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                行情更新时间: {stock.updateTime} · 交易状态: 实时联动
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-200">
          
          {/* Key Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 text-[11px] mb-1">最新现价</div>
              <div className="text-base font-bold text-slate-100 font-mono">¥{stock.price.toFixed(2)}</div>
              <div className={`text-[11px] font-mono mt-0.5 ${stock.changePercent >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-rose-500/30">
              <div className="text-rose-300 text-[11px] mb-1 font-semibold flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" />
                滚动股息率(TTM)
              </div>
              <div className="text-base font-bold text-rose-400 font-mono">{stock.ttmDividendYield.toFixed(2)}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                近12月: ¥{stock.ttmDividendPerShare.toFixed(3)}/股
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 text-[11px] mb-1">静态股息率</div>
              <div className="text-base font-bold text-slate-200 font-mono">{stock.staticDividendYield.toFixed(2)}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                上年: ¥{stock.lastYearDividendPerShare.toFixed(3)}/股
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-amber-500/30">
              <div className="text-amber-300 text-[11px] mb-1 font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                龙头综合得分
              </div>
              <div className="text-base font-bold text-amber-400 font-mono">{stock.leaderScore?.toFixed(1)} 分</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                四维归一加权
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 text-[11px] mb-1">市盈率 PE / PB</div>
              <div className="text-sm font-bold text-slate-200 font-mono">
                {stock.pe.toFixed(1)} / {stock.pb.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                市值: {stock.marketCap >= 10000 ? `${(stock.marketCap/10000).toFixed(2)}万亿` : `${stock.marketCap.toFixed(1)}亿`}
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="text-slate-400 text-[11px] mb-1">ROE & 股利支付率</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">
                {stock.roe.toFixed(1)}% / {stock.payoutRatio.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {stock.dividendCycle}
              </div>
            </div>

          </div>

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
                  <span className="font-mono font-bold text-slate-100">{stock.normMarketCap} 分</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-indigo-500" style={{ width: `${stock.normMarketCap ?? 0}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400">当前市值: {stock.marketCap.toFixed(1)} 亿元</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-emerald-500/30">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-emerald-300 font-semibold">ROE 权重 (25%)</span>
                  <span className="font-mono font-bold text-slate-100">{stock.normROE} 分</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-emerald-500" style={{ width: `${stock.normROE ?? 0}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400">当前ROE: {stock.roe.toFixed(1)}%</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-cyan-500/30">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-cyan-300 font-semibold">营收增速 (15%)</span>
                  <span className="font-mono font-bold text-slate-100">{stock.normRevGrowth} 分</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-cyan-500" style={{ width: `${stock.normRevGrowth ?? 0}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400">营收增速: {stock.revGrowth.toFixed(1)}%</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-rose-500/30">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-rose-300 font-semibold">净利增速 (20%)</span>
                  <span className="font-mono font-bold text-slate-100">{stock.normNetProfitGrowth} 分</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-rose-500" style={{ width: `${stock.normNetProfitGrowth ?? 0}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400">净利增速: {stock.netProfitGrowth.toFixed(1)}%</span>
              </div>

            </div>
          </div>

          {/* Interactive Dividend Return Simulator */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 border border-rose-500/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-rose-400" />
                红利现金流投资回报测算器
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
          {stock.history && stock.history.length > 0 && (
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
                    {stock.history.map((h) => (
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
                {stock.description}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-rose-500/20">
              <h4 className="text-xs font-bold text-rose-300 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                高分红护城河与股东回报规划
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {stock.dividendAdvantage}
              </p>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            标的代码: <span className="font-mono text-slate-200">{stock.code}</span>
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
