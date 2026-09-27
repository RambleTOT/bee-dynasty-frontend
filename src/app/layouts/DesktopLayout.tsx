import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { ROLE_LABEL } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import { PageLoader } from '@/pages/PageLoader';
import stub from '@/styles/stub.module.css';
import styles from './DesktopLayout.module.css';

/** Диспетчер и оператор: десктоп от 1280 px. Шапка — заглушка до AppBar (этап 02). */
export function DesktopLayout() {
  const { user, role, logout } = useAuth();
  return (
    <div className={styles.root}>
      <header className={styles.bar}>
        <span className={styles.product}>Маршруты инженеров</span>
        <span className={styles.user}>
          {role && <span className={stub.muted}>{ROLE_LABEL[role]}</span>}
          <span>{user?.name}</span>
        </span>
        <button type="button" className={stub.button} onClick={() => void logout()}>
          Выйти
        </button>
      </header>
      <main className={styles.main}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
