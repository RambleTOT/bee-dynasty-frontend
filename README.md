# Маршруты инженеров — фронтенд

Внутренний веб-инструмент «Билайн Бизнес» для планирования маршрутов выездных инженеров (ЛЦТ 2026, кейс №3).
Одно React-приложение, три роли — роль приходит с бэка после входа:

| Роль                     | Устройство                       | Раздел                                                                                 |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------------------------- |
| Диспетчер (`dispatcher`) | десктоп от 1280 px               | `/dispatcher` — календарь заявок, день на карте и таймлайне, события, сравнение планов |
| Оператор (`operator`)    | десктоп                          | `/operator` — запись клиентов во временные окна                                        |
| Инженер (`engineer`)     | телефон 360–430 px, веб-страница | `/engineer` — свой маршрут и статусы заявок                                            |

Бэкенд: `https://api.bee-dynasty.ru/api/v1`, Swagger — [`/docs`](https://api.bee-dynasty.ru/docs), схема — [`/openapi.json`](https://api.bee-dynasty.ru/openapi.json).

> Сейчас в репозитории каркас (этап 01): вход, роли, маршруты с заглушками экранов, клиент API, моки входа, скрипт снимка API. Экраны появляются в следующих этапах.

## Требования

- Node.js 20.19+ (версия — в `.nvmrc`: `nvm use`), npm 10+.

## Установка и запуск

```bash
npm i
npm run dev          # http://localhost:5173
```

## Переменные окружения

Шаблон — `.env.example`. Локальные значения — в `.env.local` (в git не попадает):

```bash
cp .env.example .env.local
```

| Переменная                                                                      | Для чего                                                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `VITE_API_URL`                                                                  | база API для фронта; по умолчанию `/api/v1` (в dev — через прокси Vite) |
| `VITE_USE_MOCKS`                                                                | `true` — вход работает на моках MSW, без бэка                           |
| `API_URL`, `DEMO_DISPATCHER`, `DEMO_OPERATOR`, `DEMO_ENGINEER`, `DEMO_PASSWORD` | только для `npm run snapshot`                                           |

Пароль демо-учёток пишем **только** в `.env.local`: не в код, README, фикстуры, снимки и коммиты.

## Скрипты

| Команда             | Что делает                                                      |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | dev-сервер; `/api` проксируется на `https://api.bee-dynasty.ru` |
| `npm run build`     | проверка типов + прод-сборка в `dist/`                          |
| `npm run preview`   | раздаёт `dist/` локально (с тем же прокси `/api`)               |
| `npm run check`     | `tsc --noEmit` (приложение и `vite.config.ts`) + `eslint .`     |
| `npm test`          | тесты (vitest, jsdom)                                           |
| `npm run format`    | prettier по всему проекту (спеки и макет не трогает)   |
| `npm run gen:types` | типы API из живой схемы → `src/api/schema.d.ts`                 |
| `npm run snapshot`  | снимок живых ответов API → `docs/api-examples/*.json`           |

**`npm run snapshot` меняет данные стенда** — на тестовой дате «сегодня + 30 дней» (Восток): загружает демо-день, строит и публикует план, создаёт событие и сразу отклоняет его предложение. Сегодняшний демо-день не трогает. Нужен `.env.local` с `DEMO_PASSWORD`. Токены и пароли в файлы снимка не пишутся. Порядок шагов — `docs/spec/FRONTEND_SPEC.md` §12.

## Моки

```bash
VITE_USE_MOCKS=true npm run dev
```

MSW (`src/mocks/`) отвечает на `/auth/login`, `/auth/me`, `/auth/logout`; остальные запросы идут на бэк как обычно.
Учётки моков: `dispatcher`, `operator`, `eng-east-01`, пароль `demo` — только для моков, к стенду отношения не имеет.
Истёкшую сессию можно проверить так: в DevTools заменить `localStorage.auth_token` на любое значение и обновить страницу — откроется `/login`.

## Прокси и прод

- В dev (`npm run dev`) и `npm run preview` запросы `/api/*` проксирует Vite (`vite.config.ts`) — CORS не нужен.
- В проде фронт — статика из `dist/`; адрес бэка — `VITE_API_URL=https://api.bee-dynasty.ru/api/v1` при сборке (нужен CORS на бэке) либо тот же прокси `/api` на веб-сервере.

## Демо-учётки стенда

Логины — `dispatcher`, `operator`, `eng-east-01`…`eng-east-12`, `eng-se-01`…, `eng-sc-01`… (см. гайд бэка `docs/spec/FRONTEND_AGENT_GUIDE.md`).
Пароль в репозиторий не кладём — он в исходном гайде бэка, у команды.

## Структура

```
.nvmrc  .env.example  index.html  vite.config.ts  eslint.config.js  tsconfig*.json
public/mockServiceWorker.js   # воркер MSW (npx msw init)
scripts/snapshot-api.mjs      # снимок живого API
docs/
  ARCHITECTURE.md             # слои, где что хранится, как добавить экран и ручку
  API_NOTES.md                # расхождения спеки и API
  api-examples/               # снимки ответов (npm run snapshot)
  spec/                       # ТЗ и решения — не редактируем
src/
  main.tsx  config.ts  vite-env.d.ts
  app/        # App, провайдеры, роутер, RequireRole, RoleHome, ErrorBoundary, лейауты
  api/        # клиент, ошибки, react-query, ключи, типы (schema.d.ts), ручки
  auth/       # токен, AuthProvider, useAuth, роли
  adapters/   # модели для экранов из ответов API (с этапа 02)
  features/   # экраны ролей: auth, dispatcher, operator, engineer
  pages/      # заглушки экранов, 404, лоадер
  hooks/      # useSearchState — типизированные query-параметры
  lib/        # time, statuses, notify
  mocks/      # MSW
  styles/     # tokens.css, globals.css
  test/       # настройка vitest
```

## Где спеки

- `docs/spec/FRONTEND_SPEC.md` (v2.2) — главное ТЗ: поведение, ручки, адаптеры, часы дня.
- `docs/spec/DESIGN_SPEC.md`, `docs/spec/UI_KIT_tokens.md` — компоненты, палитра, токены.
- `design/` — согласованный макет диспетчера: `dispatcher-shots/*.png`, `Dispatcher_Flow.html`, индекс `design/README.md`.
- `docs/spec/DECISIONS.md` (D-01…D-29), `docs/spec/FRONTEND_AGENT_GUIDE.md` (гайд бэка), `docs/spec/BACKEND_FIXES_27-09.md`.
- `samples/csv/` — CSV кейса для ручной проверки импорта (в git не попадают).
