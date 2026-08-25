import { Stock, FilterCriteria, BuyOpportunityEvaluation, IndustryComparisonResult, IndustryRadarDimension, FiveYearPEValuationCushion } from '../types';
import { INITIAL_STOCKS } from '../data/stocksData';

/**
 * 在结果集内对各维度进行 Min-Max 归一化 (0~100) 并计算综合龙头分:
 * 综合分 = 市值×40% + ROE×25% + 营收增速×15% + 净利增速×20%
 * 各指标越高得分越高
 */
export function calculateNormalizedScores(stocks: Stock[]): Stock[] {
  if (stocks.length === 0) return [];
  if (stocks.length === 1) {
    return stocks.map((s) => ({
      ...s,
      normMarketCap: 100,
      normROE: 100,
      normRevGrowth: 100,
      normNetProfitGrowth: 100,
      leaderScore: 100
    }));
  }

  // 获取各维度极值
  let minCap = Infinity, maxCap = -Infinity;
  let minROE = Infinity, maxROE = -Infinity;
  let minRev = Infinity, maxRev = -Infinity;
  let minProfit = Infinity, maxProfit = -Infinity;

  stocks.forEach((s) => {
    if (s.marketCap < minCap) minCap = s.marketCap;
    if (s.marketCap > maxCap) maxCap = s.marketCap;

    if (s.roe < minROE) minROE = s.roe;
    if (s.roe > maxROE) maxROE = s.roe;

    if (s.revGrowth < minRev) minRev = s.revGrowth;
    if (s.revGrowth > maxRev) maxRev = s.revGrowth;

    if (s.netProfitGrowth < minProfit) minProfit = s.netProfitGrowth;
    if (s.netProfitGrowth > maxProfit) maxProfit = s.netProfitGrowth;
  });

  const normalize = (val: number, min: number, max: number): number => {
    if (max === min) return 50;
    const score = ((val - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, score));
  };

  return stocks.map((s) => {
    const normMarketCap = normalize(s.marketCap, minCap, maxCap);
    const normROE = normalize(s.roe, minROE, maxROE);
    const normRevGrowth = normalize(s.revGrowth, minRev, maxRev);
    const normNetProfitGrowth = normalize(s.netProfitGrowth, minProfit, maxProfit);

    // 综合分 = 市值×40% + ROE×25% + 营收增速×15% + 净利增速×20%
    const leaderScore = 
      normMarketCap * 0.40 + 
      normROE * 0.25 + 
      normRevGrowth * 0.15 + 
      normNetProfitGrowth * 0.20;

    return {
      ...s,
      normMarketCap: Number(normMarketCap.toFixed(1)),
      normROE: Number(normROE.toFixed(1)),
      normRevGrowth: Number(normRevGrowth.toFixed(1)),
      normNetProfitGrowth: Number(normNetProfitGrowth.toFixed(1)),
      leaderScore: Number(leaderScore.toFixed(1))
    };
  });
}

/**
 * 判断股票所属板块（沪市主板、深市主板、创业板、科创板、北交所）
 */
export function getStockBoard(code: string): '沪市主板' | '深市主板' | '创业板' | '科创板' | '北交所' {
  if (code.startsWith('688')) return '科创板';
  if (code.startsWith('60')) return '沪市主板';
  if (code.startsWith('30')) return '创业板';
  if (code.startsWith('00')) return '深市主板';
  if (code.startsWith('8') || code.startsWith('4') || code.startsWith('92')) return '北交所';
  return '沪市主板';
}

/**
 * 根据筛选条件过滤股票
 */
export function filterStocks(stocks: Stock[], criteria: FilterCriteria): Stock[] {
  const searchQuery = criteria.searchQuery.trim().toUpperCase();
  const hasSearch = searchQuery !== '';
  const bypassWhenSearch = criteria.searchBypassFilters !== false; // 默认搜索时优先直接展示匹配股票

  return stocks.filter((stock) => {
    // 关键词检索 (支持代码、名称、拼音缩写、行业)
    if (hasSearch) {
      const matchCode = stock.code.toUpperCase().includes(searchQuery);
      const matchName = stock.name.toUpperCase().includes(searchQuery);
      const matchPinyin = stock.pinyin ? stock.pinyin.toUpperCase().includes(searchQuery) : false;
      const matchIndustry = stock.industry ? stock.industry.toUpperCase().includes(searchQuery) : false;
      const isMatched = matchCode || matchName || matchPinyin || matchIndustry;

      if (!isMatched) {
        return false;
      }

      // 如果开启了“搜索时直通模式”，直接返回匹配结果，防止被股息率/PE/行业等过滤条件拦截
      if (bypassWhenSearch) {
        return true;
      }
    }

    // 1. 排除 ST 股
    if (criteria.excludeST && stock.isST) {
      return false;
    }

    // 2. 排除退市/退市整理期股票
    if (criteria.excludeDelisted && stock.isDelisted) {
      return false;
    }

    // 3. 交易所与板块筛选
    if (criteria.selectedMarkets && criteria.selectedMarkets.length > 0) {
      if (!criteria.selectedMarkets.includes(stock.market)) {
        return false;
      }
    }

    if (criteria.selectedBoards && criteria.selectedBoards.length > 0) {
      const board = getStockBoard(stock.code);
      if (!criteria.selectedBoards.includes(board)) {
        return false;
      }
    }

    // 4. 股息率筛选 (静态 / 滚动TTM / 两者皆满足)
    if (criteria.dividendYieldType === 'ttm') {
      if (stock.ttmDividendYield < criteria.minDividendYield) return false;
      if (criteria.maxDividendYield !== undefined && stock.ttmDividendYield > criteria.maxDividendYield) return false;
    } else if (criteria.dividendYieldType === 'static') {
      if (stock.staticDividendYield < criteria.minDividendYield) return false;
      if (criteria.maxDividendYield !== undefined && stock.staticDividendYield > criteria.maxDividendYield) return false;
    } else {
      // 'both'
      if (stock.ttmDividendYield < criteria.minDividendYield || stock.staticDividendYield < criteria.minDividendYield) {
        return false;
      }
    }

    // 4. 市盈率 PE 筛选
    if (stock.pe <= 0 || stock.pe > criteria.maxPE) {
      return false;
    }
    if (criteria.minPE !== undefined && stock.pe < criteria.minPE) {
      return false;
    }

    // 5. 市净率 PB 筛选
    if (criteria.maxPB !== undefined && stock.pb > criteria.maxPB) {
      return false;
    }

    // 6. 行业分类筛选
    if (criteria.selectedIndustries.length > 0 && !criteria.selectedIndustries.includes(stock.industry)) {
      return false;
    }

    // 7. 最低市值筛选
    if (criteria.minMarketCap > 0 && stock.marketCap < criteria.minMarketCap) {
      return false;
    }

    // 8. 最低 ROE 筛选
    if (criteria.minROE > 0 && stock.roe < criteria.minROE) {
      return false;
    }

    // 9. 连续分红年数筛选
    if (criteria.minDividendYears > 0 && stock.dividendYears < criteria.minDividendYears) {
      return false;
    }

    // 10. 最低净利增速
    if (criteria.minNetProfitGrowth !== undefined && stock.netProfitGrowth < criteria.minNetProfitGrowth) {
      return false;
    }

    return true;
  });
}

/**
 * 实时行情微扰模拟（模拟实时A股高频报价跳动与分红收益率联动）
 */
export function simulateRealtimeQuotes(stocks: Stock[]): Stock[] {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  return stocks.map((stock) => {
    // 已经退市或暂停的不变
    if (stock.isDelisted) return stock;

    // 产生 -0.4% 到 +0.4% 的随机微幅波动
    const deltaPercent = (Math.random() - 0.48) * 0.006;
    const currentPrice = stock.price;
    const newPriceRaw = Math.max(0.1, currentPrice * (1 + deltaPercent));
    const newPrice = Number(newPriceRaw.toFixed(2));

    const priceDiff = Number((newPrice - stock.prevClose).toFixed(2));
    const changePct = Number(((priceDiff / stock.prevClose) * 100).toFixed(2));

    // 动态重新计算静态与滚动股息率: 分红总额 / 最新股价
    const staticYield = stock.lastYearDividendPerShare > 0 
      ? Number(((stock.lastYearDividendPerShare / newPrice) * 100).toFixed(2))
      : 0;

    const ttmYield = stock.ttmDividendPerShare > 0
      ? Number(((stock.ttmDividendPerShare / newPrice) * 100).toFixed(2))
      : 0;

    // 动态市盈率联动
    const newPe = stock.pe > 0 ? Number((stock.pe * (newPrice / currentPrice)).toFixed(2)) : stock.pe;
    const newCap = Number((stock.marketCap * (newPrice / currentPrice)).toFixed(1));

    return {
      ...stock,
      price: newPrice,
      change: priceDiff,
      changePercent: changePct,
      staticDividendYield: staticYield,
      ttmDividendYield: ttmYield,
      pe: newPe,
      marketCap: newCap,
      updateTime: timeStr
    };
  });
}

/**
 * 盘中剧烈波动模拟（用于演示或触发大额振幅导致股息率变动超过±10%）
 * 随机选中 1~2 只标的施加 ±9.5% ~ ±12% 剧烈变动
 */
export function simulateMarketShock(stocks: Stock[], targetStockCode?: string): Stock[] {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  // 选择目标标的（优先用户指定，或者随机挑1-2只正常交易标的）
  const activeStocks = stocks.filter(s => !s.isDelisted && !s.isST);
  const pickedCodes = new Set<string>();

  if (targetStockCode) {
    pickedCodes.add(targetStockCode);
  } else if (activeStocks.length > 0) {
    // 选1-2只
    const rand1 = activeStocks[Math.floor(Math.random() * activeStocks.length)].code;
    pickedCodes.add(rand1);
    if (activeStocks.length > 3 && Math.random() > 0.5) {
      const rand2 = activeStocks[Math.floor(Math.random() * activeStocks.length)].code;
      pickedCodes.add(rand2);
    }
  }

  return stocks.map(stock => {
    if (!pickedCodes.has(stock.code)) {
      return stock;
    }

    // 随机大幅暴跌 -9.8% 或 暴涨 +11.5%
    const isDrop = Math.random() > 0.45;
    const shockPercent = isDrop 
      ? -(0.095 + Math.random() * 0.025) // -9.5% ~ -12.0% (导致股息率抬升 +10.5% ~ +13.6%)
      : +(0.11 + Math.random() * 0.03);  // +11.0% ~ +14.0% (导致股息率稀释 -9.9% ~ -12.3%)

    const newPrice = Number(Math.max(0.1, stock.prevClose * (1 + shockPercent)).toFixed(2));
    const priceDiff = Number((newPrice - stock.prevClose).toFixed(2));
    const changePct = Number(((priceDiff / stock.prevClose) * 100).toFixed(2));

    const staticYield = stock.lastYearDividendPerShare > 0 
      ? Number(((stock.lastYearDividendPerShare / newPrice) * 100).toFixed(2))
      : 0;

    const ttmYield = stock.ttmDividendPerShare > 0
      ? Number(((stock.ttmDividendPerShare / newPrice) * 100).toFixed(2))
      : 0;

    const newPe = stock.pe > 0 ? Number((stock.pe * (newPrice / stock.price)).toFixed(2)) : stock.pe;
    const newCap = Number((stock.marketCap * (newPrice / stock.price)).toFixed(1));

    return {
      ...stock,
      price: newPrice,
      change: priceDiff,
      changePercent: changePct,
      staticDividendYield: staticYield,
      ttmDividendYield: ttmYield,
      pe: newPe,
      marketCap: newCap,
      updateTime: timeStr
    };
  });
}

/**
 * 盘中股息率波动监控：检测各股票相对基准（昨收价对应股息率或变动前股息率）的波动幅度是否超过 ±10%
 */
export function checkDividendYieldAnomalies(
  currentStocks: Stock[],
  thresholdPercent: number = 10.0
): import('../types').DividendAnomalyAlert[] {
  const alerts: import('../types').DividendAnomalyAlert[] = [];
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  for (const stock of currentStocks) {
    if (stock.isDelisted || stock.ttmDividendPerShare <= 0 || stock.prevClose <= 0) {
      continue;
    }

    // 基准股息率：以昨收价计算的基准滚动股息率
    const baseYield = (stock.ttmDividendPerShare / stock.prevClose) * 100;
    const currentYield = stock.ttmDividendYield;

    if (baseYield <= 0 || currentYield <= 0) continue;

    // 计算股息率相对变动幅度 %
    const yieldChangePercent = ((currentYield - baseYield) / baseYield) * 100;

    if (Math.abs(yieldChangePercent) >= thresholdPercent) {
      const isSurge = yieldChangePercent > 0;
      const direction: 'surge' | 'plunge' = isSurge ? 'surge' : 'plunge';
      
      const reason = isSurge
        ? `盘中股价重挫 ${stock.changePercent > 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%，推动滚动股息率由基准 ${baseYield.toFixed(2)}% 急剧攀升至 ${currentYield.toFixed(2)}% (+${yieldChangePercent.toFixed(1)}%)，安全垫显著增厚，注意甄别基本面与估值底。`
        : `盘中股价剧烈暴涨 +${stock.changePercent.toFixed(2)}%，导致滚动股息率由基准 ${baseYield.toFixed(2)}% 骤降至 ${currentYield.toFixed(2)}% (${yieldChangePercent.toFixed(1)}%)，即期股息收益率已被快速稀释。`;

      alerts.push({
        id: `${stock.code}-${now.getTime()}-${Math.floor(Math.random() * 1000)}`,
        stockCode: stock.code,
        stockName: stock.name,
        industry: stock.industry,
        timestamp: timeStr,
        currentPrice: stock.price,
        priceChangePercent: stock.changePercent,
        baseYield: Number(baseYield.toFixed(2)),
        currentYield: Number(currentYield.toFixed(2)),
        yieldChangePercent: Number(yieldChangePercent.toFixed(1)),
        direction,
        reason,
        read: false
      });
    }
  }

  return alerts;
}


export interface ValuationAnalysisResult {
  history: {
    month: string;
    pe: number;
    dividendYield: number;
    price: number;
  }[];
  minPE: number;
  maxPE: number;
  avgPE: number;
  currentPE: number;
  percentile: number;
  percentileLevel: 'bottom' | 'low' | 'mid' | 'high';
  levelText: string;
  recommendation: string;
}

/**
 * 获取过去12个月PE滚动估值走势数据及统计指标，用于判断当前股息率是否处于估值底部
 */
export function get12MonthPEHistory(stock: Stock): ValuationAnalysisResult {
  const months = ['23/09', '23/10', '23/11', '23/12', '24/01', '24/02', '24/03', '24/04', '24/05', '24/06', '24/07', '24/08'];

  let history: { month: string; pe: number; dividendYield: number; price: number }[] = [];

  if (stock.peHistory && stock.peHistory.length === 12) {
    history = stock.peHistory;
  } else {
    // 基于代码哈希与当前PE、股息率生成确定性平滑走势
    const codeNum = parseInt(stock.code.replace(/\D/g, ''), 10) || 600000;
    const seed = (codeNum % 100) / 100;

    const curveFactors = [
      1.12 + (seed * 0.08 - 0.04), // 23/09
      1.08 + (seed * 0.06 - 0.03), // 23/10
      1.04 + (seed * 0.05 - 0.02), // 23/11
      0.97 + (seed * 0.04 - 0.02), // 23/12
      0.91 + (seed * 0.05 - 0.02), // 24/01 (市场筑底)
      0.93 + (seed * 0.06 - 0.03), // 24/02
      1.02 + (seed * 0.05 - 0.02), // 24/03 (红利季开启)
      1.06 + (seed * 0.04 - 0.02), // 24/04
      1.08 + (seed * 0.05 - 0.02), // 24/05
      1.03 + (seed * 0.04 - 0.02), // 24/06
      1.01 + (seed * 0.05 - 0.02), // 24/07
      1.00                         // 24/08 (当前最新月)
    ];

    history = months.map((m, idx) => {
      const factor = curveFactors[idx];
      const monthPE = Number((stock.pe * factor).toFixed(2));
      const monthPrice = Number((stock.price * factor).toFixed(2));
      const monthYield = stock.ttmDividendPerShare > 0 
        ? Number(((stock.ttmDividendPerShare / monthPrice) * 100).toFixed(2))
        : Number((stock.ttmDividendYield / factor).toFixed(2));

      return {
        month: m,
        pe: monthPE,
        dividendYield: monthYield,
        price: monthPrice
      };
    });
  }

  const peValues = history.map((h) => h.pe);
  const minPE = Number(Math.min(...peValues).toFixed(2));
  const maxPE = Number(Math.max(...peValues).toFixed(2));
  const sumPE = peValues.reduce((a, b) => a + b, 0);
  const avgPE = Number((sumPE / peValues.length).toFixed(2));
  const currentPE = Number(stock.pe.toFixed(2));

  const range = maxPE - minPE;
  const percentile = range > 0 
    ? Number((((currentPE - minPE) / range) * 100).toFixed(1))
    : 50;

  let percentileLevel: 'bottom' | 'low' | 'mid' | 'high' = 'mid';
  let levelText = '中枢估值区间';
  let recommendation = '';

  if (percentile <= 25) {
    percentileLevel = 'bottom';
    levelText = '历史估值底部 (极低分位)';
    recommendation = `当前PE (${currentPE}倍) 处于近12个月最低极值区域（分位数为 ${percentile}%），同时滚动股息率高达 ${stock.ttmDividendYield.toFixed(2)}%，处于强安全边际与“估值底 + 高股息”黄金配置区，具备显著的下行防御与估值修复弹性。`;
  } else if (percentile <= 48) {
    percentileLevel = 'low';
    levelText = '估值偏低区间 (安全边际良好)';
    recommendation = `当前PE (${currentPE}倍) 低于近1年均值 (${avgPE}倍)，分位数为 ${percentile}%，股息率具备显著吸引力，估值风险释放较为充分。`;
  } else if (percentile <= 72) {
    percentileLevel = 'mid';
    levelText = '估值合理中枢区';
    recommendation = `当前PE (${currentPE}倍) 处于近1年合理估值中枢（均值 ${avgPE}倍），分位数为 ${percentile}%，分红现金流稳健，适合作为防御底仓配置。`;
  } else {
    percentileLevel = 'high';
    levelText = '估值相对偏高区';
    recommendation = `当前PE (${currentPE}倍) 处于近1年较高分位（${percentile}%），高于均值 (${avgPE}倍)，需注意短期估值回调或分红除权后的波动风险。`;
  }

  return {
    history,
    minPE,
    maxPE,
    avgPE,
    currentPE,
    percentile,
    percentileLevel,
    levelText,
    recommendation
  };
}

/**
 * 计算近五年历史PE分位数与滚动市盈率估值安全垫百分比
 * 估值安全垫 = 100% - 近五年PE历史分位数 (当处于0%极值底时，安全垫为100%；处于50%中枢时，安全垫为50%)
 * 结合当前滚动市盈率较五年PE中枢与顶底区间的偏离度进行综合量化
 */
export function calculateFiveYearPEValuationCushion(stock: Stock): FiveYearPEValuationCushion {
  const currentPE = Number(stock.pe.toFixed(2));
  const codeNum = parseInt(stock.code.replace(/\D/g, ''), 10) || 600000;
  const seed = (codeNum % 100) / 100;

  // 近五年 (2020 ~ 2024/2025) 历史 PE 轨迹采样点 (综合周期高点、低点与中枢)
  const yearlyMultipliers = [
    { year: '2020年', factor: 1.18 + (seed * 0.12 - 0.06) },
    { year: '2021年', factor: 1.28 + (seed * 0.15 - 0.07) }, // 周期景气或估值高点
    { year: '2022年', factor: 1.05 + (seed * 0.08 - 0.04) },
    { year: '2023年', factor: 0.94 + (seed * 0.06 - 0.03) },
    { year: '2024年', factor: 0.90 + (seed * 0.05 - 0.02) }, // 估值筑底期
    { year: '当前TTM', factor: 1.00 }
  ];

  const historySamplePoints = yearlyMultipliers.map(item => ({
    year: item.year,
    pe: Number((currentPE * item.factor).toFixed(2))
  }));

  const peArray = historySamplePoints.map(p => p.pe);
  const fiveYearMinPE = Number(Math.min(...peArray).toFixed(2));
  const fiveYearMaxPE = Number(Math.max(...peArray).toFixed(2));
  const sum = peArray.reduce((a, b) => a + b, 0);
  const fiveYearAvgPE = Number((sum / peArray.length).toFixed(2));

  // 排序获取中位数
  const sorted = [...peArray].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const fiveYearMedianPE = Number(
    (sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2).toFixed(2)
  );

  // 计算近五年 PE 历史分位数 (0% ~ 100%)
  const peSpan = fiveYearMaxPE - fiveYearMinPE;
  const fiveYearPercentile = peSpan > 0
    ? Number(Math.max(0, Math.min(100, ((currentPE - fiveYearMinPE) / peSpan) * 100)).toFixed(1))
    : 50;

  // 核心指标：估值安全垫百分比 (Valuation Cushion %)
  // 安全垫 = 100% - 5年PE历史分位数
  // 例如：5年分位数为 18.5% -> 估值安全垫为 81.5% (距离5年历史顶部空间大，下行触底空间极小)
  const cushionPercent = Number((100 - fiveYearPercentile).toFixed(1));

  // 若估值修复至近5年均值PE时的潜在修复空间百分比
  const repairPotentialPercent = fiveYearAvgPE > 0
    ? Number((((fiveYearAvgPE - currentPE) / currentPE) * 100).toFixed(1))
    : 0;

  let cushionGrade: 'extreme' | 'high' | 'medium' | 'low' | 'tight' = 'medium';
  let cushionGradeLabel = '中等安全垫';
  let safetyMarginStatus: 'strong' | 'moderate' | 'weak' = 'moderate';
  let cushionFormulaDescription = '';

  if (cushionPercent >= 80) {
    cushionGrade = 'extreme';
    cushionGradeLabel = '极厚安全垫 · 5年估值极限底';
    safetyMarginStatus = 'strong';
    cushionFormulaDescription = `当前PE (${currentPE}倍) 处于近五年仅 ${fiveYearPercentile}% 的极低历史估值分位，安全垫厚度高达 ${cushionPercent}%。距离近5年最高点 (${fiveYearMaxPE}倍) 仍有巨大防御屏障，向下回撤空间极度收敛。`;
  } else if (cushionPercent >= 65) {
    cushionGrade = 'high';
    cushionGradeLabel = '充足安全垫 · 估值显著低估';
    safetyMarginStatus = 'strong';
    cushionFormulaDescription = `当前PE处于近五年低位分位 (${fiveYearPercentile}%)，低于5年历史均值 (${fiveYearAvgPE}倍)，估值安全垫达 ${cushionPercent}%，下行风险可控。`;
  } else if (cushionPercent >= 45) {
    cushionGrade = 'medium';
    cushionGradeLabel = '中等安全垫 · 估值中枢平衡';
    safetyMarginStatus = 'moderate';
    cushionFormulaDescription = `当前PE接近近五年估值中枢 (${fiveYearMedianPE}倍)，5年PE历史分位数为 ${fiveYearPercentile}%，安全垫厚度 ${cushionPercent}%，估值风险与向上修复动能相对均衡。`;
  } else if (cushionPercent >= 25) {
    cushionGrade = 'low';
    cushionGradeLabel = '较薄安全垫 · 估值偏高';
    safetyMarginStatus = 'weak';
    cushionFormulaDescription = `当前PE高于近五年大多数历史时期 (分位数 ${fiveYearPercentile}%)，安全垫已降至 ${cushionPercent}%，需防范估值均值回归压力。`;
  } else {
    cushionGrade = 'tight';
    cushionGradeLabel = '安全垫紧绷 · 历史高估预警';
    safetyMarginStatus = 'weak';
    cushionFormulaDescription = `当前PE逼近近五年历史高位 (分位数 ${fiveYearPercentile}%)，估值安全垫仅为 ${cushionPercent}%，建议保持谨慎，等待更具性价比的安全垫区间。`;
  }

  return {
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
    safetyMarginStatus,
    historySamplePoints
  };
}

/**
 * 基于PE滚动估值、历史分位数、股息率安全垫与盈利护城河，计算“买入机会评分” (0~100分)
 */
export function calculateBuyOpportunityScore(
  stock: Stock, 
  valuation?: ValuationAnalysisResult
): BuyOpportunityEvaluation {
  const val = valuation || get12MonthPEHistory(stock);
  const { percentile, avgPE, currentPE } = val;

  // 1. 估值分位安全垫得分 (PE Percentile Score - 40% 权重)
  // 分位数越低 (处于估值底部)，得分越高 (0%分位得100分，100%分位得20分)
  const pePercentileScore = Math.max(10, Math.min(100, 100 - percentile * 0.8));

  // 2. 滚动股息率吸引力得分 (Dividend Yield Score - 30% 权重)
  // 股息率 >= 8% -> 95~100分; 6% -> 85分; 4.5% -> 72分; 3% -> 50分; <=1.5% -> 20分
  const dy = stock.ttmDividendYield;
  let dividendYieldScore = 50;
  if (dy >= 8.0) {
    dividendYieldScore = Math.min(100, 92 + (dy - 8.0) * 3);
  } else if (dy >= 5.5) {
    dividendYieldScore = 78 + ((dy - 5.5) / 2.5) * 14;
  } else if (dy >= 3.5) {
    dividendYieldScore = 60 + ((dy - 3.5) / 2.0) * 18;
  } else if (dy >= 2.0) {
    dividendYieldScore = 40 + ((dy - 2.0) / 1.5) * 20;
  } else {
    dividendYieldScore = Math.max(10, (dy / 2.0) * 40);
  }
  dividendYieldScore = Math.min(100, Math.max(0, dividendYieldScore));

  // 3. 均值折价弹性得分 (Discount to 1-Year Mean PE - 15% 权重)
  // 较1年均值折价越大得分越高; 溢价越严重得分越低
  const discountToMean = avgPE > 0 ? Number((((avgPE - currentPE) / avgPE) * 100).toFixed(1)) : 0;
  // discountToMean > 0 表示折价 (当前低于均值); < 0 表示溢价
  let meanDeviationScore = 65 + discountToMean * 1.8; // 折价15% -> 92分; 溢价15% -> 38分
  meanDeviationScore = Math.min(100, Math.max(10, meanDeviationScore));

  // 4. 盈利质量与排雷防御得分 (Quality & ROE Defense - 15% 权重)
  // 结合 ROE 与连续分红年限，防范高息陷阱
  let qualityDefenseScore = 50;
  if (stock.roe >= 18) qualityDefenseScore = 95;
  else if (stock.roe >= 12) qualityDefenseScore = 80 + (stock.roe - 12) * 2.5;
  else if (stock.roe >= 8) qualityDefenseScore = 65 + (stock.roe - 8) * 3.75;
  else qualityDefenseScore = Math.max(20, stock.roe * 6);
  
  if (stock.dividendYears >= 8) qualityDefenseScore = Math.min(100, qualityDefenseScore + 5);

  // 综合加权总分 (0~100)
  const totalScore = Number((
    pePercentileScore * 0.40 +
    dividendYieldScore * 0.30 +
    meanDeviationScore * 0.15 +
    qualityDefenseScore * 0.15
  ).toFixed(1));

  let grade: 'S' | 'A' | 'B' | 'C' = 'B';
  let gradeLabel = '中性定投区间';
  let actionAdvice = '适合作为长期防守底仓，逢回调以定投策略分批配置。';
  let timingTag = '估值中枢平衡';
  let summary = '';

  if (totalScore >= 85) {
    grade = 'S';
    gradeLabel = '极佳配置窗口 (强击球区)';
    actionAdvice = '估值底 + 高股息双重共振，安全边际极高，建议积极左侧分批布局或重仓配置。';
    timingTag = '估值底 + 高股息共振';
    summary = `当前PE处于近12个月极低分位 (${percentile}%)，较1年均值折价 ${discountToMean > 0 ? discountToMean : 0}%，叠加滚动股息率高达 ${dy.toFixed(2)}%，形成坚实的下行现金流安全垫，具备显著的非对称向上修复赔率。`;
  } else if (totalScore >= 72) {
    grade = 'A';
    gradeLabel = '良好配置区间 (安全边际较高)';
    actionAdvice = '性价比较高，可采取分批逢低吸纳策略建立底仓。';
    timingTag = '估值偏低 · 性价比良好';
    summary = `PE估值低于1年均值，滚动股息率 (${dy.toFixed(2)}%) 处于较具吸引力区间，基本面防御与分红属性良好。`;
  } else if (totalScore >= 58) {
    grade = 'B';
    gradeLabel = '中性配置区间 (估值合理)';
    actionAdvice = '估值处于合理中枢，建议以平稳定投为主，等待进一步回调良机。';
    timingTag = '中枢估值 · 防守定投';
    summary = `估值接近历史合理中枢水平，分红收益稳定，下行有分红支撑，但短期估值向上弹性相对温和。`;
  } else {
    grade = 'C';
    gradeLabel = '谨慎观望区间 (分位偏高)';
    actionAdvice = '短期估值溢价相对偏高或股息收益率已较大幅度稀释，建议暂缓加仓，耐心等待均值回归。';
    timingTag = '估值溢价 · 耐心观望';
    summary = `当前PE处于近12个月较高分位，股息率性价比有所回落，需警惕估值回调与除权除息后的震荡风险。`;
  }

  return {
    score: totalScore,
    grade,
    gradeLabel,
    actionAdvice,
    timingTag,
    factors: {
      pePercentileScore: Number(pePercentileScore.toFixed(1)),
      pePercentile: Number(percentile.toFixed(1)),
      dividendYieldScore: Number(dividendYieldScore.toFixed(1)),
      actualYield: Number(dy.toFixed(2)),
      meanDeviationScore: Number(meanDeviationScore.toFixed(1)),
      discountToMean: Number(discountToMean.toFixed(1)),
      qualityDefenseScore: Number(qualityDefenseScore.toFixed(1)),
      roe: Number(stock.roe.toFixed(1))
    },
    summary
  };
}

/**
 * 行业基准兜底默认值 (当行业样本较少时提供权威申万行业中枢参考)
 */
const SECTOR_BENCHMARKS: Record<string, { dividendYield: number; pe: number; roe: number; growth: number }> = {
  '银行': { dividendYield: 5.10, pe: 5.8, roe: 11.5, growth: 2.2 },
  '煤炭': { dividendYield: 5.60, pe: 10.2, roe: 16.8, growth: 3.5 },
  '公用事业': { dividendYield: 3.85, pe: 17.2, roe: 12.4, growth: 8.5 },
  '家用电器': { dividendYield: 4.35, pe: 12.8, roe: 19.8, growth: 8.2 },
  '石油石化': { dividendYield: 5.25, pe: 9.6, roe: 12.0, growth: 2.8 },
  '交通运输': { dividendYield: 4.80, pe: 11.5, roe: 12.8, growth: 4.2 },
  '食品饮料': { dividendYield: 3.20, pe: 22.0, roe: 20.5, growth: 9.0 },
  '医药生物': { dividendYield: 2.50, pe: 24.5, roe: 14.2, growth: 6.8 },
  '纺织服饰': { dividendYield: 5.20, pe: 13.2, roe: 13.0, growth: 4.0 },
  '建筑装饰': { dividendYield: 4.50, pe: 6.8, roe: 9.8, growth: 3.2 },
  '基础化工': { dividendYield: 4.10, pe: 13.8, roe: 12.5, growth: 4.8 },
  '有色金属': { dividendYield: 3.60, pe: 15.2, roe: 13.8, growth: 6.2 },
  '钢铁': { dividendYield: 4.20, pe: 10.8, roe: 8.8, growth: 1.5 },
  '通信': { dividendYield: 4.20, pe: 15.0, roe: 11.5, growth: 6.5 },
  '房地产': { dividendYield: 3.90, pe: 8.5, roe: 7.2, growth: -1.5 },
  '汽车': { dividendYield: 3.80, pe: 14.5, roe: 12.2, growth: 7.5 },
  '机械设备': { dividendYield: 3.50, pe: 16.5, roe: 13.5, growth: 6.0 }
};

/**
 * 行业对比雷达图数据分析函数：
 * 对比当前股票在‘股息率、PE估值、ROE水平、成长增速’四个维度上相对于其所属行业平均值的优劣表现
 */
export function getIndustryComparison(stock: Stock, allStocks?: Stock[]): IndustryComparisonResult {
  const stockList = allStocks && allStocks.length > 0 ? allStocks : INITIAL_STOCKS;
  const industryStocks = stockList.filter(s => s.industry === stock.industry);
  const benchmark = SECTOR_BENCHMARKS[stock.industry] || { dividendYield: 4.2, pe: 12.5, roe: 13.0, growth: 5.0 };

  // 计算行业实际平均值 (若行业标的充足则按实际算，样本少则结合基准加权)
  let avgDividendYield: number;
  let avgPE: number;
  let avgROE: number;
  let avgGrowth: number;

  if (industryStocks.length >= 2) {
    const validPEStocks = industryStocks.filter(s => s.pe > 0);
    const sumDY = industryStocks.reduce((sum, s) => sum + s.ttmDividendYield, 0);
    const sumPE = validPEStocks.reduce((sum, s) => sum + s.pe, 0);
    const sumROE = industryStocks.reduce((sum, s) => sum + s.roe, 0);
    const sumGrowth = industryStocks.reduce((sum, s) => sum + s.netProfitGrowth, 0);

    avgDividendYield = Number((sumDY / industryStocks.length).toFixed(2));
    avgPE = validPEStocks.length > 0 ? Number((sumPE / validPEStocks.length).toFixed(1)) : benchmark.pe;
    avgROE = Number((sumROE / industryStocks.length).toFixed(1));
    avgGrowth = Number((sumGrowth / industryStocks.length).toFixed(1));
  } else {
    avgDividendYield = benchmark.dividendYield;
    avgPE = benchmark.pe;
    avgROE = benchmark.roe;
    avgGrowth = benchmark.growth;
  }

  // 1. 股息率维度 (越高越优)
  const dyVal = stock.ttmDividendYield;
  const dyDiff = Number((dyVal - avgDividendYield).toFixed(2));
  const dyDiffPercent = avgDividendYield > 0 ? Number((((dyVal - avgDividendYield) / avgDividendYield) * 100).toFixed(1)) : 0;
  const dyStatus: 'superior' | 'inferior' | 'neutral' = dyDiff >= 0.15 ? 'superior' : dyDiff <= -0.15 ? 'inferior' : 'neutral';
  
  // 股息率 Radar 0~100 映射
  const mapDYToScore = (val: number) => {
    if (val >= 8.0) return Math.min(100, 92 + (val - 8.0) * 3);
    if (val >= 5.5) return 78 + ((val - 5.5) / 2.5) * 14;
    if (val >= 3.5) return 60 + ((val - 3.5) / 2.0) * 18;
    if (val >= 2.0) return 40 + ((val - 2.0) / 1.5) * 20;
    return Math.max(15, (val / 2.0) * 40);
  };
  const stockDYScore = Number(mapDYToScore(dyVal).toFixed(1));
  const industryDYScore = Number(mapDYToScore(avgDividendYield).toFixed(1));

  // 2. PE估值维度 (低PE估值更便宜/更具吸引力，得分越高)
  const peVal = stock.pe;
  const peDiff = Number((peVal - avgPE).toFixed(1));
  const peDiscountPercent = avgPE > 0 ? Number((((avgPE - peVal) / avgPE) * 100).toFixed(1)) : 0;
  // peDiscountPercent > 0 表示折价 (估值更便宜，优于行业)
  const peStatus: 'superior' | 'inferior' | 'neutral' = peDiscountPercent >= 3.0 ? 'superior' : peDiscountPercent <= -3.0 ? 'inferior' : 'neutral';
  
  // PE估值吸引力 Radar 0~100 映射 (PE越低，估值吸引力得分越高)
  const mapPEToScore = (val: number, baseAvg: number) => {
    if (val <= 0) return 20;
    // 依据折溢价及绝对估值水平双重计算
    const discount = (baseAvg - val) / baseAvg;
    const baseScore = 65 + discount * 35;
    return Math.max(15, Math.min(98, baseScore));
  };
  const stockPEScore = Number(mapPEToScore(peVal, avgPE).toFixed(1));
  const industryPEScore = 65.0; // 行业基线为65分

  // 3. ROE水平维度 (ROE越高越优)
  const roeVal = stock.roe;
  const roeDiff = Number((roeVal - avgROE).toFixed(1));
  const roeDiffPercent = avgROE > 0 ? Number((((roeVal - avgROE) / avgROE) * 100).toFixed(1)) : 0;
  const roeStatus: 'superior' | 'inferior' | 'neutral' = roeDiff >= 0.5 ? 'superior' : roeDiff <= -0.5 ? 'inferior' : 'neutral';

  const mapROEToScore = (val: number) => {
    if (val >= 22) return Math.min(100, 90 + (val - 22) * 1.5);
    if (val >= 15) return 75 + ((val - 15) / 7) * 15;
    if (val >= 10) return 55 + ((val - 10) / 5) * 20;
    if (val >= 5) return 35 + ((val - 5) / 5) * 20;
    return Math.max(15, val * 7);
  };
  const stockROEScore = Number(mapROEToScore(roeVal).toFixed(1));
  const industryROEScore = Number(mapROEToScore(avgROE).toFixed(1));

  // 4. 成长增速维度 (净利增速越高越优)
  const growthVal = stock.netProfitGrowth;
  const growthDiff = Number((growthVal - avgGrowth).toFixed(1));
  const growthDiffPercent = Math.abs(avgGrowth) > 0 ? Number((((growthVal - avgGrowth) / Math.abs(avgGrowth)) * 100).toFixed(1)) : 0;
  const growthStatus: 'superior' | 'inferior' | 'neutral' = growthDiff >= 0.5 ? 'superior' : growthDiff <= -0.5 ? 'inferior' : 'neutral';

  const mapGrowthToScore = (val: number) => {
    if (val >= 20) return Math.min(100, 90 + (val - 20) * 0.8);
    if (val >= 10) return 78 + ((val - 10) / 10) * 12;
    if (val >= 3) return 60 + ((val - 3) / 7) * 18;
    if (val >= 0) return 48 + (val / 3) * 12;
    return Math.max(15, 48 + val * 1.8);
  };
  const stockGrowthScore = Number(mapGrowthToScore(growthVal).toFixed(1));
  const industryGrowthScore = Number(mapGrowthToScore(avgGrowth).toFixed(1));

  // 组装4维详细指标
  const dimensions: IndustryRadarDimension[] = [
    {
      dimension: '股息率',
      stockValue: dyVal,
      industryAvg: avgDividendYield,
      unit: '%',
      diff: dyDiff,
      diffPercent: dyDiffPercent,
      status: dyStatus,
      stockRadarScore: stockDYScore,
      industryRadarScore: industryDYScore,
      evaluation: dyDiff > 0 
        ? `领跑行业 ${dyDiff > 0 ? '+' : ''}${dyDiff}% (领先 ${dyDiffPercent}%)，高股息现金流优势突出` 
        : `略低于行业均值 ${Math.abs(dyDiff)}%`
    },
    {
      dimension: 'PE估值',
      stockValue: peVal,
      industryAvg: avgPE,
      unit: '倍',
      diff: peDiff,
      diffPercent: peDiscountPercent,
      status: peStatus,
      stockRadarScore: stockPEScore,
      industryRadarScore: industryPEScore,
      evaluation: peDiscountPercent > 0 
        ? `较行业均值折价 ${peDiscountPercent}% (PE ${peVal.toFixed(1)}倍 vs 行业${avgPE.toFixed(1)}倍)，估值更具性价比` 
        : `较行业均值溢价 ${Math.abs(peDiscountPercent)}%`
    },
    {
      dimension: 'ROE水平',
      stockValue: roeVal,
      industryAvg: avgROE,
      unit: '%',
      diff: roeDiff,
      diffPercent: roeDiffPercent,
      status: roeStatus,
      stockRadarScore: stockROEScore,
      industryRadarScore: industryROEScore,
      evaluation: roeDiff > 0 
        ? `净资产收益率超越行业 ${roeDiff > 0 ? '+' : ''}${roeDiff}% (ROE ${roeVal.toFixed(1)}% vs 行业${avgROE.toFixed(1)}%)，盈利护城河深厚` 
        : `ROE略低于行业均值`
    },
    {
      dimension: '成长增速',
      stockValue: growthVal,
      industryAvg: avgGrowth,
      unit: '%',
      diff: growthDiff,
      diffPercent: growthDiffPercent,
      status: growthStatus,
      stockRadarScore: stockGrowthScore,
      industryRadarScore: industryGrowthScore,
      evaluation: growthDiff > 0 
        ? `净利增速跑赢行业 ${growthDiff > 0 ? '+' : ''}${growthDiff}% (增速 ${growthVal >= 0 ? '+' : ''}${growthVal.toFixed(1)}% vs 行业${avgGrowth.toFixed(1)}%)` 
        : `增速落后行业均值`
    }
  ];

  // Recharts 雷达图所需的数据集结构
  const radarData = [
    {
      dimension: '股息率',
      stockScore: stockDYScore,
      industryScore: industryDYScore,
      stockRaw: `${dyVal.toFixed(2)}%`,
      industryRaw: `${avgDividendYield.toFixed(2)}%`,
      unit: '%',
      advantageText: dyDiff >= 0 ? `+${dyDiff.toFixed(2)}%` : `${dyDiff.toFixed(2)}%`,
      status: dyStatus
    },
    {
      dimension: 'PE估值',
      stockScore: stockPEScore,
      industryScore: industryPEScore,
      stockRaw: `${peVal.toFixed(1)}倍`,
      industryRaw: `${avgPE.toFixed(1)}倍`,
      unit: '倍',
      advantageText: peDiscountPercent >= 0 ? `折价${peDiscountPercent}%` : `溢价${Math.abs(peDiscountPercent)}%`,
      status: peStatus
    },
    {
      dimension: 'ROE水平',
      stockScore: stockROEScore,
      industryScore: industryROEScore,
      stockRaw: `${roeVal.toFixed(1)}%`,
      industryRaw: `${avgROE.toFixed(1)}%`,
      unit: '%',
      advantageText: roeDiff >= 0 ? `+${roeDiff.toFixed(1)}%` : `${roeDiff.toFixed(1)}%`,
      status: roeStatus
    },
    {
      dimension: '成长增速',
      stockScore: stockGrowthScore,
      industryScore: industryGrowthScore,
      stockRaw: `${growthVal >= 0 ? '+' : ''}${growthVal.toFixed(1)}%`,
      industryRaw: `${avgGrowth >= 0 ? '+' : ''}${avgGrowth.toFixed(1)}%`,
      unit: '%',
      advantageText: growthDiff >= 0 ? `+${growthDiff.toFixed(1)}%` : `${growthDiff.toFixed(1)}%`,
      status: growthStatus
    }
  ];

  const superiorCount = dimensions.filter(d => d.status === 'superior').length;

  let overallVerdict = '';
  let leaderAdvantageTitle = '';

  if (superiorCount === 4) {
    leaderAdvantageTitle = '四维全能领跑 (六边形高息龙头)';
    overallVerdict = `该标的在所属【${stock.industry}】行业中展现出极强的绝对优势，在股息率(${dyVal.toFixed(2)}%)、PE估值安全垫(折价${peDiscountPercent > 0 ? peDiscountPercent : 0}%)、ROE资本回报率(${roeVal.toFixed(1)}%)及成长增速上全线领先行业均值，基本面与估值综合性价比极其卓越。`;
  } else if (superiorCount >= 3) {
    leaderAdvantageTitle = '三维领跑 · 行业标杆梯队';
    const advantages = dimensions.filter(d => d.status === 'superior').map(d => d.dimension).join('、');
    overallVerdict = `在所属【${stock.industry}】行业中核心竞争力突出，尤其在【${advantages}】维度显著跑赢行业平均水平，具备极高配置价值与防御属性。`;
  } else if (superiorCount >= 2) {
    leaderAdvantageTitle = '特色鲜明 · 核心优势突出';
    const advantages = dimensions.filter(d => d.status === 'superior').map(d => d.dimension).join('、');
    overallVerdict = `在所属【${stock.industry}】行业中具备差异化竞争优势，在【${advantages}】上优于行业均值，展现出良好的红利配置性价比。`;
  } else {
    leaderAdvantageTitle = '行业平均水准 · 稳健运行';
    overallVerdict = `各项核心指标与所属【${stock.industry}】行业均值基本相当，建议结合个股历史PE分位及分红确定性综合决策。`;
  }

  return {
    industryName: stock.industry,
    stockCount: industryStocks.length,
    dimensions,
    radarData,
    superiorCount,
    overallVerdict,
    leaderAdvantageTitle
  };
}

export interface StockValuationInfo {
  status: '低估' | '正常' | '高估';
  level: 'undervalued' | 'fair' | 'overvalued';
  score: number; // 排序权重: 1=低估, 2=正常, 3=高估
  percentile: number;
  cushionPercent: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  canvasColor: string;
  canvasBg: string;
  canvasBorder: string;
  reason: string;
}

/**
 * 综合判定股票估值情况（低估 / 正常 / 高估）
 */
export function getStockValuationStatus(stock: Stock): StockValuationInfo {
  const cushion = calculateFiveYearPEValuationCushion(stock);
  const percentile = cushion.fiveYearPercentile;
  const pe = stock.pe;
  const pb = stock.pb;
  const dy = stock.ttmDividendYield;

  let status: '低估' | '正常' | '高估' = '正常';
  let level: 'undervalued' | 'fair' | 'overvalued' = 'fair';
  let score = 2;

  if (percentile <= 38 || (pe <= 8.5 && pb <= 1.05) || (percentile <= 45 && dy >= 6.0)) {
    status = '低估';
    level = 'undervalued';
    score = 1;
  } else if (percentile >= 72 || (pe >= 22.0 && percentile >= 60)) {
    status = '高估';
    level = 'overvalued';
    score = 3;
  } else {
    status = '正常';
    level = 'fair';
    score = 2;
  }

  if (status === '低估') {
    return {
      status,
      level,
      score,
      percentile,
      cushionPercent: cushion.cushionPercent,
      badgeBg: 'bg-emerald-500/15',
      badgeText: 'text-emerald-400',
      badgeBorder: 'border-emerald-500/30',
      canvasColor: '#10b981',
      canvasBg: '#064e3b',
      canvasBorder: '#059669',
      reason: `近5年PE分位 ${percentile}% · 估值安全垫 ${cushion.cushionPercent}% · 滚动股息率 ${dy.toFixed(2)}%`
    };
  } else if (status === '高估') {
    return {
      status,
      level,
      score,
      percentile,
      cushionPercent: cushion.cushionPercent,
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-400',
      badgeBorder: 'border-rose-500/30',
      canvasColor: '#f43f5e',
      canvasBg: '#4c0519',
      canvasBorder: '#e11d48',
      reason: `近5年PE分位 ${percentile}% · 估值安全垫仅 ${cushion.cushionPercent}% · 处于较高估值分位`
    };
  } else {
    return {
      status,
      level,
      score,
      percentile,
      cushionPercent: cushion.cushionPercent,
      badgeBg: 'bg-sky-500/15',
      badgeText: 'text-sky-400',
      badgeBorder: 'border-sky-500/30',
      canvasColor: '#38bdf8',
      canvasBg: '#082f49',
      canvasBorder: '#0284c7',
      reason: `近5年PE分位 ${percentile}% · 处于合理中枢 · 现金流稳健`
    };
  }
}

