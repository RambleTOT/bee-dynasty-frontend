import stub from '@/styles/stub.module.css';

export function PageLoader() {
  return (
    <div className={stub.screen} role="status" aria-live="polite">
      <span className={stub.muted}>Загрузка…</span>
    </div>
  );
}
