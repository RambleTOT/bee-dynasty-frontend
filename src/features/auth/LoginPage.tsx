import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { errorMessage, isApiError } from '@/api/errors';
import { homeAfterLogin } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import { PageLoader } from '@/pages/PageLoader';
import stub from '@/styles/stub.module.css';

/** S-01 Вход. Пока функциональная форма без дизайна (вёрстка по макету — этап 02). */
export function LoginPage() {
  const { status, role, login } = useAuth();
  const [searchParams] = useSearchParams();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === 'loading') return <PageLoader />;
  // Вошли (или уже были в сессии) — на главную своей роли.
  if (status === 'authenticated') {
    return <Navigate to={role ? homeAfterLogin(role, searchParams.get('next')) : '/'} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      await login(loginValue.trim(), password);
    } catch (err) {
      setError(
        isApiError(err) && err.status === 401 ? 'Неверный логин или пароль' : errorMessage(err),
      );
      setPending(false);
    }
  }

  return (
    <main className={stub.screen}>
      <form className={stub.card} onSubmit={(event) => void handleSubmit(event)}>
        <h1 className={stub.title}>Вход</h1>
        <label className={stub.field}>
          Логин
          <input
            className={stub.input}
            name="login"
            autoComplete="username"
            required
            value={loginValue}
            onChange={(event) => setLoginValue(event.target.value)}
          />
        </label>
        <label className={stub.field}>
          Пароль
          <input
            className={stub.input}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className={stub.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={stub.button} disabled={pending}>
          {pending ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </main>
  );
}
