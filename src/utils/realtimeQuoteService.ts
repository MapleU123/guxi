import { Stock } from '../types';

export interface RealtimeQuote {
  code: string;
  fullCode: string;
  name: string;
  market: 'SH' | 'SZ' | 'BJ';
  price: number;
  prevClose: number;
  open: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  turnoverRate?: number;
  pe: number;
  pb: number;
  marketCap: number;
  floatMarketCap?: number;
  updateTime: string;
  queryTimestamp: number;
}

// 格式化代码为标准带前缀代码
export function formatCodeWithPrefix(rawCode: string): string {
  const code = rawCode.trim().toLowerCase();
  if (code.startsWith('sh') || code.startsWith('sz') || code.startsWith('bj')) {
    return code;
  }
  const cleanCode = code.replace(/\D/g, '');
  if (cleanCode.startsWith('60') || cleanCode.startsWith('68') || cleanCode.startsWith('90')) {
    return `sh${cleanCode}`;
  }
  if (cleanCode.startsWith('00') || cleanCode.startsWith('30') || cleanCode.startsWith('20')) {
    return `sz${cleanCode}`;
  }
  if (cleanCode.startsWith('8') || cleanCode.startsWith('4') || cleanCode.startsWith('92')) {
    return `bj${cleanCode}`;
  }
  return `sh${cleanCode}`;
}

// 客户端直接解析 (作为前端直连降级备选)
export function parseClientTencentQuote(line: string): RealtimeQuote | null {
  try {
    const match = line.match(/v_(.*?)=\"(.*?)\"/);
    if (!match) return null;
    const fullCode = match[1];
    const parts = match[2].split('~');
    if (parts.length < 30) return null;

    const code = parts[2] || fullCode.replace(/^(sh|sz|bj)/i, '');
    const name = parts[1] || '';
    const price = parseFloat(parts[3]) || 0;
    const prevClose = parseFloat(parts[4]) || 0;
    const open = parseFloat(parts[5]) || 0;
    const change = parseFloat(parts[31]) || (price && prevClose ? +(price - prevClose).toFixed(2) : 0);
    const changePercent = parseFloat(parts[32]) || (prevClose ? +(((price - prevClose) / prevClose) * 100).toFixed(2) : 0);
    const high = parseFloat(parts[33]) || price;
    const low = parseFloat(parts[34]) || price;
    const volume = parseFloat(parts[36]) || parseFloat(parts[6]) || 0;
    const turnover = parseFloat(parts[37]) || 0;
    const turnoverRate = parseFloat(parts[38]) || 0;
    const pe = parseFloat(parts[39]) || 0;
    const pb = parseFloat(parts[46]) || 0;
    const marketCap = parseFloat(parts[45]) || 0;
    const floatMarketCap = parseFloat(parts[44]) || 0;
    const rawTime = parts[30] || '';

    let formattedTime = '';
    if (rawTime.length >= 14) {
      formattedTime = `${rawTime.slice(0, 4)}-${rawTime.slice(4, 6)}-${rawTime.slice(6, 8)} ${rawTime.slice(8, 10)}:${rawTime.slice(10, 12)}:${rawTime.slice(12, 14)}`;
    } else {
      formattedTime = new Date().toLocaleTimeString();
    }

    let market: 'SH' | 'SZ' | 'BJ' = 'SH';
    if (fullCode.startsWith('sz')) market = 'SZ';
    else if (fullCode.startsWith('bj')) market = 'BJ';

    return {
      code,
      fullCode,
      name,
      market,
      price,
      prevClose,
      open,
      change,
      changePercent,
      high,
      low,
      volume,
      turnover,
      turnoverRate,
      pe,
      pb,
      marketCap,
      floatMarketCap,
      updateTime: formattedTime,
      queryTimestamp: Date.now()
    };
  } catch {
    return null;
  }
}

/**
 * 查询单只股票当天真实实时股价
 */
export async function fetchRealtimeQuote(code: string): Promise<RealtimeQuote | null> {
  const formattedCode = formatCodeWithPrefix(code);

  // 1. 优先调用后端 Express 代理服务
  try {
    const res = await fetch(`/api/quote/${formattedCode}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        return data.data;
      }
    }
  } catch (err) {
    // 后端代理遇到网络抖动
  }

  // 2. 降级直连尝试 (部分浏览器或客户端支持直连)，安全捕获失败避免阻断业务
  try {
    const res = await fetch(`https://qt.gtimg.cn/q=${formattedCode}`, { mode: 'cors' }).catch(() => null);
    if (res && res.ok) {
      const buffer = await res.arrayBuffer();
      const text = new TextDecoder('gbk').decode(buffer);
      const quote = parseClientTencentQuote(text);
      if (quote) return quote;
    }
  } catch {
    // 跨域或网络受限时静默降级为模拟行情
  }

  return null;
}

/**
 * 批量查询多只股票当天真实实时股价
 */
export async function fetchBatchRealtimeQuotes(codes: string[]): Promise<Record<string, RealtimeQuote>> {
  if (codes.length === 0) return {};

  const cleanCodes = Array.from(new Set(codes.map((c) => c.replace(/\D/g, '')).filter(Boolean)));
  const results: Record<string, RealtimeQuote> = {};

  // 限制单批最多 80 只，分批请求
  const chunkSize = 80;
  for (let i = 0; i < cleanCodes.length; i += chunkSize) {
    const batch = cleanCodes.slice(i, i + chunkSize);
    let chunkSucceeded = false;

    // 1. 优先调用后端 Express 代理路由 /api/quotes
    try {
      const res = await fetch(`/api/quotes?codes=${batch.join(',')}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          Object.assign(results, json.data);
          chunkSucceeded = true;
          continue;
        }
      }
    } catch {
      // API 请求发生异常
    }

    // 2. 若后端代理未获取到，尝试直接请求客户端源 (若客户端因跨域报错则安全捕获，不抛出异常)
    if (!chunkSucceeded) {
      try {
        const formattedBatch = batch.map(formatCodeWithPrefix);
        const res = await fetch(`https://qt.gtimg.cn/q=${formattedBatch.join(',')}`, { mode: 'cors' }).catch(() => null);
        if (res && res.ok) {
          const buffer = await res.arrayBuffer();
          const text = new TextDecoder('gbk').decode(buffer);
          const lines = text.trim().split(';').filter((l) => l.trim().length > 0);
          for (const line of lines) {
            const q = parseClientTencentQuote(line);
            if (q && q.code) {
              results[q.code] = q;
            }
          }
        }
      } catch {
        // 静默捕获，上层会自动降级使用真实基准或微波动模拟行情
      }
    }
  }

  return results;
}

/**
 * 将真实行情数据注入到 Stock 实体中，并即时重新计算最新的静态与 TTM 股息率
 */
export function applyRealtimeQuoteToStock(stock: Stock, quote: RealtimeQuote): Stock {
  if (!quote || quote.price <= 0) return stock;

  const realPrice = quote.price;
  const prevPrice = stock.price || quote.prevClose || realPrice;

  // 根据当天真实股价重新精确计算股息率
  const newTtmYield = +( (stock.ttmDividendPerShare / realPrice) * 100 ).toFixed(2);
  const newStaticYield = +( (stock.lastYearDividendPerShare / realPrice) * 100 ).toFixed(2);

  // 估值更新 (若有官方真实 PE 则优先采用，否则根据现价比例动态修正)
  const newPE = quote.pe > 0 ? +quote.pe.toFixed(2) : +(stock.pe * (realPrice / prevPrice)).toFixed(2);
  const newPB = quote.pb > 0 ? +quote.pb.toFixed(2) : +(stock.pb * (realPrice / prevPrice)).toFixed(2);
  const newMarketCap = quote.marketCap > 0 ? +quote.marketCap.toFixed(2) : +(stock.marketCap * (realPrice / prevPrice)).toFixed(2);

  return {
    ...stock,
    price: realPrice,
    prevClose: quote.prevClose || stock.prevClose,
    change: quote.change,
    changePercent: quote.changePercent,
    ttmDividendYield: newTtmYield,
    staticDividendYield: newStaticYield,
    pe: newPE,
    pb: newPB,
    marketCap: newMarketCap,
    updateTime: quote.updateTime || stock.updateTime
  };
}

/**
 * 获取当前 A 股交易盘口状态
 */
export function getTradingStatus(): {
  status: 'TRADING' | 'CLOSED' | 'PRE_MARKET' | 'LUNCH_BREAK' | 'WEEKEND';
  label: string;
  color: string;
  badgeClass: string;
} {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 6 is Saturday
  
  if (day === 0 || day === 6) {
    return {
      status: 'WEEKEND',
      label: '周末休市 (已锁定最近收盘价)',
      color: 'text-slate-400',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700'
    };
  }

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeNum = hours * 100 + minutes;

  if (timeNum < 915) {
    return {
      status: 'PRE_MARKET',
      label: '盘前阶段 (显示前一交易日收盘价)',
      color: 'text-amber-400',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    };
  } else if (timeNum >= 915 && timeNum < 930) {
    return {
      status: 'PRE_MARKET',
      label: '集合竞价中',
      color: 'text-amber-400',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    };
  } else if (timeNum >= 930 && timeNum <= 1130) {
    return {
      status: 'TRADING',
      label: '实盘交易中 (早盘实时跳动)',
      color: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse'
    };
  } else if (timeNum > 1130 && timeNum < 1300) {
    return {
      status: 'LUNCH_BREAK',
      label: '午间休市 (显示早盘收盘价)',
      color: 'text-indigo-400',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    };
  } else if (timeNum >= 1300 && timeNum <= 1500) {
    return {
      status: 'TRADING',
      label: '实盘交易中 (午盘实时跳动)',
      color: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse'
    };
  } else {
    return {
      status: 'CLOSED',
      label: '已收盘 (锁定今日真实收盘价)',
      color: 'text-rose-400',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    };
  }
}
