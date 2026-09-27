# Архитектура фронтенда

## Слои

```
pages / features  →  adapters  →  api (client, schema)  →  бэк
```

- **`api/`** — транспорт и контракты: `client.ts` (единственное место с `fetch`), `errors.ts` (`toApiError` сводит три формата ошибок бэка), модули ручек `api/<domain>.ts`, типы из `schema.d.ts`.
- **`adapters/`** — превращают сырые ответы API в модели экранов: склейка, запасные подписи, синтетика (FRONTEND_SPEC §6). Покрываются тестами на снимках `docs/api-examples`.
- **`features/`** — экраны и их части по ролям; **`pages/`** — служебные страницы (заглушки, 404, лоадер).
- Компоненты **не ходят в `fetch`** напрямую и **не читают сырые ответы API** — только модели из `adapters/`. ESLint запрещает `fetch` вне `api/client.ts`.
- Общие модули: `lib/time.ts` (время Москвы, часы дня, окна), `lib/statuses.ts` (подписи статусов, флагов, справочников), `lib/notify.tsx` (уведомления), `hooks/useSearchState.ts` (query-параметры).

## Где что хранится

| Что                                          | Где                                                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Серверное состояние (всё, что пришло с бэка) | только react-query (`api/queryClient.ts`, ключи — `api/queryKeys.ts`)                               |
| Фильтры и открытые панели                    | в URL: `useSearchState` (`hooks/useSearchState.ts`)                                                 |
| localStorage                                 | только токен (`auth_token`) и UI-мелочи                                                             |
| Сессия                                       | `auth/AuthProvider.tsx`: токен + запрос `me`; `useAuth()` → `{ user, role, status, login, logout }` |

- Ответ 401 на запрос с токеном → событие `auth:unauthorized` → AuthProvider сбрасывает токен и кэш и ведёт на `/login`.
- Опрос: интервалы — `POLL` в `config.ts`; в фоновой вкладке опрос выключен (`refetchIntervalInBackground: false`).
- «Сейчас» — `nowFor(clock дня)` из `lib/time.ts`; часы дня во фронте не переводим.

## Роли и маршруты

- `/` — `RoleHome`: на главный экран роли (`ROLE_HOME` в `auth/roles.ts`) или на `/login`.
- `RequireRole` — пускает только свою роль: гостя — на `/login?next=…`, чужую роль — уведомление и главная своей роли.
- Лейауты: `DesktopLayout` (диспетчер, оператор, от 1280 px), `MobileLayout` (инженер, до 430 px).
- У каждой ветки роли — `errorElement`; ошибка экрана не убирает шапку с «Выйти».

## Правило модалок

**Модальный экран = query-параметр, а не маршрут.** DS-02, DS-04…DS-10, O-03, шторки инженера открываются параметрами страницы: `request=<id>` (DS-04), `proposal=<plan_id>` (DS-07), `modal=import|event|reassign|roster|compare|summary` (+ `event_type`, `order`). Ссылкой на открытую модалку можно поделиться; параметры пишутся с `replace: true`, поэтому история браузера не копится.

## Как добавить новый экран

1. **Роут** в `app/router.tsx` — или query-параметр, если это модалка (схема параметров — через `searchParam` в `useSearchState`).
2. **Модуль ручек** в `api/` (если нужных ручек ещё нет) — см. ниже.
3. **Адаптер** в `adapters/`: из ответов API — модель экрана, с тестом на снимке из `docs/api-examples`.
4. **Фича** в `features/<роль>/…`: компоненты берут модель адаптера и данные react-query, стили — CSS Modules на токенах `styles/tokens.css`.

## Как добавить ручку

1. **Типы** — из `schema.d.ts` (`npm run gen:types`): алиас в `api/types.ts`. Для ответов «без схемы» — ручной тип там же, сверенный со снимком.
2. **Функция** в `api/<domain>.ts` поверх `api.get / post / patch / postForm` из `api/client.ts`. DELETE-ручки не используем.
3. **Ключ** в `api/queryKeys.ts`; после мутаций инвалидируем префиксы по списку FRONTEND_SPEC §5.3.
