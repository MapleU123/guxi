import React from 'react';
import { X, Award, Percent, TrendingUp, DollarSign, Activity, CheckCircle, Calculator } from 'lucide-react';

interface LeaderScoreExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderScoreExplainerModal: React.FC<LeaderScoreExplainerModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">龙头综合分 (Leader Score) 权重计算模型</h3>
              <p className="text-xs text-slate-400">基于结果集内四维归一化的多因子量化评分机制</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Formula Box */}
        <div className="my-5 p-4 rounded-xl bg-slate-950/80 border border-amber-500/40 text-center shadow-inner">
          <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
            <Calculator className="w-4 h-4" />
            综合加权计分公式
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-100 py-1 font-mono">
            综合分 = 市值 × <span className="text-indigo-400">40%</span> + ROE × <span className="text-emerald-400">25%</span> + 营收增速 × <span className="text-cyan-400">15%</span> + 净利增速 × <span className="text-rose-400">20%</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            * 结果集内各维度指标首先进行 Min-Max 极值归一化 (0~100分)，各指标越高得分越高，再按权重线性加总。
          </div>
        </div>

        {/* 4 Factor Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          
          {/* Factor 1 */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-indigo-500/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-indigo-400" />
                ① 总市值 (Market Cap)
              </span>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                权重 40%
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              代表公司规模体量、抗风险能力与行业话语权。市值越大的行业巨头，在红利策略中抵御系统性波动的护城河越深。
            </p>
          </div>

          {/* Factor 2 */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-400" />
                ② 净资产收益率 (ROE)
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                权重 25%
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              反映单位股东权益的盈利产出效率。高ROE是高分红可持续性的基石，避免“分红吃老本”的价值陷阱。
            </p>
          </div>

          {/* Factor 3 */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                ③ 营收同比增速 (Rev Growth)
              </span>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                权重 15%
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              表征主营业务的扩张动力与市场份额趋势，确保公司具备持续产生健康营业收入的动力。
            </p>
          </div>

          {/* Factor 4 */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-rose-500/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-400" />
                ④ 净利润同比增速 (Net Profit)
              </span>
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                权重 20%
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              衡量底层可供分配利润的增长趋势。净利正向增长保障未来每股派息能够稳步提升或维持高位。
            </p>
          </div>

        </div>

        {/* Normalization Details */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            归一化计算细节：
          </div>
          <p className="text-slate-400">
            在当前筛选出来的股票集合中，针对每个指标找出最小值 <code className="text-rose-300">Min</code> 与最大值 <code className="text-emerald-300">Max</code>，单个指标得分公式为：
          </p>
          <div className="bg-slate-900 p-2 rounded text-center font-mono text-amber-300 text-xs">
            Normalized Score = [(Value - Min) / (Max - Min)] × 100
          </div>
          <p className="text-slate-400">
            当用户在表格中按“龙头综合分”降序排序时，即可一眼筛选出兼具“市值体量雄厚 + 盈利能力顶尖 + 业绩成长健康”的优质红利核心资产！
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition"
          >
            我知道了
          </button>
        </div>

      </div>
    </div>
  );
};
