import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const tag = this.props.name ?? "anon";
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary:${tag}]`, error, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return (
      <div className="container py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <h2 className="font-display text-lg font-semibold">Algo deu errado nesta seção</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tente recarregar a página. Se o problema continuar, entre em contato com o suporte.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;