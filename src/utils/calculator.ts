import { Stock, FilterCriteria } from '../types';

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
 * 根据筛选条件过滤股票
 */
export function filterStocks(stocks: Stock[], criteria: FilterCriteria): Stock[] {
  return stocks.filter((stock) => {
    // 1. 排除 ST 股
    if (criteria.excludeST && stock.isST) {
      return false;
    }

    // 2. 排除退市/退市整理期股票
    if (criteria.excludeDelisted && stock.isDelisted) {
      return false;
    }

    // 3. 股息率筛选 (静态 / 滚动TTM / 两者皆满足)
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

    // 11. 关键词检索 (支持代码、名称、拼音缩写)
    if (criteria.searchQuery.trim() !== '') {
      const q = criteria.searchQuery.trim().toUpperCase();
      const matchCode = stock.code.includes(q);
      const matchName = stock.name.toUpperCase().includes(q);
      const matchPinyin = stock.pinyin.toUpperCase().includes(q);
      const matchIndustry = stock.industry.includes(q);
      if (!matchCode && !matchName && !matchPinyin && !matchIndustry) {
        return false;
      }
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
