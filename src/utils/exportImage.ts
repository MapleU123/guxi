import { Stock, FilterCriteria, TargetDividendCalculatedStock } from '../types';
import whiteThreeSoldiersImg from '../assets/images/kline_white_soldiers_1787370191402.jpg';
import whiteGoldTrendImg from '../assets/images/kline_white_trend_1787370206165.jpg';
import whiteIso3dImg from '../assets/images/kline_white_iso3d_1787370223580.jpg';
import threeSoldiersImg from '../assets/images/kline_three_red_soldiers_1787369799068.jpg';
import goldTrendKlineImg from '../assets/images/kline_gold_trend_1787369813990.jpg';
import iso3dKlineImg from '../assets/images/kline_isometric_3d_1787369825191.jpg';
import minimalFintechImg from '../assets/images/kline_minimal_fintech_1787369837673.jpg';
import finBullImg from '../assets/images/fin_gold_logo_1787369381609.jpg';
import { AvatarStyle } from '../components/AvatarSelectorModal';
import { getStockValuationStatus } from './calculator';

export type { AvatarStyle };

export interface ImageExportOptions {
  theme?: 'dark' | 'light' | 'wine';
  title?: string;
  subtitle?: string;
  watermark?: boolean;
  scale?: number; // 2 for Retina 2x crispness
  criteria?: FilterCriteria;
  avatarStyle?: AvatarStyle;
}

/**
 * 常用策略标题预设推荐标签
 */
export const STRATEGY_TITLE_PRESETS = [
  '红利龙头核心池',
  '十年红利贵族',
  '超高股息精选',
  '破净高股息价值池',
  '高成长红利兼备',
  '高息央国企白马池',
  '标准高股息核心池'
];

/**
 * 智能根据筛选条件推导策略标题与副标题描述
 */
export function getSuggestedStrategyTitle(
  criteria?: FilterCriteria,
  defaultFallback: string = '高股息优质公司估值清单'
): { title: string; subtitle: string; presetKey?: string } {
  if (!criteria) {
    return {
      title: defaultFallback,
      subtitle: '基于股息率、估值安全垫与龙头综合加权引擎'
    };
  }

  // 1. 匹配红利龙头核心池
  if (
    criteria.minMarketCap >= 400 &&
    criteria.minROE >= 8 &&
    criteria.minDividendYield >= 3.5 &&
    criteria.maxPE <= 16
  ) {
    return {
      title: '红利龙头核心池',
      subtitle: `市值≥${criteria.minMarketCap}亿 · ROE≥${criteria.minROE}% · 股息率≥${criteria.minDividendYield}% · PE≤${criteria.maxPE}`,
      presetKey: 'leader_core'
    };
  }

  // 2. 匹配十年红利贵族
  if (criteria.minDividendYears >= 10) {
    return {
      title: '十年红利贵族',
      subtitle: `连续稳定分红≥10年 · 股息率≥${criteria.minDividendYield}% · PE≤${criteria.maxPE}`,
      presetKey: 'aristocrat'
    };
  }

  // 3. 匹配超高股息精选
  if (criteria.minDividendYield >= 5.0 && criteria.maxPE <= 14) {
    return {
      title: '超高股息精选池',
      subtitle: `滚动股息率≥${criteria.minDividendYield}% · PE≤${criteria.maxPE} · 极致现金流回报`,
      presetKey: 'super_yield'
    };
  }

  // 4. 匹配高成长红利兼备
  if ((criteria.minNetProfitGrowth || 0) >= 5 && criteria.minROE >= 10) {
    return {
      title: '高成长红利兼备池',
      subtitle: `净利增速≥${criteria.minNetProfitGrowth}% · ROE≥${criteria.minROE}% · 股息率≥${criteria.minDividendYield}%`,
      presetKey: 'growth_dividend'
    };
  }

  // 5. 行业专属池
  if (criteria.selectedIndustries && criteria.selectedIndustries.length > 0 && criteria.selectedIndustries.length <= 3) {
    const indNames = criteria.selectedIndustries.join('·');
    return {
      title: `${indNames}高股息精选池`,
      subtitle: `行业: ${indNames} · 股息率≥${criteria.minDividendYield}% · PE≤${criteria.maxPE}`
    };
  }

  // 6. 自定义 PE 与 股息率 筛选条件组合推导
  if (criteria.minDividendYield > 0 || criteria.maxPE < 100 || criteria.minDividendYears > 0 || criteria.minMarketCap > 0) {
    const parts: string[] = [];
    if (criteria.minDividendYield > 0) parts.push(`股息率≥${criteria.minDividendYield}%`);
    if (criteria.maxPE < 100) parts.push(`PE≤${criteria.maxPE}`);
    if (criteria.minDividendYears > 0) parts.push(`分红≥${criteria.minDividendYears}年`);
    if (criteria.minMarketCap > 0) parts.push(`市值≥${criteria.minMarketCap}亿`);
    if (criteria.minROE > 0) parts.push(`ROE≥${criteria.minROE}%`);
    
    return {
      title: `${parts.slice(0, 2).join(' · ')} 精选股票池`,
      subtitle: `筛选条件：${parts.join(' · ')}`
    };
  }

  return {
    title: '标准高股息核心池',
    subtitle: '股息率≥3.0% · PE≤20 · 排除ST与退市风险标的'
  };
}

/**
 * 绘制高分辨率财务表格图片（支持纯白底头像与股票估值情况列）
 */
export async function renderStockTableToCanvas(
  stocks: Stock[],
  options: ImageExportOptions = {}
): Promise<HTMLCanvasElement> {
  const {
    theme = 'dark',
    title = '高股息优质公司更新汇总',
    subtitle = '基于股息率、估值安全垫与龙头综合加权引擎',
    watermark = true,
    scale = 2,
    criteria,
    avatarStyle = 'whiteThreeSoldiers'
  } = options;

  // 预加载所选头像图片
  let activeAvatarSrc: string | null = null;
  if (avatarStyle === 'whiteThreeSoldiers') activeAvatarSrc = whiteThreeSoldiersImg;
  else if (avatarStyle === 'whiteGoldTrend') activeAvatarSrc = whiteGoldTrendImg;
  else if (avatarStyle === 'whiteIso3d') activeAvatarSrc = whiteIso3dImg;
  else if (avatarStyle === 'threeSoldiers') activeAvatarSrc = threeSoldiersImg;
  else if (avatarStyle === 'goldTrendKline') activeAvatarSrc = goldTrendKlineImg;
  else if (avatarStyle === 'iso3dKline') activeAvatarSrc = iso3dKlineImg;
  else if (avatarStyle === 'minimalFintech') activeAvatarSrc = minimalFintechImg;
  else if (avatarStyle === 'goldBull') activeAvatarSrc = finBullImg;

  let loadedAvatarImg: HTMLImageElement | null = null;
  if (activeAvatarSrc) {
    loadedAvatarImg = new Image();
    loadedAvatarImg.src = activeAvatarSrc;
    if (!loadedAvatarImg.complete) {
      await new Promise((resolve) => {
        if (!loadedAvatarImg) return resolve(false);
        loadedAvatarImg.onload = () => resolve(true);
        loadedAvatarImg.onerror = () => resolve(false);
      });
    }
  }

  // 1. 颜色与样式主题配置
  const isDark = theme === 'dark';
  const isWine = theme === 'wine';

  const colors = isDark
    ? {
        bg: '#090d16',
        cardBg: '#0f172a',
        headerBg: '#1e293b',
        altRowBg: '#0c1322',
        border: '#1e293b',
        title: '#f8fafc',
        subtitle: '#94a3b8',
        text: '#cbd5e1',
        textMuted: '#64748b',
        accentGold: '#fbbf24',
        accentRose: '#f43f5e',
        accentCyan: '#06b6d4',
        accentGreen: '#10b981',
        tableHeaderBg: '#131c2e',
        tableHeaderText: '#94a3b8',
        tagBg: '#1e293b',
        tagText: '#38bdf8'
      }
    : isWine
    ? {
        bg: '#150a10',
        cardBg: '#1f1019',
        headerBg: '#2d1424',
        altRowBg: '#190d14',
        border: '#3b1d30',
        title: '#fff1f2',
        subtitle: '#fda4af',
        text: '#fecdd3',
        textMuted: '#9f7282',
        accentGold: '#fbbf24',
        accentRose: '#fb7185',
        accentCyan: '#38bdf8',
        accentGreen: '#34d399',
        tableHeaderBg: '#291220',
        tableHeaderText: '#fda4af',
        tagBg: '#3b1d30',
        tagText: '#f43f5e'
      }
    : {
        bg: '#f8fafc',
        cardBg: '#ffffff',
        headerBg: '#f1f5f9',
        altRowBg: '#f8fafc',
        border: '#e2e8f0',
        title: '#0f172a',
        subtitle: '#64748b',
        text: '#334155',
        textMuted: '#94a3b8',
        accentGold: '#d97706',
        accentRose: '#e11d48',
        accentCyan: '#0284c7',
        accentGreen: '#059669',
        tableHeaderBg: '#f1f5f9',
        tableHeaderText: '#475569',
        tagBg: '#e2e8f0',
        tagText: '#0369a1'
      };

  // 2. 确定列宽配置 (基准像素，未乘 scale)
  // 用户指定字段：序号、股票名称、所属行业、股价、PE、PB、股息率（ATM）、连续分红年限、评分
  const columns = [
    { key: 'index', label: '序号', width: 65, align: 'center' },
    { key: 'name', label: '股票名称', width: 175, align: 'left' },
    { key: 'industry', label: '所属行业', width: 110, align: 'center' },
    { key: 'price', label: '股价(元)', width: 105, align: 'right' },
    { key: 'pe', label: 'PE', width: 90, align: 'right' },
    { key: 'pb', label: 'PB', width: 90, align: 'right' },
    { key: 'dividendYield', label: '股息率(ATM)', width: 130, align: 'right' },
    { key: 'dividendYears', label: '连续分红年限', width: 125, align: 'center' },
    { key: 'score', label: '评分', width: 95, align: 'right' }
  ];

  const totalTableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const paddingX = 40;
  const canvasWidth = totalTableWidth + paddingX * 2;

  // 3. 计算高度
  const headerHeight = 150;
  const tableHeaderRowHeight = 44;
  const rowHeight = 46;
  const footerHeight = 80;
  const canvasHeight = headerHeight + tableHeaderRowHeight + (stocks.length * rowHeight) + footerHeight;

  // 4. 创建并缩放 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  ctx.scale(scale, scale);

  // 字体配置辅助
  const fontRegular = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif';
  const fontMono = '"SF Pro Text", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';

  // 5. 绘制总背景
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 6. 绘制内容卡片背景（圆角外框）
  const cardX = paddingX - 10;
  const cardY = 24;
  const cardWidth = totalTableWidth + 20;
  const cardHeight = canvasHeight - 48;
  const radius = 16;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cardX + radius, cardY);
  ctx.lineTo(cardX + cardWidth - radius, cardY);
  ctx.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + radius);
  ctx.lineTo(cardX + cardWidth, cardY + cardHeight - radius);
  ctx.quadraticCurveTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - radius, cardY + cardHeight);
  ctx.lineTo(cardX + radius, cardY + cardHeight);
  ctx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - radius);
  ctx.lineTo(cardX, cardY + radius);
  ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
  ctx.closePath();

  ctx.fillStyle = colors.cardBg;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.border;
  ctx.stroke();
  ctx.restore();

  // 7. 绘制顶部 Header 区域
  let currentY = 48;

  // 顶部 Logo 标识与主标题 (头像容器设置为纯白底色 bg-white)
  ctx.save();
  const badgeX = paddingX + 10;
  const badgeY = currentY - 6;
  const badgeSize = 36;

  // 1) 先绘制纯白背景圆形底座
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 9);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // 2) 绘制所选金融专属头像图片或经典红字
  if (loadedAvatarImg && loadedAvatarImg.complete && loadedAvatarImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(badgeX + 1, badgeY + 1, badgeSize - 2, badgeSize - 2, 8);
    ctx.clip();
    ctx.drawImage(loadedAvatarImg, badgeX + 1, badgeY + 1, badgeSize - 2, badgeSize - 2);
    ctx.restore();
    
    // 金色微光外边框
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 9);
    ctx.stroke();
  } else {
    // 绘制经典红利“红”字渐变徽标 (白底衬托)
    const grad = ctx.createLinearGradient(badgeX + 2, badgeY + 2, badgeX + badgeSize - 2, badgeY + badgeSize - 2);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(1, '#e11d48');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(badgeX + 3, badgeY + 3, badgeSize - 6, badgeSize - 6, 7);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 18px ${fontRegular}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('红', badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 1);
  }

  // 主标题
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold 22px ${fontRegular}`;
  ctx.fillStyle = colors.title;
  ctx.fillText(title, badgeX + badgeSize + 14, currentY + 16);

  // 副标题
  ctx.font = `12px ${fontRegular}`;
  ctx.fillStyle = colors.subtitle;
  ctx.fillText(subtitle, badgeX + badgeSize + 14, currentY + 36);

  // 统计信息标签 (右上角)
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  ctx.textAlign = 'right';
  ctx.font = `bold 12px ${fontMono}`;
  ctx.fillStyle = colors.accentGold;
  ctx.fillText(`筛选标的总数: ${stocks.length} 只`, canvasWidth - paddingX - 10, currentY + 14);

  ctx.font = `11px ${fontMono}`;
  ctx.fillStyle = colors.textMuted;
  ctx.fillText(`导出时间: ${dateStr}`, canvasWidth - paddingX - 10, currentY + 34);
  ctx.restore();

  // 筛选条件摘要栏
  currentY += 46;
  const tagBoxX = paddingX + 10;
  const tagBoxY = currentY;
  const tagBoxHeight = 32;

  ctx.fillStyle = colors.headerBg;
  ctx.beginPath();
  ctx.roundRect(tagBoxX, tagBoxY, totalTableWidth - 20, tagBoxHeight, 6);
  ctx.fill();
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 渲染筛选条件 Tag 列表
  ctx.font = `11px ${fontRegular}`;
  ctx.textBaseline = 'middle';
  let tagCursorX = tagBoxX + 14;

  ctx.fillStyle = colors.textMuted;
  ctx.textAlign = 'left';
  ctx.fillText('生效策略：', tagCursorX, tagBoxY + tagBoxHeight / 2);
  tagCursorX += 60;

  const filterTags: string[] = [];
  if (criteria) {
    if (criteria.minDividendYield > 0) {
      filterTags.push(`股息率 ≥ ${criteria.minDividendYield}%`);
    }
    if (criteria.maxPE < 100) {
      filterTags.push(`PE ≤ ${criteria.maxPE}`);
    }
    if (criteria.minROE > 0) {
      filterTags.push(`ROE ≥ ${criteria.minROE}%`);
    }
    if (criteria.minDividendYears > 0) {
      filterTags.push(`分红年限 ≥ ${criteria.minDividendYears}年`);
    }
    if (criteria.excludeST) {
      filterTags.push('排除ST/退市');
    }
  } else {
    filterTags.push('默认高股息标准', '低估值安全垫', '连续稳定分红');
  }

  filterTags.forEach((tag) => {
    const tagTextWidth = ctx.measureText(tag).width;
    const tagPadding = 12;
    const tagTotalW = tagTextWidth + tagPadding * 2;

    if (tagCursorX + tagTotalW < canvasWidth - paddingX - 120) {
      ctx.fillStyle = colors.tagBg;
      ctx.beginPath();
      ctx.roundRect(tagCursorX, tagBoxY + 5, tagTotalW, 22, 4);
      ctx.fill();

      ctx.fillStyle = colors.tagText;
      ctx.textAlign = 'center';
      ctx.fillText(tag, tagCursorX + tagTotalW / 2, tagBoxY + tagBoxHeight / 2);

      tagCursorX += tagTotalW + 8;
    }
  });

  currentY += 36;

  // 8. 绘制表格表头 (Table Header)
  const tableStartY = currentY;
  const tableX = paddingX;

  ctx.fillStyle = colors.tableHeaderBg;
  ctx.beginPath();
  ctx.roundRect(tableX, tableStartY, totalTableWidth, tableHeaderRowHeight, [8, 8, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 表头文字
  let colX = tableX;
  ctx.font = `bold 12px ${fontRegular}`;
  ctx.fillStyle = colors.tableHeaderText;
  ctx.textBaseline = 'middle';

  columns.forEach(col => {
    let textX = colX + col.width / 2;
    if (col.align === 'left') textX = colX + 16;
    if (col.align === 'right') textX = colX + col.width - 16;

    ctx.textAlign = col.align as CanvasTextAlign;
    ctx.fillText(col.label, textX, tableStartY + tableHeaderRowHeight / 2);
    colX += col.width;
  });

  currentY += tableHeaderRowHeight;

  // 9. 绘制表格数据行 (Rows)
  stocks.forEach((stock, index) => {
    const rowY = currentY;
    const isAlt = index % 2 === 1;

    // 行背景
    ctx.fillStyle = isAlt ? colors.altRowBg : colors.cardBg;
    ctx.fillRect(tableX, rowY, totalTableWidth, rowHeight);

    // 行底部分割线
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(tableX, rowY + rowHeight);
    ctx.lineTo(tableX + totalTableWidth, rowY + rowHeight);
    ctx.stroke();

    let cellX = tableX;

    // (1) 序号
    const colIndex = columns[0];
    ctx.font = `bold 12px ${fontMono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (index === 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('① 1', cellX + colIndex.width / 2, rowY + rowHeight / 2);
    } else if (index === 1) {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('② 2', cellX + colIndex.width / 2, rowY + rowHeight / 2);
    } else if (index === 2) {
      ctx.fillStyle = '#fb923c';
      ctx.fillText('③ 3', cellX + colIndex.width / 2, rowY + rowHeight / 2);
    } else {
      ctx.fillStyle = colors.textMuted;
      ctx.fillText(String(index + 1), cellX + colIndex.width / 2, rowY + rowHeight / 2);
    }
    cellX += colIndex.width;

    // (2) 股票名称 & 代码
    const colName = columns[1];
    ctx.textAlign = 'left';
    ctx.font = `bold 13px ${fontRegular}`;
    ctx.fillStyle = colors.title;
    ctx.fillText(stock.name, cellX + 16, rowY + rowHeight / 2 - 7);
    
    ctx.font = `11px ${fontMono}`;
    ctx.fillStyle = colors.textMuted;
    ctx.fillText(stock.code, cellX + 16, rowY + rowHeight / 2 + 9);
    cellX += colName.width;

    // (3) 所属行业
    const colInd = columns[2];
    ctx.textAlign = 'center';
    ctx.font = `12px ${fontRegular}`;
    ctx.fillStyle = colors.text;
    ctx.fillText(stock.industry, cellX + colInd.width / 2, rowY + rowHeight / 2);
    cellX += colInd.width;

    // (4) 股价(元)
    const colPrice = columns[3];
    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${fontMono}`;
    ctx.fillStyle = colors.title;
    ctx.fillText(`¥${stock.price.toFixed(2)}`, cellX + colPrice.width - 16, rowY + rowHeight / 2);
    cellX += colPrice.width;

    // (5) PE
    const colPE = columns[4];
    ctx.textAlign = 'right';
    ctx.font = `12px ${fontMono}`;
    ctx.fillStyle = stock.pe <= 10 ? colors.accentCyan : colors.text;
    ctx.fillText(stock.pe > 0 ? stock.pe.toFixed(2) : '亏损', cellX + colPE.width - 16, rowY + rowHeight / 2);
    cellX += colPE.width;

    // (6) PB
    const colPB = columns[5];
    ctx.textAlign = 'right';
    ctx.font = `12px ${fontMono}`;
    ctx.fillStyle = stock.pb <= 1.0 ? colors.accentGreen : colors.text;
    ctx.fillText(stock.pb.toFixed(2), cellX + colPB.width - 16, rowY + rowHeight / 2);
    cellX += colPB.width;

    // (7) 股息率(ATM / TTM)
    const colDiv = columns[6];
    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${fontMono}`;
    ctx.fillStyle = colors.accentRose;
    ctx.fillText(`${stock.ttmDividendYield.toFixed(2)}%`, cellX + colDiv.width - 16, rowY + rowHeight / 2);
    cellX += colDiv.width;

    // (8) 连续分红年限
    const colYears = columns[7];
    ctx.textAlign = 'center';
    ctx.font = `12px ${fontRegular}`;
    ctx.fillStyle = stock.dividendYears >= 10 ? colors.accentGold : colors.text;
    ctx.fillText(`${stock.dividendYears}年`, cellX + colYears.width / 2, rowY + rowHeight / 2);
    cellX += colYears.width;

    // (9) 评分
    const colScore = columns[8];
    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${fontMono}`;
    const scoreVal = stock.leaderScore !== undefined ? stock.leaderScore.toFixed(1) : '-';
    ctx.fillStyle = stock.leaderScore && stock.leaderScore >= 85 ? colors.accentGold : colors.accentCyan;
    ctx.fillText(scoreVal, cellX + colScore.width - 16, rowY + rowHeight / 2);
    cellX += colScore.width;

    currentY += rowHeight;
  });

  // 10. 底部 Footer 备注与品牌标识区域
  currentY += 16;
  ctx.save();
  ctx.font = `11px ${fontRegular}`;
  ctx.fillStyle = colors.textMuted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('提示: 股息率(ATM)取近12个月滚动分红计算；入市需谨慎，投资有风险。', paddingX + 10, currentY + 12);

  if (watermark) {
    ctx.textAlign = 'right';
    ctx.font = `bold 12px ${fontRegular}`;
    ctx.fillStyle = colors.accentGold;
    ctx.fillText('公众号：我爱这young', canvasWidth - paddingX - 10, currentY + 12);
  }
  ctx.restore();

  // 11. 全屏合理铺满防伪与专属版权水印
  if (watermark) {
    ctx.save();
    const watermarkText = '公众号：我爱这young';
    const angle = -22 * (Math.PI / 180);
    ctx.font = `bold 14px ${fontRegular}`;
    ctx.fillStyle = isDark
      ? 'rgba(251, 191, 36, 0.085)'
      : isWine
      ? 'rgba(253, 164, 175, 0.095)'
      : 'rgba(30, 41, 59, 0.075)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stepX = 220;
    const stepY = 120;

    for (let y = -30; y < canvasHeight + 100; y += stepY) {
      const isOddRow = Math.floor((y + 30) / stepY) % 2 !== 0;
      const xOffset = isOddRow ? stepX / 2 : 0;
      for (let x = -50 + xOffset; x < canvasWidth + 100; x += stepX) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  return canvas;
}

/**
 * 触发图片文件本地下载 (PNG / JPEG)
 */
export async function downloadStockTableImage(
  stocks: Stock[],
  options: ImageExportOptions = {},
  format: 'png' | 'jpeg' = 'png'
): Promise<void> {
  const canvas = await renderStockTableToCanvas(stocks, options);
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpeg' ? 0.95 : undefined;
  const dataUrl = canvas.toDataURL(mimeType, quality);

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const baseName = (options.title || '高股息优质公司估值清单').replace(/[\\/:*?"<>|]/g, '_');
  const filename = `${baseName}_${dateStr}.${format}`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 复制表格高清图片至系统剪贴板
 */
export async function copyStockTableImageToClipboard(
  stocks: Stock[],
  options: ImageExportOptions = {}
): Promise<boolean> {
  try {
    const canvas = await renderStockTableToCanvas(stocks, options);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    if (!blob) return false;

    if (navigator.clipboard && navigator.clipboard.write) {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy image to clipboard:', err);
    return false;
  }
}

export interface TargetWatchlistImageExportOptions {
  theme?: 'dark' | 'light' | 'wine';
  title?: string;
  subtitle?: string;
  watermark?: boolean;
  scale?: number;
  avatarStyle?: AvatarStyle;
}

/**
 * 绘制高分辨率「理想股息率备选股票池」图片清单（包含目标价、需跌空间、达标状态与防伪水印）
 */
export async function renderTargetWatchlistToCanvas(
  items: TargetDividendCalculatedStock[],
  options: TargetWatchlistImageExportOptions = {}
): Promise<HTMLCanvasElement> {
  const {
    theme = 'dark',
    title = 'A股理想股息率备选股票池清单',
    subtitle = '基于自设理想目标股息率实时倒推目标建仓买入价与需跌空间',
    watermark = true,
    scale = 2,
    avatarStyle = 'whiteThreeSoldiers'
  } = options;

  // 预加载所选头像图片
  let activeAvatarSrc: string | null = null;
  if (avatarStyle === 'whiteThreeSoldiers') activeAvatarSrc = whiteThreeSoldiersImg;
  else if (avatarStyle === 'whiteGoldTrend') activeAvatarSrc = whiteGoldTrendImg;
  else if (avatarStyle === 'whiteIso3d') activeAvatarSrc = whiteIso3dImg;
  else if (avatarStyle === 'threeSoldiers') activeAvatarSrc = threeSoldiersImg;
  else if (avatarStyle === 'goldTrendKline') activeAvatarSrc = goldTrendKlineImg;
  else if (avatarStyle === 'iso3dKline') activeAvatarSrc = iso3dKlineImg;
  else if (avatarStyle === 'minimalFintech') activeAvatarSrc = minimalFintechImg;
  else if (avatarStyle === 'goldBull') activeAvatarSrc = finBullImg;

  let loadedAvatarImg: HTMLImageElement | null = null;
  if (activeAvatarSrc) {
    loadedAvatarImg = new Image();
    loadedAvatarImg.src = activeAvatarSrc;
    if (!loadedAvatarImg.complete) {
      await new Promise((resolve) => {
        if (!loadedAvatarImg) return resolve(false);
        loadedAvatarImg.onload = () => resolve(true);
        loadedAvatarImg.onerror = () => resolve(false);
      });
    }
  }

  // 1. 颜色主题配置
  const isDark = theme === 'dark';
  const isWine = theme === 'wine';

  const colors = isDark
    ? {
        bg: '#090d16',
        cardBg: '#0f172a',
        headerBg: '#1e293b',
        altRowBg: '#0c1322',
        border: '#1e293b',
        title: '#f8fafc',
        subtitle: '#94a3b8',
        text: '#cbd5e1',
        textMuted: '#64748b',
        accentGold: '#fbbf24',
        accentRose: '#f43f5e',
        accentCyan: '#06b6d4',
        accentGreen: '#10b981',
        tableHeaderBg: '#131c2e',
        tableHeaderText: '#94a3b8',
        tagBg: '#1e293b',
        tagText: '#38bdf8'
      }
    : isWine
    ? {
        bg: '#150a10',
        cardBg: '#1f1019',
        headerBg: '#2d1424',
        altRowBg: '#190d14',
        border: '#3b1d30',
        title: '#fff1f2',
        subtitle: '#fda4af',
        text: '#fecdd3',
        textMuted: '#9f7282',
        accentGold: '#fbbf24',
        accentRose: '#fb7185',
        accentCyan: '#38bdf8',
        accentGreen: '#34d399',
        tableHeaderBg: '#291220',
        tableHeaderText: '#fda4af',
        tagBg: '#3b1d30',
        tagText: '#f43f5e'
      }
    : {
        bg: '#f8fafc',
        cardBg: '#ffffff',
        headerBg: '#f1f5f9',
        altRowBg: '#f8fafc',
        border: '#e2e8f0',
        title: '#0f172a',
        subtitle: '#64748b',
        text: '#334155',
        textMuted: '#94a3b8',
        accentGold: '#d97706',
        accentRose: '#e11d48',
        accentCyan: '#0284c7',
        accentGreen: '#059669',
        tableHeaderBg: '#f1f5f9',
        tableHeaderText: '#475569',
        tagBg: '#e2e8f0',
        tagText: '#0369a1'
      };

  // 2. 确定列宽配置 (基准像素)
  const columns = [
    { key: 'index', label: '序号', width: 60, align: 'center' },
    { key: 'name', label: '股票名称 & 代码', width: 170, align: 'left' },
    { key: 'industry', label: '所属行业', width: 100, align: 'center' },
    { key: 'price', label: '实时现价', width: 95, align: 'right' },
    { key: 'currentYield', label: '现股息率(TTM)', width: 110, align: 'right' },
    { key: 'dps', label: '每股分红基准', width: 105, align: 'right' },
    { key: 'targetYield', label: '理想股息率', width: 105, align: 'right' },
    { key: 'targetPrice', label: '目标买入价', width: 110, align: 'right' },
    { key: 'dropNeeded', label: '需跌空间/偏离', width: 115, align: 'right' },
    { key: 'status', label: '达标状态', width: 100, align: 'center' }
  ];

  const totalTableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const paddingX = 40;
  const canvasWidth = totalTableWidth + paddingX * 2;

  // 3. 计算高度 (包含公式展示栏)
  const headerHeight = 188;
  const tableHeaderRowHeight = 44;
  const rowHeight = 48;
  const footerHeight = 80;
  const canvasHeight = headerHeight + tableHeaderRowHeight + (items.length * rowHeight) + footerHeight;

  // 4. 创建并缩放 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  ctx.scale(scale, scale);

  // 字体配置
  const fontRegular = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif';
  const fontMono = '"SF Pro Text", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';

  // 5. 绘制总背景
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 6. 绘制内容卡片背景（圆角外框）
  const cardX = paddingX - 10;
  const cardY = 24;
  const cardWidth = totalTableWidth + 20;
  const cardHeight = canvasHeight - 48;
  const radius = 16;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cardX + radius, cardY);
  ctx.lineTo(cardX + cardWidth - radius, cardY);
  ctx.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + radius);
  ctx.lineTo(cardX + cardWidth, cardY + cardHeight - radius);
  ctx.quadraticCurveTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - radius, cardY + cardHeight);
  ctx.lineTo(cardX + radius, cardY + cardHeight);
  ctx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - radius);
  ctx.lineTo(cardX, cardY + radius);
  ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
  ctx.closePath();

  ctx.fillStyle = colors.cardBg;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.border;
  ctx.stroke();
  ctx.restore();

  // 7. 绘制顶部 Header 区域
  let currentY = 48;

  // 顶部 Logo 标识 (头像容器纯白底色)
  ctx.save();
  const badgeX = paddingX + 10;
  const badgeY = currentY - 6;
  const badgeSize = 38;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 10);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  if (loadedAvatarImg && loadedAvatarImg.complete && loadedAvatarImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(badgeX + 1, badgeY + 1, badgeSize - 2, badgeSize - 2, 9);
    ctx.clip();
    ctx.drawImage(loadedAvatarImg, badgeX + 1, badgeY + 1, badgeSize - 2, badgeSize - 2);
    ctx.restore();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 10);
    ctx.stroke();
  } else {
    const grad = ctx.createLinearGradient(badgeX + 2, badgeY + 2, badgeX + badgeSize - 2, badgeY + badgeSize - 2);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(1, '#e11d48');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(badgeX + 3, badgeY + 3, badgeSize - 6, badgeSize - 6, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 18px ${fontRegular}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('标', badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 1);
  }

  // 主标题
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `bold 20px ${fontRegular}`;
  ctx.fillStyle = colors.title;
  ctx.fillText(title, badgeX + badgeSize + 14, currentY - 6);

  // 副标题
  ctx.font = `12px ${fontRegular}`;
  ctx.fillStyle = colors.subtitle;
  ctx.fillText(subtitle, badgeX + badgeSize + 14, currentY + 20);

  // 统计徽标 (总数、已达标、临界关注、平均目标股息率)
  const reachedCount = items.filter(i => i.isReached).length;
  const closeCount = items.filter(i => i.status === 'close').length;
  const avgTargetYield = items.length > 0 
    ? (items.reduce((s, i) => s + i.targetYield, 0) / items.length).toFixed(1) 
    : '0.0';

  const statsPills = [
    { label: `备选总数: ${items.length}只`, color: colors.text, bg: colors.tagBg, border: colors.border },
    { label: `🎯已达标: ${reachedCount}只`, color: colors.accentGreen, bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', border: colors.accentGreen },
    { label: `⚠️临界关注: ${closeCount}只`, color: colors.accentGold, bg: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)', border: colors.accentGold },
    { label: `平均目标股息: ${avgTargetYield}%`, color: colors.accentRose, bg: isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.1)', border: colors.accentRose }
  ];

  let pillX = badgeX;
  const pillY = currentY + 54;
  statsPills.forEach((p) => {
    ctx.font = `bold 11px ${fontRegular}`;
    const textWidth = ctx.measureText(p.label).width;
    const pillWidth = textWidth + 16;
    const pillHeight = 22;

    ctx.save();
    ctx.fillStyle = p.bg;
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = p.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.label, pillX + 8, pillY + pillHeight / 2);
    ctx.restore();

    pillX += pillWidth + 8;
  });

  // 绘制推算核心逻辑与数学公式展示条
  const formulaY = currentY + 86;
  const formulaWidth = totalTableWidth - 20;
  const formulaHeight = 32;

  ctx.save();
  ctx.fillStyle = isDark
    ? 'rgba(15, 23, 42, 0.9)'
    : isWine
    ? 'rgba(45, 20, 36, 0.85)'
    : 'rgba(241, 245, 249, 0.9)';
  ctx.strokeStyle = isDark
    ? 'rgba(245, 158, 11, 0.35)'
    : isWine
    ? 'rgba(253, 164, 175, 0.4)'
    : 'rgba(217, 119, 6, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX, formulaY, formulaWidth, formulaHeight, 7);
  ctx.fill();
  ctx.stroke();

  // 公式左侧标题徽标
  ctx.fillStyle = colors.accentGold;
  ctx.font = `bold 11px ${fontRegular}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('📐 核心推算公式:', badgeX + 10, formulaY + formulaHeight / 2);

  // 公式 1: 目标买入价 = 每股分红 ÷ 理想股息率
  let fTextX = badgeX + 112;
  ctx.fillStyle = colors.text;
  ctx.font = `11px ${fontRegular}`;
  ctx.fillText('① 目标买入价 = ', fTextX, formulaY + formulaHeight / 2);
  fTextX += ctx.measureText('① 目标买入价 = ').width;

  ctx.fillStyle = colors.accentCyan;
  ctx.font = `bold 11px ${fontMono}`;
  ctx.fillText('每股分红(DPS) ÷ 理想股息率', fTextX, formulaY + formulaHeight / 2);
  fTextX += ctx.measureText('每股分红(DPS) ÷ 理想股息率').width;

  // 分隔竖线
  ctx.fillStyle = colors.textMuted;
  ctx.font = `11px ${fontRegular}`;
  ctx.fillText('   ｜   ', fTextX, formulaY + formulaHeight / 2);
  fTextX += ctx.measureText('   ｜   ').width;

  // 公式 2: 需跌空间 = (目标买入价 - 现价) ÷ 现价 × 100%
  ctx.fillStyle = colors.text;
  ctx.fillText('② 需跌空间 = ', fTextX, formulaY + formulaHeight / 2);
  fTextX += ctx.measureText('② 需跌空间 = ').width;

  ctx.fillStyle = colors.accentGreen;
  ctx.font = `bold 11px ${fontMono}`;
  ctx.fillText('(目标买入价 - 现价) ÷ 现价 × 100%', fTextX, formulaY + formulaHeight / 2);

  ctx.restore();

  // 顶部生成时间与标识
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = `11px ${fontMono}`;
  ctx.fillStyle = colors.textMuted;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  ctx.fillText(`生成时间: ${dateStr}`, canvasWidth - paddingX - 10, currentY - 2);

  ctx.restore();

  // 8. 绘制表格表头 (Table Header)
  currentY = headerHeight;
  const tableX = paddingX;

  ctx.fillStyle = colors.tableHeaderBg;
  ctx.fillRect(tableX, currentY, totalTableWidth, tableHeaderRowHeight);

  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tableX, currentY);
  ctx.lineTo(tableX + totalTableWidth, currentY);
  ctx.moveTo(tableX, currentY + tableHeaderRowHeight);
  ctx.lineTo(tableX + totalTableWidth, currentY + tableHeaderRowHeight);
  ctx.stroke();

  ctx.font = `bold 12px ${fontRegular}`;
  ctx.fillStyle = colors.tableHeaderText;
  ctx.textBaseline = 'middle';

  let headerCellX = tableX;
  columns.forEach((col) => {
    ctx.textAlign = col.align as CanvasTextAlign;
    let textX = headerCellX;
    if (col.align === 'center') textX += col.width / 2;
    else if (col.align === 'right') textX += col.width - 12;
    else textX += 14;

    ctx.fillText(col.label, textX, currentY + tableHeaderRowHeight / 2);
    headerCellX += col.width;
  });

  // 9. 循环绘制每一行数据
  currentY += tableHeaderRowHeight;

  items.forEach((item, index) => {
    const rowY = currentY;
    const isAlt = index % 2 === 1;

    // 达标行特殊微高亮背景
    if (item.isReached) {
      ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)';
    } else {
      ctx.fillStyle = isAlt ? colors.altRowBg : colors.cardBg;
    }
    ctx.fillRect(tableX, rowY, totalTableWidth, rowHeight);

    // 行底部分割线
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(tableX, rowY + rowHeight);
    ctx.lineTo(tableX + totalTableWidth, rowY + rowHeight);
    ctx.stroke();

    let cellX = tableX;

    // (1) 序号
    const colIndex = columns[0];
    ctx.font = `bold 12px ${fontMono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (index === 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('① 1', cellX + colIndex.width / 2, rowY + rowHeight / 2);
    } else if (index === 1) {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('② 2', cellX + colIndex.width / 2, rowY + rowHeight / 2);
    } else if (index === 2) {
      ctx.fillStyle = '#fb923c';
      ctx.fillText('③ 3', cellX + colIndex.width / 2, rowY + rowHeight / 2);
    } else {
      ctx.fillStyle = colors.textMuted;
      ctx.fillText(String(index + 1), cellX + colIndex.width / 2, rowY + rowHeight / 2);
    }
    cellX += colIndex.width;

    // (2) 股票名称 & 代码
    const colName = columns[1];
    ctx.textAlign = 'left';
    ctx.font = `bold 13px ${fontRegular}`;
    ctx.fillStyle = colors.title;
    ctx.fillText(item.stock.name, cellX + 14, rowY + rowHeight / 2 - 7);

    ctx.font = `11px ${fontMono}`;
    ctx.fillStyle = colors.textMuted;
    ctx.fillText(item.stock.code, cellX + 14, rowY + rowHeight / 2 + 9);
    cellX += colName.width;

    // (3) 所属行业
    const colInd = columns[2];
    ctx.textAlign = 'center';
    ctx.font = `12px ${fontRegular}`;
    ctx.fillStyle = colors.text;
    ctx.fillText(item.stock.industry, cellX + colInd.width / 2, rowY + rowHeight / 2);
    cellX += colInd.width;

    // (4) 现价(元)
    const colPrice = columns[3];
    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${fontMono}`;
    ctx.fillStyle = colors.title;
    ctx.fillText(`¥${item.currentPrice.toFixed(2)}`, cellX + colPrice.width - 12, rowY + rowHeight / 2);
    cellX += colPrice.width;

    // (5) 现行股息率 (TTM)
    const colCurrentYield = columns[4];
    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${fontMono}`;
    ctx.fillStyle = colors.accentRose;
    ctx.fillText(`${item.currentYield.toFixed(2)}%`, cellX + colCurrentYield.width - 12, rowY + rowHeight / 2);
    cellX += colCurrentYield.width;

    // (6) 每股分红基准
    const colDPS = columns[5];
    ctx.textAlign = 'right';
    ctx.font = `12px ${fontMono}`;
    ctx.fillStyle = colors.text;
    ctx.fillText(`¥${item.dividendPerShare.toFixed(3)}`, cellX + colDPS.width - 12, rowY + rowHeight / 2);
    cellX += colDPS.width;

    // (7) 理想目标股息率
    const colTargetYield = columns[6];
    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${fontMono}`;
    ctx.fillStyle = colors.accentGold;
    ctx.fillText(`${item.targetYield.toFixed(2)}%`, cellX + colTargetYield.width - 12, rowY + rowHeight / 2);
    cellX += colTargetYield.width;

    // (8) 目标买入价
    const colTargetPrice = columns[7];
    ctx.textAlign = 'right';
    ctx.font = `bold 14px ${fontMono}`;
    ctx.fillStyle = item.isReached ? colors.accentGreen : colors.accentGold;
    ctx.fillText(`¥${item.targetPrice.toFixed(2)}`, cellX + colTargetPrice.width - 12, rowY + rowHeight / 2);
    cellX += colTargetPrice.width;

    // (9) 需跌空间 / 偏离度
    const colDrop = columns[8];
    ctx.textAlign = 'right';
    ctx.font = `bold 12px ${fontMono}`;
    ctx.fillStyle = colors.accentGreen;
    if (item.isReached) {
      ctx.fillText('已达标 (可买)', cellX + colDrop.width - 12, rowY + rowHeight / 2);
    } else {
      ctx.fillText(`${item.dropNeededPercent.toFixed(2)}%`, cellX + colDrop.width - 12, rowY + rowHeight / 2);
    }
    cellX += colDrop.width;

    // (10) 达标状态徽章
    const colStatus = columns[9];
    const statusText = item.isReached ? '🎯已达标' : item.status === 'close' ? '⚠️临界关注' : '⏳等待回调';
    const statusBg = item.isReached 
      ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)')
      : item.status === 'close'
      ? (isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.15)')
      : (isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.15)');
    const statusColor = item.isReached ? colors.accentGreen : item.status === 'close' ? colors.accentGold : colors.textMuted;
    const statusBorder = item.isReached ? colors.accentGreen : item.status === 'close' ? colors.accentGold : colors.border;

    ctx.save();
    ctx.font = `bold 11px ${fontRegular}`;
    const badgeW = 76;
    const badgeH = 22;
    const badgeBX = cellX + (colStatus.width - badgeW) / 2;
    const badgeBY = rowY + (rowHeight - badgeH) / 2;

    ctx.fillStyle = statusBg;
    ctx.strokeStyle = statusBorder;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(badgeBX, badgeBY, badgeW, badgeH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = statusColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusText, cellX + colStatus.width / 2, rowY + rowHeight / 2);
    ctx.restore();

    cellX += colStatus.width;
    currentY += rowHeight;
  });

  // 10. 底部 Footer 备注与品牌标识区域
  currentY += 16;
  ctx.save();
  ctx.font = `11px ${fontRegular}`;
  ctx.fillStyle = colors.textMuted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('提示: 目标买入价依据每股分红基准与自设理想股息率倒推计算；入市需谨慎，投资有风险。', paddingX + 10, currentY + 12);

  if (watermark) {
    ctx.textAlign = 'right';
    ctx.font = `bold 12px ${fontRegular}`;
    ctx.fillStyle = colors.accentGold;
    ctx.fillText('公众号：我爱这young', canvasWidth - paddingX - 10, currentY + 12);
  }
  ctx.restore();

  // 11. 全屏合理铺满防伪与专属版权水印
  if (watermark) {
    ctx.save();
    const watermarkText = '公众号：我爱这young';
    const angle = -22 * (Math.PI / 180);
    ctx.font = `bold 14px ${fontRegular}`;
    ctx.fillStyle = isDark
      ? 'rgba(251, 191, 36, 0.085)'
      : isWine
      ? 'rgba(253, 164, 175, 0.095)'
      : 'rgba(30, 41, 59, 0.075)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stepX = 220;
    const stepY = 120;

    for (let y = -30; y < canvasHeight + 100; y += stepY) {
      const isOddRow = Math.floor((y + 30) / stepY) % 2 !== 0;
      const xOffset = isOddRow ? stepX / 2 : 0;
      for (let x = -50 + xOffset; x < canvasWidth + 100; x += stepX) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  return canvas;
}

/**
 * 触发理想股息率备选池图片文件本地下载 (PNG / JPEG)
 */
export async function downloadTargetWatchlistImage(
  items: TargetDividendCalculatedStock[],
  options: TargetWatchlistImageExportOptions = {},
  format: 'png' | 'jpeg' = 'png'
): Promise<void> {
  const canvas = await renderTargetWatchlistToCanvas(items, options);
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpeg' ? 0.95 : undefined;
  const dataUrl = canvas.toDataURL(mimeType, quality);

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const baseName = (options.title || '理想股息率备选股票池清单').replace(/[\\/:*?"<>|]/g, '_');
  const filename = `${baseName}_${dateStr}.${format}`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 复制理想股息率备选池高清图片至系统剪贴板
 */
export async function copyTargetWatchlistImageToClipboard(
  items: TargetDividendCalculatedStock[],
  options: TargetWatchlistImageExportOptions = {}
): Promise<boolean> {
  try {
    const canvas = await renderTargetWatchlistToCanvas(items, options);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    if (!blob) return false;

    if (navigator.clipboard && navigator.clipboard.write) {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy target watchlist image to clipboard:', err);
    return false;
  }
}

