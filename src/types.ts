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

export interface PEHistoryPoint {
  month: string;            // 月份标签, e.g. "2023-09" 或 "23/09"
  pe: number;               // 滚动市盈率 PE(TTM)
  dividendYield: number;    // 对应滚动股息率 %
  price: number;            // 对应月末收盘价 (元)
}

export interface YearlyDividendPoint {
  year: number;             // 年份
  yearLabel: string;        // 年份标签 e.g. "2023年"
  dividendPerShare: number; // 每股派息 (元)
  dividendYield: number;    // 当年股息率 (%)
  payoutRatio: number;      // 股利支付率 (%)
  cashTotal: number;        // 分红总额 (亿元)
  scheme: string;           // 派息方案
  growthRate?: number;      // 每股派息同比增速 (%)
}

export interface DividendSustainabilityEvaluation {
  points: YearlyDividendPoint[];
  threeYearAvgYield: number;       // 近3年平均股息率 (%)
  threeYearAvgPayoutRatio: number; // 近3年平均股利支付率 (%)
  dpsCAGR: number;                 // 近3年每股分红复合年均增长率 CAGR (%)
  consecutiveYears: number;        // 连续分红年数
  stabilityScore: number;          // 稳定性得分 0~100
  sustainabilityGrade: 'S' | 'A' | 'B' | 'C'; // 评级: S卓越 / A良好 / B周期 / C警惕
  gradeLabel: string;              // 卓越稳健 / 稳健良好 / 周期波动 / 需警惕
  gradeColor: string;              // 样式
  payoutHealthStatus: 'healthy' | 'overpaid' | 'underpaid'; // 健康 / 激进透支 / 偏低
  diagnosisItems: {
    title: string;
    status: 'good' | 'warning' | 'neutral';
    desc: string;
  }[];
  expertSummary: string;
}

export interface Stock {
  code: string;             // 股票代码, e.g. "600036"
  name: string;             // 股票简称, e.g. "招商银行"
  alias?: string;           // 别名/常用曾用名/简称, e.g. "华能蒙电,招行"
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
  pePercentile?: number;            // 近5年PE历史分位数 % (0~100, 越低越低估便宜)
  pePercentile1Y?: number;          // 近1年PE历史分位数 %
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
  isCustom?: boolean;               // 是否为用户自定义导入/添加的股票
  
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
  peHistory?: PEHistoryPoint[];     // 过去12个月PE滚动估值与股息率月度走势
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
  
  // 行业与板块分类
  selectedIndustries: string[];         // 选中的行业，空数组表示全部行业
  selectedMarkets?: ('SH' | 'SZ' | 'BJ')[]; // 沪/深/京交易所筛选
  selectedBoards?: string[];            // 沪市主板/深市主板/创业板/科创板/北交所筛选
  
  // 质地扩展条件
  minMarketCap: number;                 // 最低市值 (亿元, 0表示不限)
  minROE: number;                       // 最低ROE (%)
  minDividendYears: number;             // 连续分红年数 (0, 3, 5, 10)
  minNetProfitGrowth?: number;          // 最低净利增速 (%)
  
  // 关键词检索
  searchQuery: string;                  // 代码 / 名称 / 拼音
  searchBypassFilters?: boolean;        // 搜索时是否忽略其他过滤条件 (直接展示命中搜索的标的，默认 true)
}

export type StockValuationStatus = '低估' | '正常' | '高估';

export type SortField = 
  | 'leaderScore'
  | 'ttmDividendYield'
  | 'staticDividendYield'
  | 'pe'
  | 'pePercentile'
  | 'pb'
  | 'valuation'
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

export interface DividendAnomalyAlert {
  id: string;
  stockCode: string;
  stockName: string;
  industry: string;
  timestamp: string;
  currentPrice: number;
  priceChangePercent: number; // 股价涨跌幅 %
  baseYield: number;          // 变动前/昨收基准股息率 %
  currentYield: number;       // 当前盘中股息率 %
  yieldChangePercent: number; // 股息率相对变动幅度 % (+10.5% / -11.2%)
  direction: 'surge' | 'plunge'; // surge: 股息率飙升 (股价急跌); plunge: 股息率骤降 (股价急涨)
  reason: string;             // 异动归因分析
  read?: boolean;             // 是否已读
}

export interface FiveYearPEValuationCushion {
  currentPE: number;                  // 当前滚动市盈率 PE-TTM
  fiveYearMinPE: number;              // 近五年最低 PE
  fiveYearMaxPE: number;              // 近五年最高 PE
  fiveYearAvgPE: number;              // 近五年均值 PE
  fiveYearMedianPE: number;           // 近五年中位数 PE
  fiveYearPercentile: number;         // 近五年历史PE分位数 % (0% ~ 100%)
  cushionPercent: number;             // 估值安全垫百分比 % (0% ~ 100%)
  cushionGrade: 'extreme' | 'high' | 'medium' | 'low' | 'tight'; // 安全垫厚度等级
  cushionGradeLabel: string;          // 极厚安全垫 / 充足安全垫 / 中等安全垫 / 较薄安全垫 / 估值溢价预警
  cushionFormulaDescription: string;  // 安全垫计算推导逻辑
  repairPotentialPercent: number;     // 若估值修复至5年中枢均值的潜在空间 %
  safetyMarginStatus: 'strong' | 'moderate' | 'weak';
  historySamplePoints: {
    year: string;
    pe: number;
  }[];
}

export interface BuyOpportunityEvaluation {
  score: number;                   // 综合买入机会评分 0 ~ 100
  grade: 'S' | 'A' | 'B' | 'C';    // 机会评级: S (极佳 90-100) | A (良好 75-89) | B (中性 60-74) | C (谨慎 <60)
  gradeLabel: string;              // 评级标签
  actionAdvice: string;            // 操作建议
  timingTag: string;               // 核心时机标签
  factors: {
    pePercentileScore: number;     // PE低估分位得分 (权重40%)
    pePercentile: number;          // 实际分位数 %
    dividendYieldScore: number;    // 股息率吸引力得分 (权重30%)
    actualYield: number;           // 实际滚动股息率 %
    meanDeviationScore: number;    // 均值折价弹性得分 (权重15%)
    discountToMean: number;        // 较1年PE均值折价/溢价率 %
    qualityDefenseScore: number;   // 盈利质量与防御得分 (权重15%)
    roe: number;                   // 实际ROE %
  };
  summary: string;                 // 决策结论
}

export interface IndustryRadarDimension {
  dimension: '股息率' | 'PE估值' | 'ROE水平' | '成长增速';
  stockValue: number;
  industryAvg: number;
  unit: string;
  diff: number;           // stockValue - industryAvg
  diffPercent: number;    // % difference
  status: 'superior' | 'inferior' | 'neutral'; // superior: 优于行业; inferior: 落后行业; neutral: 持平
  stockRadarScore: number;    // 0~100 normalized score for radar
  industryRadarScore: number; // 0~100 normalized score for radar
  evaluation: string;         // 简评
}

export interface IndustryComparisonResult {
  industryName: string;
  stockCount: number;
  dimensions: IndustryRadarDimension[];
  radarData: {
    dimension: string;
    stockScore: number;
    industryScore: number;
    stockRaw: string;
    industryRaw: string;
    unit: string;
    advantageText: string;
    status: 'superior' | 'inferior' | 'neutral';
  }[];
  superiorCount: number;      // 领先维度数 (0~4)
  overallVerdict: string;     // 总体相对优势结论
  leaderAdvantageTitle: string;
}

export interface TargetDividendWatchItem {
  code: string;
  name?: string;
  targetYield?: number;         // 理想目标股息率 %, 例如 5.5, 6.0
  targetDividendYield?: number; // 兼容别名
  notes?: string;               // 备选备注
  customNote?: string;          // 兼容别名
  addedAt?: string;             // 加入时间
}

export interface RobustBuySafetyProfile {
  safeBuyPrice: number;            // 三维加权稳妥买入安全价 (元)
  isSafeReached: boolean;          // 现价是否已落入稳妥买入区间 (现价 <= 稳妥安全价)
  safeDropNeededPercent: number;   // 距稳妥买入价需跌空间 %
  safetyMarginScore: number;       // 综合安全边际指数 (0~100)
  cushionGradeLabel: string;       // 估值安全垫等级 (如: 极厚安全垫·5年极限底)
  threeAnchors: {
    dividendAnchorPrice: number;   // 锚点1: 理想股息率目标现金流价 (元)
    peFloorAnchorPrice: number;    // 锚点2: 5年PE历史20%极低分位估值底价 (元)
    pbAssetAnchorPrice: number;    // 锚点3: 资产净资产PB安全锚价 (元)
  };
  sustainabilityGrade: 'S' | 'A' | 'B' | 'C'; // 分红可持续性评级 (防范高息陷阱)
  sustainabilityLabel: string;
  verdictTag: string;              // 简评结论 (如: 双底共振·极佳安全买点)
  verdictDescription: string;      // 深度量化逻辑解读
  threeTranches: {
    observePrice: number;          // 第一档·底仓观察价 (建立20%~30%底仓)
    comfortPrice: number;          // 第二档·舒适加仓价 (核心建仓40%~50%)
    extremePrice: number;          // 第三档·极限重仓价 (极限防御20%~30%)
  };
}

export interface TargetDividendCalculatedStock {
  stock: Stock;
  targetYield: number;          // 理想股息率 % (如 5.5%)
  currentPrice: number;         // 实时现价 (元)
  currentYield: number;         // 实时滚动股息率 %
  dividendPerShare: number;     // 每股派息基准 (元/股)
  dividendBase: number;         // 别名
  targetPrice: number;          // 目标买入价位 (元) = 每股分红 / (理想股息率/100)
  dropNeededPercent: number;    // 需跌百分比 % (例如 -15.2% 表示现价需下跌15.2%到达买入价; 0%表示已达标)
  diffPrice: number;            // 距目标价差额 (现价 - 目标价, 元)
  isReached: boolean;           // 是否已达标 (现价 <= 目标价)
  targetPE: number;             // 到达目标价时的市盈率 PE
  targetMarketCap: number;      // 到达目标价时的总市值 (亿元)
  status: 'reached' | 'close' | 'moderate' | 'deep';
  statusLabel: string;
  statusBadgeColor: {
    bg: string;
    text: string;
    border: string;
  };
  // 新增：三维加权「稳妥买入安全价」量化档案
  robustProfile?: RobustBuySafetyProfile;
}

export interface UserSession {
  isLoggedIn: boolean;
  loginMethod: 'wechat' | 'email';
  userId: string;
  name: string;
  avatar: string;
  account: string; // e.g. 微信号或邮箱
  email?: string;
  wechatNickname?: string;
  loginAt: string;
  role: 'VIP会员' | '实名认证用户' | 'VIP会员 (公众号已关注)' | 'VIP会员 (邮箱认证)' | string;
}
