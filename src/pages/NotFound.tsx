import { Link } from 'react-router-dom';
import { ROLE_HOME } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import stub from '@/styles/stub.module.css';

export function NotFound() {
  const { role } = useAuth();
  return (
    <main className={stub.screen}>
      <section className={stub.card}>
        <span className={stub.muted}>404</span>
        <h1 className={stub.title}>Страница не найдена</h1>
        <Link to={role ? ROLE_HOME[role] : '/login'}>{role ? 'На главную' : 'Ко входу'}</Link>
      </section>
    </main>
  );
}
