import * as XLSX from 'xlsx';
import { Stock, FilterCriteria } from '../types';
import { getStockValuationStatus } from './calculator';

/**
 * 导出筛选结果为 Excel (.xlsx) 表格
 */
export function exportToExcel(stocks: Stock[], criteria: FilterCriteria) {
  if (stocks.length === 0) {
    alert('当前筛选结果为空，无法导出。');
    return;
  }

  // 1. 构建 Excel 表头和数据行
  const exportData = stocks.map((stock, index) => {
    const valInfo = getStockValuationStatus(stock);

    return {
      '综合排名': index + 1,
      '股票代码': stock.code,
      '股票简称': stock.name,
      '所属行业': stock.industry,
      '估值情况': valInfo.status, // 低估 / 正常 / 高估
      '估值安全垫': `${valInfo.cushionPercent}%`,
      '最新现价(元)': stock.price.toFixed(2),
      '今日涨跌幅(%)': (stock.changePercent >= 0 ? '+' : '') + stock.changePercent.toFixed(2) + '%',
      '滚动股息率TTM(%)': stock.ttmDividendYield.toFixed(2) + '%',
      '静态股息率(%)': stock.staticDividendYield.toFixed(2) + '%',
      '龙头综合分(0-100)': stock.leaderScore !== undefined ? stock.leaderScore.toFixed(1) : '-',
      '市盈率PE-TTM': stock.pe > 0 ? stock.pe.toFixed(2) : '亏损',
      '市净率PB': stock.pb.toFixed(2),
      '总市值(亿元)': stock.marketCap.toFixed(1),
      '净资产收益率ROE(%)': stock.roe.toFixed(2) + '%',
      '营收同比增速(%)': (stock.revGrowth >= 0 ? '+' : '') + stock.revGrowth.toFixed(2) + '%',
      '净利润同比增速(%)': (stock.netProfitGrowth >= 0 ? '+' : '') + stock.netProfitGrowth.toFixed(2) + '%',
      '连续分红年数': stock.dividendYears + '年',
      '分红支付率(%)': stock.payoutRatio.toFixed(1) + '%',
      '上年每股分红(元)': stock.lastYearDividendPerShare.toFixed(3),
      '近12月每股分红(元)': stock.ttmDividendPerShare.toFixed(3),
      '分红周期': stock.dividendCycle,
      '红利贵族标签': stock.isAristocrat ? '连续>10年红利贵族' : (stock.dividendYears >= 5 ? '高分红标杆' : '常规分红'),
      '估值与护城河诊断': `${valInfo.reason}；${stock.dividendAdvantage}`
    };
  });

  // 2. 创建 Worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // 设置列宽
  const colWidths = [
    { wch: 10 }, // 排名
    { wch: 12 }, // 代码
    { wch: 14 }, // 简称
    { wch: 12 }, // 行业
    { wch: 12 }, // 估值情况
    { wch: 14 }, // 估值安全垫
    { wch: 12 }, // 现价
    { wch: 14 }, // 涨跌幅
    { wch: 16 }, // 滚动股息率
    { wch: 16 }, // 静态股息率
    { wch: 18 }, // 龙头综合分
    { wch: 14 }, // PE
    { wch: 12 }, // PB
    { wch: 14 }, // 市值
    { wch: 16 }, // ROE
    { wch: 16 }, // 营收增速
    { wch: 16 }, // 净利增速
    { wch: 14 }, // 分红年数
    { wch: 14 }, // 分红支付率
    { wch: 16 }, // 上年分红
    { wch: 16 }, // 12月分红
    { wch: 16 }, // 分红周期
    { wch: 20 }, // 标签
    { wch: 45 }  // 诊断
  ];
  worksheet['!cols'] = colWidths;

  // 3. 创建 Workbook 并写入
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '高股息股票筛选结果');

  // 4. 生成带日期的文件名
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `A股高股息股票筛选_${dateStr}_共${stocks.length}只.xlsx`;

  // 5. 触发下载
  XLSX.writeFile(workbook, fileName);
}
