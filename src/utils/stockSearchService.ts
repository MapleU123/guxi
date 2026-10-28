import { Stock } from '../types';
import { COMPREHENSIVE_A_SHARE_DATABASE, generateDynamicStockProfile } from '../data/allASharesDictionary';
import { fetchRealtimeQuote, applyRealtimeQuoteToStock, RealtimeQuote } from './realtimeQuoteService';

export interface SearchResultItem {
  code: string;
  name: string;
  industry?: string;
  pinyin?: string;
  market: 'SH' | 'SZ' | 'BJ';
  type?: string;
  fullCode?: string;
  existsInLocalPool?: boolean;
  stock?: Stock;
}

// 缓存搜索结果减少频繁网络开销
const searchCache = new Map<string, SearchResultItem[]>();

/**
 * 在线全A股检索 + 本地精选池混合快速搜索
 * 支持：中文名称（如 赤天化、宝泰隆、陕西黑猫、同仁堂、大族激光）、拼音简拼（如 cth、btl、sxhm、trt、dzjg）、6位代码
 */
export async function searchAllAShares(
  query: string,
  localStocks: Stock[] = []
): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];

  const upperQ = q.toUpperCase();
  const resultMap = new Map<string, SearchResultItem>();

  // 1. 本地当前观察池优先检索
  localStocks.forEach((s) => {
    const matchCode = s.code.toUpperCase().includes(upperQ);
    const matchName = s.name.toUpperCase().includes(upperQ);
    const matchAlias = s.alias ? s.alias.toUpperCase().includes(upperQ) : false;
    const matchPinyin = s.pinyin ? s.pinyin.toUpperCase().includes(upperQ) : false;
    if (matchCode || matchName || matchAlias || matchPinyin) {
      resultMap.set(s.code, {
        code: s.code,
        name: s.name,
        industry: s.industry,
        pinyin: s.pinyin,
        market: s.market,
        existsInLocalPool: true,
        stock: s
      });
    }
  });

  // 2. 本地精选大字典检索
  COMPREHENSIVE_A_SHARE_DATABASE.forEach((s) => {
    if (!resultMap.has(s.code)) {
      const matchCode = s.code.toUpperCase().includes(upperQ);
      const matchName = s.name.toUpperCase().includes(upperQ);
      const matchAlias = s.alias ? s.alias.toUpperCase().includes(upperQ) : false;
      const matchPinyin = s.pinyin ? s.pinyin.toUpperCase().includes(upperQ) : false;
      if (matchCode || matchName || matchAlias || matchPinyin) {
        resultMap.set(s.code, {
          code: s.code,
          name: s.name,
          industry: s.industry,
          pinyin: s.pinyin,
          market: s.market,
          existsInLocalPool: localStocks.some((ls) => ls.code === s.code),
          stock: s
        });
      }
    }
  });

  // 3. 若缓存命中则优先使用
  if (searchCache.has(upperQ)) {
    const cached = searchCache.get(upperQ)!;
    cached.forEach((item) => {
      if (!resultMap.has(item.code)) {
        resultMap.set(item.code, {
          ...item,
          existsInLocalPool: localStocks.some((ls) => ls.code === item.code)
        });
      }
    });
    return Array.from(resultMap.values()).slice(0, 10);
  }

  // 4. 调用后端 /api/search 查询全市场 5000+ 真实股票池
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const fetchedItems: SearchResultItem[] = [];
        json.data.forEach((item: any) => {
          const code = String(item.code || '').trim();
          if (!code) return;

          const existsInLocal = localStocks.some((ls) => ls.code === code);
          const foundInDb = COMPREHENSIVE_A_SHARE_DATABASE.find((db) => db.code === code);

          const resultItem: SearchResultItem = {
            code,
            name: item.name,
            pinyin: item.pinyin,
            market: item.market || (code.startsWith('6') ? 'SH' : code.startsWith('8') ? 'BJ' : 'SZ'),
            type: item.type,
            fullCode: item.fullCode,
            existsInLocalPool: existsInLocal,
            stock: foundInDb
          };

          fetchedItems.push(resultItem);

          if (!resultMap.has(code)) {
            resultMap.set(code, resultItem);
          }
        });

        searchCache.set(upperQ, fetchedItems);
      }
    }
  } catch (err) {
    console.warn('Online smart search fallback to local:', err);
  }

  return Array.from(resultMap.values()).slice(0, 10);
}

/**
 * 穿透获取或构建单只 A 股股票完整实体（包含实时行情、估值、分红画像）
 */
export async function fetchOrBuildStock(
  code: string,
  nameGuess?: string
): Promise<Stock> {
  const cleanCode = code.replace(/\D/g, '');
  
  // 1. 先尝试获取交易所当日真实行情
  let realQuote: RealtimeQuote | null = null;
  try {
    realQuote = await fetchRealtimeQuote(cleanCode);
  } catch (err) {
    console.warn(`Failed to fetch live quote for ${cleanCode}:`, err);
  }

  // 2. 检查静态精选库是否有该标的画像
  const dbStock = COMPREHENSIVE_A_SHARE_DATABASE.find((s) => s.code === cleanCode);
  if (dbStock) {
    if (realQuote) {
      return applyRealtimeQuoteToStock(dbStock, realQuote);
    }
    return { ...dbStock, isCustom: true };
  }

  // 3. 动态组装生成全 A 股完整画像
  return generateDynamicStockProfile(cleanCode, realQuote, nameGuess || realQuote?.name);
}
