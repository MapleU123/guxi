import React from 'react';
import whiteThreeSoldiersImg from '../assets/images/kline_white_soldiers_1787370191402.jpg';
import whiteGoldTrendImg from '../assets/images/kline_white_trend_1787370206165.jpg';
import whiteIso3dImg from '../assets/images/kline_white_iso3d_1787370223580.jpg';
import threeSoldiersImg from '../assets/images/kline_three_red_soldiers_1787369799068.jpg';
import goldTrendKlineImg from '../assets/images/kline_gold_trend_1787369813990.jpg';
import iso3dKlineImg from '../assets/images/kline_isometric_3d_1787369825191.jpg';
import minimalFintechImg from '../assets/images/kline_minimal_fintech_1787369837673.jpg';
import finGoldImg from '../assets/images/fin_gold_logo_1787369381609.jpg';
import { Sparkles, Check } from 'lucide-react';

export type AvatarStyle = 
  | 'whiteThreeSoldiers'
  | 'whiteGoldTrend'
  | 'whiteIso3d'
  | 'threeSoldiers' 
  | 'goldTrendKline' 
  | 'iso3dKline' 
  | 'minimalFintech' 
  | 'goldBull' 
  | 'redClassic';

export interface AvatarOption {
  id: AvatarStyle;
  name: string;
  desc: string;
  tag: string;
  isWhiteBg?: boolean;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'whiteThreeSoldiers',
    name: '纯白底 · 红三兵看涨',
    desc: '纯白极简底色，三根鲜明朱红实体K线连续拾级而上，顶级金融矢量质感',
    tag: '纯白底色 · 强烈推荐',
    isWhiteBg: true
  },
  {
    id: 'whiteGoldTrend',
    name: '纯白底 · 黄金趋势K线',
    desc: '纯白背景，金色量化穿线穿引三根红三兵看涨阳线，点缀微金币星光',
    tag: '纯白底色 · 量化趋势',
    isWhiteBg: true
  },
  {
    id: 'whiteIso3d',
    name: '纯白底 · 3D红宝石K线',
    desc: '纯白底座，3D立体红宝石K线阶梯拾级而上，顶峰悬浮复利金币',
    tag: '纯白底色 · 3D立体',
    isWhiteBg: true
  },
  {
    id: 'threeSoldiers',
    name: '黑金暗色 · 红三兵形态',
    desc: '黑曜石暗色底座，三根朱红实体K线金色微芒轮廓，寓意红利主升浪',
    tag: '暗色经典'
  },
  {
    id: 'goldTrendKline',
    name: '黑金暗色 · 黄金趋势K线',
    desc: '暗色微光背景，金色彩虹均线向上贯穿三根红三兵阳线',
    tag: '暗色量化'
  },
  {
    id: 'iso3dKline',
    name: '暗色微晶 · 3D水晶K线',
    desc: '深邃暗夜，立体切割红宝石K线阶梯拾级而上',
    tag: '暗色奢华'
  },
  {
    id: 'minimalFintech',
    name: '极简科技K线 (向量矩阵)',
    desc: '几何坐标网格、渐变赤红K线与金星汇聚，现代华尔街机构风',
    tag: '华尔街风'
  },
  {
    id: 'goldBull',
    name: '金牛红利 (量化金融)',
    desc: '黑曜石底座 · 几何金牛 · 走势K线与股息钻冠',
    tag: '机构投行'
  },
  {
    id: 'redClassic',
    name: '经典「红」字',
    desc: '纯白底色衬托 · 金橙至玫瑰红渐变「红」字印章',
    tag: '白底纯粹',
    isWhiteBg: true
  }
];

interface AvatarSelectorProps {
  currentStyle: AvatarStyle;
  onChangeStyle: (style: AvatarStyle) => void;
}

export const AvatarSelectorModal: React.FC<AvatarSelectorProps & { isOpen: boolean; onClose: () => void }> = ({
  currentStyle,
  onChangeStyle,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">选择专属K线 / 股票形态品牌头像（纯白底/暗色）</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-400">
          为您专门定制了<strong className="text-amber-400">「纯白背景色」</strong>与<strong className="text-rose-400">「红三兵看涨K线」</strong>系列金融头像，点击即可实时切换并同步至导航栏与导出图：
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AVATAR_OPTIONS.map((opt) => {
            const isSelected = currentStyle === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onChangeStyle(opt.id);
                  onClose();
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition relative group ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/40'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {/* Avatar Preview: 采用纯白底容器 bg-white 渲染，让白底头像与深色头像均清晰脱颖 */}
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-md flex items-center justify-center bg-white p-0.5">
                  {opt.id === 'whiteThreeSoldiers' && (
                    <img src={whiteThreeSoldiersImg} alt={opt.name} className="w-full h-full object-cover rounded-lg" />
                  )}
                  {opt.id === 'whiteGoldTrend' && (
                    <img src={whiteGoldTrendImg} alt={opt.name} className="w-full h-full object-cover rounded-lg" />
                  )}
                  {opt.id === 'whiteIso3d' && (
                    <img src={whiteIso3dImg} alt={opt.name} className="w-full h-full object-cover rounded-lg" />
                  )}
                  {opt.id === 'threeSoldiers' && (
                    <img src={threeSoldiersImg} alt={opt.name} className="w-full h-full object-cover rounded-lg" />
                  )}
                  {opt.id === 'goldTrendKline' && (
                    <img src={goldTrendKlineImg} alt={opt.name} className="w-full h-full object-cover rounded-lg" />
                  )}
                  {opt.id === 'iso3dKline' && (
                    <img src={iso3dKlineImg} alt={opt.name} className="w-full h-full object-cover rounded-lg" />
                  )}
                  {opt.id === 'minimalFintech' && (
                    <img src={minimalFintechImg} alt={opt.name} className="w-full h-full object-cover rounded-lg" />
                  )}
                  {opt.id === 'goldBull' && (
                    <img src={finGoldImg} alt={opt.name} className="w-full h-full object-cover rounded-lg" />
                  )}
                  {opt.id === 'redClassic' && (
                    <div className="w-full h-full bg-white flex items-center justify-center rounded-lg border border-rose-100">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
                        红
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-amber-300' : 'text-slate-100'}`}>
                      {opt.name}
                    </span>
                  </div>
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap border ${
                    opt.isWhiteBg 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {opt.tag}
                  </span>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug">
                    {opt.desc}
                  </p>
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
          >
            完成并应用
          </button>
        </div>
      </div>
    </div>
  );
};
