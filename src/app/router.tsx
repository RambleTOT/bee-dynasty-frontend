import { createBrowserRouter, Outlet, type RouteObject } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider';
import { LoginPage } from '@/features/auth/LoginPage';
import { NotFound } from '@/pages/NotFound';
import { Placeholder } from '@/pages/Placeholder';
import { ErrorFallback } from './ErrorBoundary';
import { DesktopLayout } from './layouts/DesktopLayout';
import { MobileLayout } from './layouts/MobileLayout';
import { RequireRole } from './RequireRole';
import { RoleHome } from './RoleHome';

/**
 * Экраны — маршруты. Модальные экраны (DS-02, DS-04…DS-10, O-03, шторки инженера) — не маршруты,
 * а query-параметры страницы: `request`, `proposal`, `modal=…` (FRONTEND_SPEC §4).
 *
 * У каждой ветки роли два `errorElement`: внутренний (без пути) ловит ошибки экранов и оставляет
 * шапку с «Выйти», внешний — ошибки самого лейаута.
 */
export const routes: RouteObject[] = [
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    errorElement: <ErrorFallback />,
    children: [
      { path: '/', element: <RoleHome /> },
      { path: '/login', element: <LoginPage /> },
      {
        path: '/dispatcher',
        element: (
          <RequireRole role="dispatcher">
            <DesktopLayout />
          </RequireRole>
        ),
        errorElement: <ErrorFallback />,
        children: [
          {
            errorElement: <ErrorFallback />,
            children: [
              { index: true, element: <Placeholder id="DS-01" title="Календарь заявок" /> },
              {
                path: 'day/:date',
                element: <Placeholder id="DS-03" title="День: Карта / Таймлайн" />,
              },
            ],
          },
        ],
      },
      {
        path: '/operator',
        element: (
          <RequireRole role="operator">
            <DesktopLayout />
          </RequireRole>
        ),
        errorElement: <ErrorFallback />,
        children: [
          {
            errorElement: <ErrorFallback />,
            children: [
              { index: true, element: <Placeholder id="O-01" title="Новая запись" /> },
              { path: 'search', element: <Placeholder id="O-02" title="Найти заявку" /> },
            ],
          },
        ],
      },
      {
        path: '/engineer',
        element: (
          <RequireRole role="engineer">
            <MobileLayout />
          </RequireRole>
        ),
        errorElement: <ErrorFallback />,
        children: [
          {
            errorElement: <ErrorFallback />,
            children: [
              { index: true, element: <Placeholder id="E-03" title="Мои заявки" /> },
              { path: 'request/:id', element: <Placeholder id="E-05" title="Карточка заявки" /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes, {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
