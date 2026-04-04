import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      let isSupabaseError = false;

      try {
        // Check if the error message is a JSON string from handleSupabaseError
        const errorData = JSON.parse(this.state.error?.message || '');
        if (errorData.error && errorData.operationType) {
          errorMessage = `Erro no banco de dados (${errorData.operationType}): ${errorData.error}`;
          isSupabaseError = true;
        }
      } catch (e) {
        // Not a JSON string, use the original message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-error" />
          </div>
          <h2 className="text-2xl font-extrabold text-on-surface mb-2 font-headline tracking-tight">
            Ops! Algo deu errado.
          </h2>
          <p className="text-secondary font-medium max-w-md mb-8">
            {errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-8 py-4 milled-gradient text-white rounded-2xl font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Recarregar Sistema
          </button>
          
          {isSupabaseError && (
            <p className="mt-6 text-xs text-secondary/60 max-w-xs italic">
              Se o erro persistir, verifique sua conexão ou as permissões do sistema.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
