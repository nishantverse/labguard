import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("LabGuard UI Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-panel flex items-center justify-center p-6 text-gray-200">
          <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertOctagon size={28} />
            </div>
            <h2 className="text-xl font-bold text-gray-100 mb-2">SOC Console Interrupted</h2>
            <p className="text-sm text-gray-400 mb-4">
              An unexpected UI error occurred while rendering this view.
            </p>
            {this.state.error && (
              <div className="p-3 mb-6 bg-black/50 border border-gray-800 rounded-lg text-xs font-mono text-red-300 text-left overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-md active:scale-95"
            >
              <RotateCcw size={16} />
              Reload Console
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

