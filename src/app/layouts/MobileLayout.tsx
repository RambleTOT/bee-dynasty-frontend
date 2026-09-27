import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { PageLoader } from '@/pages/PageLoader';
import stub from '@/styles/stub.module.css';
import styles from './MobileLayout.module.css';

/** Инженер: веб-страница для телефона 360–430 px. Верхняя полоса — заглушка. */
export function MobileLayout() {
  const { user, logout } = useAuth();
  return (
    <div className={styles.root}>
      <header className={styles.bar}>
        <span className={styles.name}>{user?.name}</span>
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
