import React, { useState } from 'react';
import { 
  X, Plus, FileText, Upload, Sparkles, Trash2, Edit3, 
  CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet,
  Download, ArrowRight, Layers, HelpCircle
} from 'lucide-react';
import { Stock } from '../types';
import { ALL_INDUSTRIES } from '../data/stocksData';

interface CustomStockImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingStocks: Stock[];
  onAddStocks: (newStocks: Stock[]) => void;
  onUpdateStock: (stock: Stock) => void;
  onDeleteCustomStock: (code: string) => void;
  onClearCustomStocks: () => void;
}

// 示例模板数据
const SAMPLE_BATCH_TEXT = `600519	贵州茅台	食品饮料	1520.00	2.85	25.2	9.2	19000	34.5	23	75.0	高端白酒绝对王者，现金流强劲，特别分红加持
000858	五粮液	食品饮料	135.00	3.65	16.8	3.8	5200	25.0	22	60.0	浓香型白酒龙头，渠道改革深化，分红比例承诺超70%
600030	中信证券	非银金融	28.50	2.40	18.5	1.3	4200	8.8	20	36.0	国内综合券商一哥，机构业务与投行业务稳固
002415	海康威视	电子	31.20	3.15	19.2	3.1	2850	18.5	14	50.0	智能物联与安防视频AI硬件龙头，现金分红稳定
600188	兖矿能源	煤炭	14.80	8.90	6.8	1.25	1100	18.5	15	60.0	华东焦煤与动力煤龙头，承诺未来三年高比例现金分红`;

const SAMPLE_SIMPLE_CODES = `600519, 000858, 600030, 002415, 600188`;

// 根据股票代码自动推断交易所
function getMarketByCode(code: string): 'SH' | 'SZ' | 'BJ' {
  if (code.startsWith('60') || code.startsWith('68')) return 'SH';
  if (code.startsWith('00') || code.startsWith('30')) return 'SZ';
  if (code.startsWith('8') || code.startsWith('4') || code.startsWith('9')) return 'BJ';
  return 'SH';
}

export const CustomStockImportModal: React.FC<CustomStockImportModalProps> = ({
  isOpen,
  onClose,
  existingStocks,
  onAddStocks,
  onUpdateStock,
  onDeleteCustomStock,
  onClearCustomStocks
}) => {
  const [activeTab, setActiveTab] = useState<'batch' | 'single' | 'manage'>('batch');

  // 批量导入状态
  const [batchText, setBatchText] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<Stock[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // 单只添加/编辑表单状态
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    industry: string;
    price: string;
    ttmDividendYield: string;
    staticDividendYield: string;
    pe: string;
    pb: string;
    marketCap: string;
    roe: string;
    dividendYears: string;
    payoutRatio: string;
    revGrowth: string;
    netProfitGrowth: string;
    description: string;
    dividendAdvantage: string;
    isST: boolean;
    isDelisted: boolean;
    isLeader: boolean;
    isAristocrat: boolean;
  }>({
    code: '',
    name: '',
    industry: '基础化工',
    price: '15.00',
    ttmDividendYield: '4.5',
    staticDividendYield: '4.5',
    pe: '12.0',
    pb: '1.2',
    marketCap: '200.0',
    roe: '14.0',
    dividendYears: '8',
    payoutRatio: '50.0',
    revGrowth: '5.0',
    netProfitGrowth: '6.0',
    description: '',
    dividendAdvantage: '',
    isST: false,
    isDelisted: false,
    isLeader: false,
    isAristocrat: false
  });

  const [formError, setFormError] = useState<string | null>(null);

  // 自定义股票列表
  const customStocks = existingStocks.filter(s => s.isCustom);

  if (!isOpen) return null;

  // 智能批量解析
  const handleParseBatchText = () => {
    setParseErrors([]);
    setImportSuccessMsg(null);
    if (!batchText.trim()) {
      setParsedPreview([]);
      return;
    }

    const lines = batchText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const result: Stock[] = [];
    const errors: string[] = [];

    // 检测是否是简单的纯逗号或空格分割的代码列表 (如 600519, 000858, ...)
    if (lines.length === 1 && (lines[0].includes(',') || lines[0].includes('，') || lines[0].includes('、') || lines[0].includes(' '))) {
      const tokens = lines[0].split(/[,，、\s\t]+/).filter(t => t.trim().length > 0);
      tokens.forEach((token, idx) => {
        const cleanCode = token.replace(/[^0-9]/g, '');
        if (cleanCode.length === 6) {
          // 查找是否已存在于现有股票池中已有资料
          const existing = existingStocks.find(s => s.code === cleanCode);
          if (existing) {
            result.push({ ...existing, isCustom: true });
          } else {
            result.push({
              code: cleanCode,
              name: `标的_${cleanCode}`,
              pinyin: `BD${cleanCode}`,
              industry: '其他行业',
              market: getMarketByCode(cleanCode),
              price: 18.00,
              change: 0.0,
              changePercent: 0.0,
              prevClose: 18.00,
              lastYearDividendPerShare: 0.90,
              ttmDividendPerShare: 0.90,
              staticDividendYield: 5.0,
              ttmDividendYield: 5.0,
              dividendYears: 5,
              payoutRatio: 50.0,
              dividendCycle: '年度分红',
              pe: 12.0,
              pb: 1.20,
              marketCap: 150.0,
              roe: 12.0,
              revGrowth: 5.0,
              netProfitGrowth: 5.0,
              isST: false,
              isDelisted: false,
              isLeader: false,
              isAristocrat: false,
              isCustom: true,
              description: '用户自定义批量导入标的',
              dividendAdvantage: '自定义分红标的',
              history: [{ year: 2023, dividendPerShare: 0.90, dividendYield: 5.0, payoutRatio: 50.0, cashTotal: 5.0, scheme: '10派9.00元' }],
              quarterly: [{ quarter: '2024Q3', revenue: 50.0, netProfit: 6.0, roe: 12.0 }],
              updateTime: '15:00:00'
            });
          }
        } else if (token.length > 0) {
          errors.push(`第 ${idx + 1} 项 "${token}" 不是合法的6位A股代码`);
        }
      });
    } else {
      // 逐行解析（支持 制表符Tab、逗号CSV、竖线、连续空格）
      lines.forEach((line, idx) => {
        // 如果是表头行跳过
        if (line.includes('代码') && (line.includes('名称') || line.includes('简称'))) {
          return;
        }

        const cols = line.split(/[\t,|，]+|\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);
        if (cols.length === 0) return;

        // 提取代码
        let code = '';
        let name = '';
        let industry = '基础化工';
        let price = 15.00;
        let ttmDividendYield = 4.5;
        let pe = 12.0;
        let pb = 1.2;
        let marketCap = 200.0;
        let roe = 12.0;
        let dividendYears = 5;
        let payoutRatio = 50.0;
        let desc = '用户导入股票';

        // 找到6位纯数字作为代码
        const codeColIdx = cols.findIndex(c => /^\d{6}$/.test(c.replace(/[^0-9]/g, '')));
        if (codeColIdx !== -1) {
          code = cols[codeColIdx].replace(/[^0-9]/g, '');
          // 名称通常在代码后面或前面
          if (cols.length > codeColIdx + 1) {
            name = cols[codeColIdx + 1];
          } else if (codeColIdx > 0) {
            name = cols[0];
          } else {
            name = `标的_${code}`;
          }

          // 如果已有行业
          if (cols.length > codeColIdx + 2 && isNaN(Number(cols[codeColIdx + 2]))) {
            industry = cols[codeColIdx + 2];
          }

          // 剩余数字按顺序推断为 股价, 股息率, PE, PB, 市值, ROE...
          const numbers = cols.filter((c, i) => i !== codeColIdx && !isNaN(Number(c.replace('%', '')))).map(c => Number(c.replace('%', '')));
          if (numbers.length > 0) price = numbers[0] > 0 ? numbers[0] : 15.00;
          if (numbers.length > 1) ttmDividendYield = numbers[1];
          if (numbers.length > 2) pe = numbers[2];
          if (numbers.length > 3) pb = numbers[3];
          if (numbers.length > 4) marketCap = numbers[4];
          if (numbers.length > 5) roe = numbers[5];
          if (numbers.length > 6) dividendYears = Math.round(numbers[6]);
          if (numbers.length > 7) payoutRatio = numbers[7];

          // 寻找最后的文本作为说明
          const textCols = cols.filter((c, i) => i > codeColIdx + 2 && isNaN(Number(c.replace('%', ''))));
          if (textCols.length > 0) {
            desc = textCols.join(' ');
          }

          const dividendPerShare = Number(((price * ttmDividendYield) / 100).toFixed(3));

          result.push({
            code,
            name: name || `标的_${code}`,
            pinyin: name || `BD${code}`,
            industry: industry || '基础化工',
            market: getMarketByCode(code),
            price,
            change: 0.0,
            changePercent: 0.0,
            prevClose: price,
            lastYearDividendPerShare: dividendPerShare,
            ttmDividendPerShare: dividendPerShare,
            staticDividendYield: ttmDividendYield,
            ttmDividendYield,
            dividendYears: dividendYears || 5,
            payoutRatio: payoutRatio || 50.0,
            dividendCycle: '年度分红',
            pe: pe || 12.0,
            pb: pb || 1.2,
            marketCap: marketCap || 150.0,
            roe: roe || 12.0,
            revGrowth: 5.0,
            netProfitGrowth: 5.0,
            isST: name.includes('ST'),
            isDelisted: name.includes('退'),
            isLeader: false,
            isAristocrat: (dividendYears || 5) >= 10,
            isCustom: true,
            description: desc,
            dividendAdvantage: desc || '用户自定义导入标的',
            history: [{ year: 2023, dividendPerShare, dividendYield: ttmDividendYield, payoutRatio: payoutRatio || 50.0, cashTotal: Number(((marketCap * ttmDividendYield) / 100).toFixed(2)), scheme: `10派${(dividendPerShare * 10).toFixed(2)}元` }],
            quarterly: [{ quarter: '2024Q3', revenue: Number((marketCap * 0.4).toFixed(1)), netProfit: Number((marketCap / (pe || 12) * 0.75).toFixed(1)), roe: roe || 12.0 }],
            updateTime: '15:00:00'
          });
        } else {
          errors.push(`第 ${idx + 1} 行 "${line.slice(0, 30)}..." 未能识别出6位股票代码`);
        }
      });
    }

    setParsedPreview(result);
    setParseErrors(errors);
  };

  // 执行批量导入
  const handleExecuteBatchImport = () => {
    if (parsedPreview.length === 0) return;
    onAddStocks(parsedPreview);
    setImportSuccessMsg(`成功导入 ${parsedPreview.length} 只股票到筛选池中！`);
    setBatchText('');
    setParsedPreview([]);
    setTimeout(() => {
      setActiveTab('manage');
      setImportSuccessMsg(null);
    }, 1200);
  };

  // 单只股票表单保存
  const handleSaveSingleForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = formData.code.trim().replace(/[^0-9]/g, '');
    if (cleanCode.length !== 6) {
      setFormError('股票代码必须为6位纯数字（如 600519、000858、002415）');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('请输入股票简称（如 贵州茅台）');
      return;
    }

    const price = parseFloat(formData.price) || 10.0;
    const ttmYield = parseFloat(formData.ttmDividendYield) || 4.0;
    const staticYield = parseFloat(formData.staticDividendYield) || ttmYield;
    const pe = parseFloat(formData.pe) || 12.0;
    const pb = parseFloat(formData.pb) || 1.2;
    const marketCap = parseFloat(formData.marketCap) || 100.0;
    const roe = parseFloat(formData.roe) || 10.0;
    const dividendYears = parseInt(formData.dividendYears, 10) || 5;
    const payoutRatio = parseFloat(formData.payoutRatio) || 50.0;
    const revGrowth = parseFloat(formData.revGrowth) || 0.0;
    const netProfitGrowth = parseFloat(formData.netProfitGrowth) || 0.0;

    const dividendPerShare = Number(((price * ttmYield) / 100).toFixed(3));

    const newStock: Stock = {
      code: cleanCode,
      name: formData.name.trim(),
      pinyin: formData.name.trim(),
      industry: formData.industry.trim() || '基础化工',
      market: getMarketByCode(cleanCode),
      price,
      change: 0.0,
      changePercent: 0.0,
      prevClose: price,
      lastYearDividendPerShare: Number(((price * staticYield) / 100).toFixed(3)),
      ttmDividendPerShare: dividendPerShare,
      staticDividendYield: staticYield,
      ttmDividendYield: ttmYield,
      dividendYears,
      payoutRatio,
      dividendCycle: '年度分红',
      pe,
      pb,
      marketCap,
      roe,
      revGrowth,
      netProfitGrowth,
      isST: formData.isST,
      isDelisted: formData.isDelisted,
      isLeader: formData.isLeader,
      isAristocrat: formData.isAristocrat || dividendYears >= 10,
      isCustom: true,
      description: formData.description.trim() || '用户自定义添加标的',
      dividendAdvantage: formData.dividendAdvantage.trim() || '高分红标的',
      history: [
        { 
          year: 2023, 
          dividendPerShare, 
          dividendYield: ttmYield, 
          payoutRatio, 
          cashTotal: Number(((marketCap * ttmYield) / 100).toFixed(2)), 
          scheme: `10派${(dividendPerShare * 10).toFixed(2)}元` 
        }
      ],
      quarterly: [
        { 
          quarter: '2024Q3', 
          revenue: Number((marketCap * 0.4).toFixed(1)), 
          netProfit: Number((marketCap / pe * 0.75).toFixed(1)), 
          roe 
        }
      ],
      updateTime: '15:00:00'
    };

    if (editingCode) {
      onUpdateStock(newStock);
      setImportSuccessMsg(`已成功更新股票 ${newStock.name} (${newStock.code})`);
      setEditingCode(null);
    } else {
      onAddStocks([newStock]);
      setImportSuccessMsg(`已成功添加股票 ${newStock.name} (${newStock.code}) 至筛选池`);
    }

    // 重置表单
    setFormData({
      code: '',
      name: '',
      industry: '基础化工',
      price: '15.00',
      ttmDividendYield: '4.5',
      staticDividendYield: '4.5',
      pe: '12.0',
      pb: '1.2',
      marketCap: '200.0',
      roe: '14.0',
      dividendYears: '8',
      payoutRatio: '50.0',
      revGrowth: '5.0',
      netProfitGrowth: '6.0',
      description: '',
      dividendAdvantage: '',
      isST: false,
      isDelisted: false,
      isLeader: false,
      isAristocrat: false
    });

    setTimeout(() => {
      setActiveTab('manage');
      setImportSuccessMsg(null);
    }, 1000);
  };

  // 开始编辑某只自定义股票
  const handleStartEdit = (stock: Stock) => {
    setEditingCode(stock.code);
    setFormData({
      code: stock.code,
      name: stock.name,
      industry: stock.industry,
      price: stock.price.toString(),
      ttmDividendYield: stock.ttmDividendYield.toString(),
      staticDividendYield: stock.staticDividendYield.toString(),
      pe: stock.pe.toString(),
      pb: stock.pb.toString(),
      marketCap: stock.marketCap.toString(),
      roe: stock.roe.toString(),
      dividendYears: stock.dividendYears.toString(),
      payoutRatio: stock.payoutRatio.toString(),
      revGrowth: stock.revGrowth.toString(),
      netProfitGrowth: stock.netProfitGrowth.toString(),
      description: stock.description || '',
      dividendAdvantage: stock.dividendAdvantage || '',
      isST: !!stock.isST,
      isDelisted: !!stock.isDelisted,
      isLeader: !!stock.isLeader,
      isAristocrat: !!stock.isAristocrat
    });
    setActiveTab('single');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-600 flex items-center justify-center shadow-lg shadow-indigo-950/50">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                自定义导入 / 添加股票
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  支持代码列表粘贴与手动输入
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                将您关注的标的批量导入，与内置高股息池一起进行实时加权打分与雷达筛选
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('batch'); setEditingCode(null); }}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'batch'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>📋 批量粘贴导入 (推荐)</span>
          </button>

          <button
            onClick={() => { setActiveTab('single'); }}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'single'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{editingCode ? `✍️ 编辑股票 (${editingCode})` : '✍️ 单只手动录入'}</span>
          </button>

          <button
            onClick={() => { setActiveTab('manage'); setEditingCode(null); }}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>📦 已添加股票 ({customStocks.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Notification Msg */}
          {importSuccessMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: BATCH PASTE */}
          {activeTab === 'batch' && (
            <div className="space-y-4">
              
              {/* Guidance & Examples */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    导入格式支持说明：
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setBatchText(SAMPLE_SIMPLE_CODES);
                        setTimeout(handleParseBatchText, 100);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] border border-slate-600 transition"
                    >
                      填入纯代码示例
                    </button>
                    <button
                      onClick={() => {
                        setBatchText(SAMPLE_BATCH_TEXT);
                        setTimeout(handleParseBatchText, 100);
                      }}
                      className="px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[11px] border border-indigo-500/30 transition"
                    >
                      填入Excel多列示例
                    </button>
                  </div>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  ① <strong>纯代码模式：</strong> 直接粘贴代码（如 <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">600519, 000858, 600030</code>），系统会自动补全基础行情与行业；<br />
                  ② <strong>Excel/表格粘贴模式：</strong> 直接从 Excel / 网页表格复制粘贴，支持包含 <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-300">代码、名称、行业、股价、股息率、PE、PB、市值、ROE</code> 等列。
                </p>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    请在此粘贴股票文本或表格内容：
                  </label>
                  {batchText && (
                    <button 
                      onClick={() => { setBatchText(''); setParsedPreview([]); }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 transition"
                    >
                      清空输入
                    </button>
                  )}
                </div>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  onBlur={handleParseBatchText}
                  placeholder={`例如直接粘贴：\n600519 贵州茅台 食品饮料 1520.00 2.85 25.2\n000858 五粮液 食品饮料 135.00 3.65 16.8\n或直接输入：600519, 000858, 600030, 002415`}
                  rows={6}
                  className="w-full bg-slate-950/80 text-slate-100 font-mono text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Parse Action Bar */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleParseBatchText}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>智能解析预览</span>
                </button>

                {parsedPreview.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExecuteBatchImport}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-950/50 transition flex items-center gap-2 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>一键导入全部 ({parsedPreview.length} 只股票)</span>
                  </button>
                )}
              </div>

              {/* Parse Errors if any */}
              {parseErrors.length > 0 && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-200 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>解析提示：</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-300/90">
                    {parseErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {parseErrors.length > 5 && <li>以及其他 {parseErrors.length - 5} 项未识别...</li>}
                  </ul>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                  <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300">
                      解析成功预览 ({parsedPreview.length} 只标的)
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      确认无误后点击上方「一键导入」
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">代码</th>
                          <th className="py-2 px-3">名称</th>
                          <th className="py-2 px-3">行业</th>
                          <th className="py-2 px-3 text-right">现价(元)</th>
                          <th className="py-2 px-3 text-right">股息率(%)</th>
                          <th className="py-2 px-3 text-right">市盈率PE</th>
                          <th className="py-2 px-3 text-right">市净率PB</th>
                          <th className="py-2 px-3 text-right">分红年数</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {parsedPreview.map((item) => (
                          <tr key={item.code} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-mono font-bold text-indigo-300">{item.code}</td>
                            <td className="py-2 px-3 font-bold">{item.name}</td>
                            <td className="py-2 px-3 text-slate-400">{item.industry}</td>
                            <td className="py-2 px-3 text-right font-mono">¥{item.price.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono text-rose-400 font-bold">{item.ttmDividendYield.toFixed(2)}%</td>
                            <td className="py-2 px-3 text-right font-mono text-amber-300">{item.pe.toFixed(1)}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400">{item.pb.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-400">{item.dividendYears}年</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: SINGLE MANUAL FORM */}
          {activeTab === 'single' && (
            <form onSubmit={handleSaveSingleForm} className="space-y-4">
              
              {formError && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                
                {/* 股票代码 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    股票代码 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    disabled={!!editingCode}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="如 600519 或 000858"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 股票简称 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    股票简称 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如 贵州茅台"
                    className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 所属行业 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    所属行业
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {ALL_INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                {/* 现价 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    当前股价 (元)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="如 15.00"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 滚动股息率 TTM */}
                <div>
                  <label className="block text-xs font-semibold text-rose-300 mb-1">
                    滚动股息率 TTM (%) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={formData.ttmDividendYield}
                    onChange={(e) => setFormData({ ...formData, ttmDividendYield: e.target.value })}
                    placeholder="如 5.20"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-rose-500/50 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* 静态股息率 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    静态股息率 (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.staticDividendYield}
                    onChange={(e) => setFormData({ ...formData, staticDividendYield: e.target.value })}
                    placeholder="如 5.00"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 市盈率 PE */}
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">
                    市盈率 PE (TTM)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.pe}
                    onChange={(e) => setFormData({ ...formData, pe: e.target.value })}
                    placeholder="如 12.0"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 市净率 PB */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    市净率 PB
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.pb}
                    onChange={(e) => setFormData({ ...formData, pb: e.target.value })}
                    placeholder="如 1.20"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 连续分红年数 */}
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1">
                    连续分红年数 (年)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    value={formData.dividendYears}
                    onChange={(e) => setFormData({ ...formData, dividendYears: e.target.value })}
                    placeholder="如 10"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 总市值 (亿元) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    总市值 (亿元)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={formData.marketCap}
                    onChange={(e) => setFormData({ ...formData, marketCap: e.target.value })}
                    placeholder="如 350.0"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 净资产收益率 ROE */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    净资产收益率 ROE (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.roe}
                    onChange={(e) => setFormData({ ...formData, roe: e.target.value })}
                    placeholder="如 15.5"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 股利支付率 (%) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    股利支付率 (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.payoutRatio}
                    onChange={(e) => setFormData({ ...formData, payoutRatio: e.target.value })}
                    placeholder="如 60.0"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

              </div>

              {/* Description & Advantage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    主营业务与护城河描述
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="如：细分行业隐形冠军，市占率超30%，自由现金流稳定"
                    className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    分红优势说明
                  </label>
                  <input
                    type="text"
                    value={formData.dividendAdvantage}
                    onChange={(e) => setFormData({ ...formData, dividendAdvantage: e.target.value })}
                    placeholder="如：分红率承诺不低于60%，破净高股息防守标杆"
                    className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Status checkboxes */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isLeader}
                    onChange={(e) => setFormData({ ...formData, isLeader: e.target.checked })}
                    className="accent-indigo-500 rounded"
                  />
                  <span>行业龙头标杆</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isST}
                    onChange={(e) => setFormData({ ...formData, isST: e.target.checked })}
                    className="accent-rose-500 rounded"
                  />
                  <span className="text-amber-400">ST / *ST 股</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDelisted}
                    onChange={(e) => setFormData({ ...formData, isDelisted: e.target.checked })}
                    className="accent-rose-500 rounded"
                  />
                  <span className="text-rose-400">退市整理 / 风险警示</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCode(null);
                    setActiveTab('manage');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-950/50 transition active:scale-95"
                >
                  {editingCode ? '保存修改' : '确认添加至筛选池'}
                </button>
              </div>

            </form>
          )}

          {/* TAB 3: MANAGE CUSTOM STOCKS */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              
              {customStocks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">暂未导入任何自定义股票</p>
                  <p className="text-xs text-slate-500">
                    您可以切换至「批量粘贴导入」或「单只手动录入」添加您专属的高股息标的
                  </p>
                  <button
                    onClick={() => setActiveTab('batch')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>前往批量导入</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  
                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        当前已导入自定义股票：
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                        {customStocks.length} 只
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('batch')}
                        className="px-2.5 py-1 rounded bg-indigo-600/80 hover:bg-indigo-500 text-white text-[11px] font-semibold transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>继续导入</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`确定要清空全部 ${customStocks.length} 只自定义股票吗？`)) {
                            onClearCustomStocks();
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>清空全部自定义</span>
                      </button>
                    </div>
                  </div>

                  {/* Table of Custom Stocks */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">代码</th>
                            <th className="py-2.5 px-3">名称</th>
                            <th className="py-2.5 px-3">行业</th>
                            <th className="py-2.5 px-3 text-right">现价</th>
                            <th className="py-2.5 px-3 text-right">股息率(TTM)</th>
                            <th className="py-2.5 px-3 text-right">PE</th>
                            <th className="py-2.5 px-3 text-right">PB</th>
                            <th className="py-2.5 px-3 text-right">分红年数</th>
                            <th className="py-2.5 px-3 text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {customStocks.map((stock) => (
                            <tr key={stock.code} className="hover:bg-slate-800/40 transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">
                                {stock.code}
                              </td>
                              <td className="py-2.5 px-3 font-bold flex items-center gap-1.5">
                                <span>{stock.name}</span>
                                <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                  自定义
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{stock.industry}</td>
                              <td className="py-2.5 px-3 text-right font-mono">¥{stock.price.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-400 font-bold">
                                {stock.ttmDividendYield.toFixed(2)}%
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                                {stock.pe.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                {stock.pb.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                                {stock.dividendYears}年
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEdit(stock)}
                                    className="p-1 text-slate-400 hover:text-indigo-300 transition"
                                    title="编辑参数"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteCustomStock(stock.code)}
                                    className="p-1 text-slate-400 hover:text-rose-400 transition"
                                    title="删除此股票"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>数据将自动保存在当前会话与本地存储中，随时可导出 Excel / 高清图片</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
          >
            完成并关闭
          </button>
        </div>

      </div>
    </div>
  );
};
