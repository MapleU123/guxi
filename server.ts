import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// 辅助函数：根据 6 位数字代码或带前缀代码生成腾讯行情标准代码
function formatTencentCode(rawCode: string): string {
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

// 格式化时间戳 YYYYMMDDHHMMSS -> YYYY-MM-DD HH:mm:ss
function formatQuoteTime(rawTime: string): string {
  if (!rawTime || rawTime.length < 14) {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }
  const y = rawTime.slice(0, 4);
  const m = rawTime.slice(4, 6);
  const d = rawTime.slice(6, 8);
  const hh = rawTime.slice(8, 10);
  const mm = rawTime.slice(10, 12);
  const ss = rawTime.slice(12, 14);
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

// 核心解析器：解析腾讯行情字符串
function parseTencentQuote(line: string) {
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
  const volume = parseFloat(parts[36]) || parseFloat(parts[6]) || 0; // 手
  const turnover = parseFloat(parts[37]) || 0; // 万元
  const turnoverRate = parseFloat(parts[38]) || 0; // %
  const pe = parseFloat(parts[39]) || 0; // 动态 PE
  const pb = parseFloat(parts[46]) || 0; // PB
  const marketCap = parseFloat(parts[45]) || 0; // 总市值 (亿元)
  const floatMarketCap = parseFloat(parts[44]) || 0; // 流通市值 (亿元)
  const rawTime = parts[30] || '';
  const formattedTime = formatQuoteTime(rawTime);

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
    rawTime,
    updateTime: formattedTime,
    queryTimestamp: Date.now()
  };
}

// 1. 单只股票真实行情 API
app.get('/api/quote/:code', async (req, res) => {
  try {
    const rawCode = req.params.code;
    const formatted = formatTencentCode(rawCode);
    
    const response = await fetch(`https://qt.gtimg.cn/q=${formatted}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch quote from upstream' });
    }

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder('gbk').decode(buffer);
    const quote = parseTencentQuote(text);

    if (!quote || quote.price === 0) {
      return res.status(404).json({ error: 'Stock code not found or quote unavailable' });
    }

    res.json({ success: true, data: quote });
  } catch (err: any) {
    console.error('Error fetching single quote:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 2. 批量股票当天真实行情 API
app.get('/api/quotes', async (req, res) => {
  try {
    const codesParam = (req.query.codes as string) || '';
    if (!codesParam) {
      return res.status(400).json({ error: 'Missing codes parameter' });
    }

    const codesList = codesParam
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 150); // 单次最多批量获取 150 支

    const formattedCodes = codesList.map(formatTencentCode);
    const url = `https://qt.gtimg.cn/q=${formattedCodes.join(',')}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch batch quotes from upstream' });
    }

    const buffer = await response.arrayBuffer();
    const text = new TextDecoder('gbk').decode(buffer);
    const lines = text.trim().split(';').filter((l) => l.trim().length > 0);

    const quotes: Record<string, any> = {};
    for (const line of lines) {
      const q = parseTencentQuote(line);
      if (q && q.code) {
        quotes[q.code] = q;
      }
    }

    res.json({
      success: true,
      count: Object.keys(quotes).length,
      data: quotes,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error fetching batch quotes:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 3. 健康检查 API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Vite middleware configuration for Full-Stack
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
