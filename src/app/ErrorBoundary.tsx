import { Component, type ErrorInfo, type ReactNode } from 'react';
import stub from '@/styles/stub.module.css';

/** Экран ошибки: и для корневого ErrorBoundary, и как `errorElement` маршрутов. */
export function ErrorFallback() {
  return (
    <main className={stub.screen}>
      <section className={stub.card} role="alert">
        <h1 className={stub.title}>Что-то пошло не так</h1>
        <button type="button" className={stub.button} onClick={() => window.location.reload()}>
          Перезагрузить
        </button>
      </section>
    </main>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Корневой перехватчик ошибок рендера вне роутера (ошибки экранов ловит `errorElement`). */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Необработанная ошибка интерфейса', error, info.componentStack);
  }

  render() {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}
