export type DividendYieldType = 'ttm' | 'static' | 'both';

export interface DividendHistoryItem {
  year: number;
  dividendPerShare: number; // 每股派息 (元, 税前)
  dividendYield: number;    // 当年分红股息率 %
  payoutRatio: number;      // 股利支付率 % (分红占净利润比例)
  cashTotal: number;        // 分红总额 (亿元)
  scheme: string;           // 分红方案说明 e.g. "10派19.72元"
}

export interface FinancialQuarter {
  quarter: string;          // e.g. "2024Q3", "2024Q2"
  revenue: number;          // 营业收入 (亿元)
  netProfit: number;        // 归母净利润 (亿元)
  roe: number;              // 年化ROE %
}

export interface Stock {
  code: string;             // 股票代码, e.g. "600036"
  name: string;             // 股票简称, e.g. "招商银行"
  pinyin: string;           // 拼音简写, e.g. "ZSYH"
  industry: string;         // 申万一级行业, e.g. "银行"
  market: 'SH' | 'SZ' | 'BJ';// 交易所
  price: number;            // 实时现价 (元)
  change: number;           // 涨跌额
  changePercent: number;    // 涨跌幅 %
  prevClose: number;        // 昨收价
  
  // 股息核心指标
  lastYearDividendPerShare: number; // 上年度每股分红总额 (元) - 静态计算基准
  ttmDividendPerShare: number;      // 过去12个月每股分红总额 (元) - 滚动计算基准
  staticDividendYield: number;      // 静态股息率 % = 上年度每股分红 / 现价 * 100
  ttmDividendYield: number;         // 滚动股息率(TTM) % = 过去12个月每股分红 / 现价 * 100
  dividendYears: number;            // 连续分红年数
  payoutRatio: number;              // 股利支付率 %
  dividendCycle: string;            // 分红频次: "年度分红" | "半年分红+年度" | "季度分红"
  
  // 估值与财务指标
  pe: number;                       // 市盈率 (PE-TTM)
  pb: number;                       // 市净率 (PB)
  marketCap: number;                // 总市值 (亿元)
  roe: number;                      // 净资产收益率 (ROE, %)
  revGrowth: number;                // 营业收入同比增速 (%)
  netProfitGrowth: number;          // 归母净利润同比增速 (%)
  
  // 特殊状态标签
  isST: boolean;                    // 是否 ST/*ST 股
  isDelisted: boolean;              // 是否退市/风险警示
  isLeader: boolean;                // 是否为行业龙头标杆
  isAristocrat: boolean;            // 是否为连续分红>10年红利贵族
  
  // 综合得分 (在筛选结果集中动态归一化加权计算)
  normMarketCap?: number;           // 归一化市值分 (0~100)
  normROE?: number;                 // 归一化ROE分 (0~100)
  normRevGrowth?: number;           // 归一化营收增速分 (0~100)
  normNetProfitGrowth?: number;     // 归一化净利增速分 (0~100)
  leaderScore?: number;             // 龙头综合分 (0~100)
  
  // 深度档案
  description: string;              // 主营业务简述
  dividendAdvantage: string;        // 高股息与分红护城河亮点
  history: DividendHistoryItem[];   // 近5-8年分红历史
  quarterly: FinancialQuarter[];    // 近期财务趋势
  updateTime: string;               // 行情更新时间戳
}

export interface FilterCriteria {
  // 股息率筛选
  dividendYieldType: DividendYieldType; // 'ttm' | 'static' | 'both'
  minDividendYield: number;             // 默认 3.0%
  maxDividendYield?: number;
  
  // 估值筛选
  maxPE: number;                        // 默认 20
  minPE?: number;
  maxPB?: number;
  
  // 股票类别排除
  excludeST: boolean;                   // 默认排除 ST / *ST
  excludeDelisted: boolean;             // 默认排除退市整理期
  
  // 行业分类
  selectedIndustries: string[];         // 选中的行业，空数组表示全部行业
  
  // 质地扩展条件
  minMarketCap: number;                 // 最低市值 (亿元, 0表示不限)
  minROE: number;                       // 最低ROE (%)
  minDividendYears: number;             // 连续分红年数 (0, 3, 5, 10)
  minNetProfitGrowth?: number;          // 最低净利增速 (%)
  
  // 关键词检索
  searchQuery: string;                  // 代码 / 名称 / 拼音
}

export type SortField = 
  | 'leaderScore'
  | 'ttmDividendYield'
  | 'staticDividendYield'
  | 'pe'
  | 'pb'
  | 'marketCap'
  | 'roe'
  | 'revGrowth'
  | 'netProfitGrowth'
  | 'price'
  | 'changePercent'
  | 'dividendYears';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface StrategyPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  iconName: string;
  criteria: Partial<FilterCriteria>;
}
