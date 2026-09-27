import { Navigate } from 'react-router-dom';
import { ROLE_HOME } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import { PageLoader } from '@/pages/PageLoader';
import stub from '@/styles/stub.module.css';

/** `/` — на главный экран своей роли или на вход. */
export function RoleHome() {
  const { status, role, logout } = useAuth();

  if (status === 'loading') return <PageLoader />;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  if (role) return <Navigate to={ROLE_HOME[role]} replace />;

  // Бэк прислал роль, для которой у приложения нет раздела.
  return (
    <main className={stub.screen}>
      <section className={stub.card} role="alert">
        <h1 className={stub.title}>Нет доступа</h1>
        <p className={stub.muted}>Для этой учётной записи в приложении нет раздела.</p>
        <button type="button" className={stub.button} onClick={() => void logout()}>
          Выйти
        </button>
      </section>
    </main>
  );
}
