import React from 'react';
import { RefreshCw, Download, TrendingUp, Clock, ShieldCheck, Zap, HelpCircle, Bell, AlertTriangle, Activity, Image as ImageIcon, Sparkles, Plus, Target, PieChart } from 'lucide-react';
import { Stock, FilterCriteria } from '../types';
import { exportToExcel } from '../utils/exportExcel';
import { getTradingStatus } from '../utils/realtimeQuoteService';
import { AvatarStyle } from './AvatarSelectorModal';
import whiteThreeSoldiersImg from '../assets/images/kline_white_soldiers_1787370191402.jpg';
import whiteGoldTrendImg from '../assets/images/kline_white_trend_1787370206165.jpg';
import whiteIso3dImg from '../assets/images/kline_white_iso3d_1787370223580.jpg';
import threeSoldiersImg from '../assets/images/kline_three_red_soldiers_1787369799068.jpg';
import goldTrendKlineImg from '../assets/images/kline_gold_trend_1787369813990.jpg';
import iso3dKlineImg from '../assets/images/kline_isometric_3d_1787369825191.jpg';
import minimalFintechImg from '../assets/images/kline_minimal_fintech_1787369837673.jpg';
import finBullImg from '../assets/images/fin_gold_logo_1787369381609.jpg';

interface HeaderProps {
  lastUpdated: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  autoRefreshInterval: number; // in seconds, 0 = off
  setAutoRefreshInterval: (seconds: number) => void;
  filteredStocks: Stock[];
  criteria: FilterCriteria;
  onOpenExplainer: () => void;
  alertsCount: number;
  onOpenAlerts: () => void;
  onTriggerShock: () => void;
  onOpenExportImage: () => void;
  avatarStyle: AvatarStyle;
  onOpenAvatarSelector: () => void;
  onOpenImportModal: () => void;
  onOpenMarketUniverse?: () => void;
  customStocksCount?: number;
  onOpenTargetWatchlist?: () => void;
  targetWatchlistCount?: number;
  targetReachedCount?: number;
  onOpenPortfolioDrawer?: () => void;
  portfolioCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  isRefreshing,
  onRefresh,
  autoRefreshInterval,
  setAutoRefreshInterval,
  filteredStocks,
  criteria,
  onOpenExplainer,
  alertsCount,
  onOpenAlerts,
  onTriggerShock,
  onOpenExportImage,
  avatarStyle,
  onOpenAvatarSelector,
  onOpenImportModal,
  onOpenMarketUniverse,
  customStocksCount = 0,
  onOpenTargetWatchlist,
  targetWatchlistCount = 0,
  targetReachedCount = 0,
  onOpenPortfolioDrawer,
  portfolioCount = 0
}) => {
  const tradingInfo = getTradingStatus();

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          
          {/* Logo & Main Title */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onOpenAvatarSelector}
              className="relative group transition transform hover:scale-105 active:scale-95 text-left"
              title="点击切换金融专属品牌头像风格（纯白底红三兵看涨、黄金趋势K线、3D水晶、量化金牛等）"
            >
              {/* 头像外框与背景色：设置纯白背景 bg-white，精致优雅 */}
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-slate-200 ring-2 ring-amber-400/40 bg-white p-0.5 flex items-center justify-center">
                {avatarStyle === 'whiteThreeSoldiers' && (
                  <img src={whiteThreeSoldiersImg} alt="纯白底红三兵" className="w-full h-full object-cover rounded-lg" />
                )}
                {avatarStyle === 'whiteGoldTrend' && (
                  <img src={whiteGoldTrendImg} alt="纯白底黄金趋势" className="w-full h-full object-cover rounded-lg" />
                )}
                {avatarStyle === 'whiteIso3d' && (
                  <img src={whiteIso3dImg} alt="纯白底3D红宝石" className="w-full h-full object-cover rounded-lg" />
                )}
                {avatarStyle === 'threeSoldiers' && (
                  <img src={threeSoldiersImg} alt="红三兵形态" className="w-full h-full object-cover rounded-lg" />
                )}
                {avatarStyle === 'goldTrendKline' && (
                  <img src={goldTrendKlineImg} alt="黄金趋势K线" className="w-full h-full object-cover rounded-lg" />
                )}
                {avatarStyle === 'iso3dKline' && (
                  <img src={iso3dKlineImg} alt="3D水晶K线" className="w-full h-full object-cover rounded-lg" />
                )}
                {avatarStyle === 'minimalFintech' && (
                  <img src={minimalFintechImg} alt="极简科技K线" className="w-full h-full object-cover rounded-lg" />
                )}
                {avatarStyle === 'goldBull' && (
                  <img src={finBullImg} alt="金牛红利" className="w-full h-full object-cover rounded-lg" />
                )}
                {avatarStyle === 'redClassic' && (
                  <div className="w-full h-full bg-white flex items-center justify-center rounded-lg border border-rose-100">
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                      红
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-800 border border-amber-500/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm text-amber-400">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  A股高股息股票筛选器
                  <span className="hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    实盘级加权引擎
                  </span>
                  {onOpenMarketUniverse && (
                    <button
                      onClick={onOpenMarketUniverse}
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition"
                      title="查看大A全市场 5,652 支股票板块分布与分红金字塔"
                    >
                      <span>5652支全景</span>
                    </button>
                  )}
                </h1>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${tradingInfo.badgeClass}`}>
                  {tradingInfo.label}
                </span>
                <span className="text-[11px] text-slate-400">
                  行情时间: <span className="font-mono text-slate-200 font-semibold">{lastUpdated}</span>
                </span>
                <span className="text-slate-600">|</span>
                <button 
                  onClick={onOpenExplainer}
                  className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5 text-xs transition underline underline-offset-2"
                >
                  <HelpCircle className="w-3 h-3" />
                  算法说明
                </button>
              </div>
            </div>
          </div>

          {/* Market Status & Realtime Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Anomaly Alerts Monitor Bell Button */}
            <button
              onClick={onOpenAlerts}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition active:scale-95 ${
                alertsCount > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="查看盘中股息率波动±10%异动监控记录"
            >
              <Bell className={`w-3.5 h-3.5 ${alertsCount > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
              <span>异动监控</span>
              {alertsCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold animate-pulse">
                  {alertsCount}
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              )}
            </button>

            {/* Quick Shock Simulation Button */}
            <button
              onClick={onTriggerShock}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/30 transition active:scale-95"
              title="模拟盘中剧烈大波动（使股息率发生±10%异动跳变）并弹出悬浮预警气泡"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">模拟±10%异动</span>
            </button>

            {/* Auto-Refresh Select */}
            <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700/80 p-0.5 text-xs">
              <span className="text-slate-400 px-2 flex items-center gap-1 text-[11px]">
                <Activity className="w-3 h-3 text-emerald-400" />
                自动:
              </span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-slate-900 text-slate-200 rounded px-2 py-1 text-xs border border-slate-700 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value={0}>手动</option>
                <option value={5}>5秒</option>
                <option value={10}>10秒</option>
                <option value={30}>30秒</option>
                <option value={60}>60秒</option>
              </select>
            </div>

            {/* Manual Refresh Live Quotes Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition active:scale-95 ${
                isRefreshing ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              title="连接交易所实盘接口获取当天真实股价与滚动指标"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? '同步实盘中...' : '同步今日真实行情'}</span>
            </button>

            {/* 理想股息率备选股票池 Button */}
            {onOpenTargetWatchlist && (
              <button
                onClick={onOpenTargetWatchlist}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/30 transition active:scale-95 group"
                title="打开理想股息率备选股票池（根据理想股息率实时计算目标价位与需跌空间）"
              >
                <Target className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition duration-300" />
                <span>备选股票池</span>
                {targetReachedCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-mono text-[10px] font-bold animate-pulse" title={`${targetReachedCount} 只标的已进入目标买入价`}>
                    {targetReachedCount}已达标
                  </span>
                ) : targetWatchlistCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 font-mono text-[10px] font-bold border border-amber-400/40">
                    {targetWatchlistCount}
                  </span>
                ) : null}
              </button>
            )}

            {/* 组合模拟测算 (右侧栏) Button */}
            {onOpenPortfolioDrawer && (
              <button
                onClick={onOpenPortfolioDrawer}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-600/20 to-amber-600/20 hover:from-rose-600/30 hover:to-amber-600/30 text-rose-300 border border-rose-500/40 shadow-sm transition active:scale-95 group"
                title="打开右侧栏：高股息组合现金流与配置模拟器"
              >
                <PieChart className="w-3.5 h-3.5 text-rose-400 group-hover:rotate-45 transition duration-300" />
                <span>组合模拟器</span>
                {portfolioCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                    {portfolioCount}
                  </span>
                )}
              </button>
            )}

            {/* Custom Import Stocks Button */}
            <button
              onClick={onOpenImportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950/40 border border-indigo-500/40 transition active:scale-95"
              title="自定义导入或添加股票（支持批量粘贴代码列表或手动单只录入）"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>导入股票</span>
              {customStocksCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-900 text-indigo-200 text-[10px] font-bold border border-indigo-400/40">
                  {customStocksCount}
                </span>
              )}
            </button>

            {/* Excel Export Button */}
            <button
              onClick={() => exportToExcel(filteredStocks, criteria)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95"
              title="导出当前筛选结果为 Excel (.xlsx) 表格"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">导出</span>
              <span>Excel</span>
            </button>

            {/* Image Export Button */}
            <button
              onClick={onOpenExportImage}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-sm shadow-rose-950/40 border border-rose-500/30 transition active:scale-95"
              title="导出当前筛选结果为高保真图片（包含序号、名称、行业、股价、PE、PB、股息率、分红年限、评分）"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>导出图片</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};

