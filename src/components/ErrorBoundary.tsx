import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Caught React Error via ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-2">应用运行保护机制已激活</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              检测到界面渲染状态更新抖动或模块刷新重载，数据已在本地安全存储。点击下方按钮即可快速恢复。
            </p>
            {this.state.error?.message && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300/80 mb-5 break-all text-left max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>立即恢复刷新</span>
              </button>
              <button
                onClick={this.handleClearAndReload}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 border border-slate-700 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>重置缓存并进入</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
