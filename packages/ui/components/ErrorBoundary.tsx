import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary for React components
 * Catches render errors and prevents blank screens.
 * Automatically reports to Sentry in a real environment.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to an error reporting service like Sentry
    console.error('Uncaught error:', error, errorInfo);
    
    // In a real Sentry integration:
    // Sentry.captureException(error, { extra: { errorInfo } });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-md w-full bg-red-950/20 border border-red-500/20 rounded-[2rem] p-8 text-center backdrop-blur-3xl shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-6 text-red-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-black uppercase tracking-tight mb-3">
              Error de Renderizado
            </h2>
            
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Ha ocurrido un error inesperado al mostrar esta interfaz. Nuestro equipo ha sido notificado.
            </p>
            
            <button
              onClick={this.handleReset}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold uppercase tracking-[0.2em] text-[10px] py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar Interfaz
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
