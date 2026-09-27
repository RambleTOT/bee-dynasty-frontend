# ТЗ фронтенда — сервис планирования маршрутов инженеров

ЛЦТ 2026 · кейс №3 «Билайн Бизнес» · **версия 2.2 от 27.09.2026** — раздел диспетчера согласован по макету `design/Dispatcher_Flow.html`.
Исполнитель: Артём. Код пишем с нуля по готовым макетам. Бэк уже работает на `https://api.bee-dynasty.ru`.

**Что изменилось в v2.2 (27.09, ночь):**
- новый §6.8: синтетические наборы `*.instance.json` — каких полей нет, что показываем вместо них, признак синтетики, условные координаты;
- часы таймлайна и конец окна срочной заявки берём из смен бригад, а не 10:00–22:00: в наборах смена 09:00–19:00 (§8.2, §10.3);
- подписи типа — по навыку, если нет `type_bk`; короткие id вида `T012` выводим целиком (§8.2, §10.1);
- шаг 0 снимает и синтетический сценарий (§12), правила проекта (§16).

**Что изменилось в v2.1 (27.09, вечер):**
- §8.2 «Диспетчер» переписан по согласованному макету (D-25…D-29);
- «Построить план» = расчёт + публикация, черновика у CSV-дня нет; дата CSV = сегодня;
- фильтры одиночные, фильтра по флагам нет; день — всегда один регион;
- часы дня во фронте только показываются (§7);
- сравнение: + «Начато в окне» и «Просрочено», заполнение до плана; лента, версии, переназначение — по макету (§6.3–§6.7).

**Что изменилось в v2.0 относительно v1:**
- типы и ручки выверены по живой схеме `https://api.bee-dynasty.ru/openapi.json` (27.09);
- добавлены адаптеры и обходы для мест, где API расходится с макетами (§6);
- добавлены «Часы дня» (D-24): демо-время дня на сервере, по умолчанию реальное (§7);
- добавлен шаг 0 — снимок живых ответов API (§12).

**Смежные документы:**
- `design/Dispatcher_Flow.html` — **согласованный макет диспетчера** (источник правды по его виду).
- `DESIGN_SPEC.md` + папка `design/` — вёрстка остальных ролей. Экраны S-01, DS-01…DS-10, O-01…O-03, E-01…E-10. **Дизайн заморожен.**
- `UI_KIT_tokens.md` — стиль.
- `FRONTEND_AGENT_GUIDE.md` (от бэка) и Swagger `https://api.bee-dynasty.ru/docs` — API.
- `BACKEND_FIXES_27-09.md` — что бэк доделывает сейчас.
- `DECISIONS.md` (D-01…D-29).
- `*.instance.json`, `demo_30.json` — синтетические наборы алгоритма (§6.8).

**Метки:**
- [Д] — допущение;
- ⏳ — зависит от правки бэка из `BACKEND_FIXES_27-09.md`; для каждого такого места описан запасной путь;
- **P0** — видео и сдача 29.09; **P1** — если успеваем до 28.09 18:00.

**Критерии жюри:**
- Техническая реализация — 30% (качество кода, запуск по README);
- Соответствие задаче — 20% (7 шагов демо ТЗ §4);
- Эффективность и удобство — 15%.

---

## 1. Что строим
Одно React-приложение, три роли. Роль и регион приходят с бэка после входа.

| Роль | Устройство | Главное |
|---|---|---|
| Диспетчер (`dispatcher`) | десктоп ≥ 1280 | календарь заявок → день «Карта / Таймлайн» → объяснение, события, предложение с diff, сравнение наш / FIFO / реальный |
| Оператор (`operator`) | десктоп | запись клиента в свободное окно, авария, поиск, отмена, перенос |
| Инженер (`engineer`) | телефон, 360–430 px | свой маршрут, статусы, «Прервать выполнение», карта, ссылка в Яндекс Карты |

**Правила, которые влияют на код:**
1. **Изменения назначений принимает диспетчер.**
   - События дня отправляем с `apply: false`, бэк возвращает `proposed`; диспетчер нажимает «Принять» или «Отклонить».
   - Факты инженера («В пути», «В работе», «Выполнена») бэк применяет сразу.
   - Запись оператора бэк встраивает в план сам (D-18).
   - «Построить план» в CSV-дне сразу публикует план (D-25).
2. **«Сейчас» — это часы дня** (D-24, D-28):
   - если у дня заданы часы (`clock`), все «сейчас» берутся из них;
   - если нет — реальное время Europe/Moscow;
   - во фронте часы только показываются, переводит их бэк.
3. **Три ограничения** везде называются одинаково: «Квалификация», «Время», «Ресурс».
4. **Сравнение** всегда в 3 колонках: наш / базовый FIFO / реальный диспетчер.

---

## 2. Стек
| Что | Выбор |
|---|---|
| Сборка | Vite + React 18 + TypeScript (strict) |
| Роутинг | react-router 6 |
| Серверное состояние | @tanstack/react-query 5 |
| Карта | leaflet + react-leaflet 4, тайлы OSM |
| Даты | date-fns + локаль `ru` |
| Иконки | lucide-react |
| Стили | CSS Modules + `src/styles/tokens.css` (из `UI_KIT_tokens.md` и `DESIGN_SPEC` §2) |
| Типы API | `openapi-typescript` → `src/api/schema.d.ts` из живой схемы (§5.2) |
| Моки | msw 2 на фикстурах из снимка API (§12) |
| Качество | eslint + prettier + `tsc --noEmit` |

**Dev-прокси:** в `vite.config.ts` `server.proxy['/api'] → https://api.bee-dynasty.ru` (`changeOrigin: true`), поэтому при разработке CORS не нужен. В проде — `VITE_API_URL` и CORS на бэке ⏳.

Не берём: Redux, UI-киты (MUI и т. п.), готовые календари и Gantt. Календарь месяца и таймлайн — свои, на CSS Grid.

---

## 3. Структура
```
scripts/          snapshot-api.mjs (§12), gen-types.sh
docs/api-examples/  снимки живых ответов (*.json) — источник для адаптеров и моков
src/
  app/            router.tsx, providers.tsx, RequireRole.tsx, AppBar.tsx
  api/            client.ts, errors.ts, schema.d.ts (генерируется), types.ts (ручные типы для «obj»-ответов),
                  queryKeys.ts, auth.ts, calendar.ts, days.ts, data.ts, planning.ts, events.ts,
                  booking.ts, engineer.ts, visualization.ts, clock.ts
  adapters/       dayModel.ts, constraints.ts, compare.ts, proposal.ts, feed.ts, geo.ts, normalize.ts
  mocks/          browser.ts, handlers.ts (фикстуры = docs/api-examples)
  styles/         tokens.css, globals.css
  ui/             Button, SegmentedControl, FilterBar, StatusChip, FlagChip, Chip, Popover, Drawer, Modal,
                  BottomSheet, Toast, Banner, Field (Input, Select, DatePicker, TimePicker, Textarea,
                  Toggle, RadioPills, Dropzone), EmptyState, Skeleton, ErrorState, Tabs
  lib/            time.ts, format.ts, statuses.ts, dictionaries.ts, colors.ts, yandexMaps.ts, explainTexts.ts
  features/
    auth/         LoginPage
    dispatcher/
      calendar/   CalendarPage, MonthGrid, CalendarCell
      import/     ImportModal
      day/        DayPage, DayHeader, DayMenu (⋯), ProposalBanner, EngineerChips
        map/      DayMap, VisitMarker, RouteLayer, MapLegend
        timeline/ DayTimeline, EngineerRow, VisitBlock, NowLine, TimeAxis
        panel/    RightPanel, CompareTab, UnassignedTab, FeedTab, VersionsTab
      request/    RequestDrawer, ExplanationBlock
      events/     EventModal, ProposalDrawer, DiffList, DecisionCard
      reassign/   ReassignModal
      roster/     RosterDrawer
      summary/    CompareModal, DaySummaryModal
    operator/     BookingPage, SlotGrid, SearchPage, EmergencyModal
    engineer/     EngineerApp, PreviewScreen, TransportSheet, VisitList, ActiveVisitCard,
                  VisitCardPage, EngineerMap, InterruptSheet, IncidentSheet, UnavailableSheet,
                  PlanChangedBanner, ShiftSummary
design/           экспорт макетов — эталон вёрстки
```

---

## 4. Роуты и состояние в URL
Фильтры и открытые панели держим в query-параметрах.

| Путь | Экран | Параметры |
|---|---|---|
| `/login` | S-01 | — |
| `/` | редирект по роли из `GET /auth/me` | — |
| `/dispatcher` | DS-01 Календарь | `month=2026-09`, `region=all\|east\|south_east\|south_center` (по умолчанию `all`), `status`, `type` — по одному значению; `modal=import` (DS-02) |
| `/dispatcher/day/:date` | DS-03 День | `region` (один регион), `status`, `type`, `view=map\|timeline`, `tab=compare\|unassigned\|feed\|versions`, `engineer=<id>`, `request=<id>` (DS-04), `proposal=<plan_id>` (DS-07), `modal=event\|reassign\|roster\|compare\|summary` (+ `event_type`, `order`) |
| `/operator` | O-01 | `region`, `date` |
| `/operator/search` | O-02 | `q` |
| `/engineer` | E-01 / E-03 / E-04 | `view=list\|map` |
| `/engineer/request/:id` | E-05 | — |

- `RequireRole` пускает только свою роль.
- 401 → сброс токена и переход на `/login`.
- 403 → тост «Нет доступа к этому разделу» и редирект на главный экран роли.

---

## 5. API

### 5.1. Клиент (`api/client.ts`, `api/errors.ts`)
- **База:** `import.meta.env.VITE_API_URL ?? '/api/v1'`. Во время разработки — через прокси Vite.
- **Токен:** `Authorization: Bearer <access_token>`, хранится в `localStorage.auth_token`. Срок жизни — 21 день.
- **Ошибки.** У бэка три формата. `toApiError` сводит их в один `ApiError {status, code, message, details}`:
```ts
export function toApiError(status: number, body: any): ApiError {
  const e = body?.error ?? body?.detail?.error;                    // middleware | HTTPException
  if (e) return new ApiError(status, e.code, e.message, e.details);
  if (typeof body?.detail === 'string')                            // 422 ErrorResponse {detail, code, context}
    return new ApiError(status, body.code ?? 'VALIDATION_ERROR', body.detail, body.context);
  if (Array.isArray(body?.detail))                                 // 422 FastAPI HTTPValidationError
    return new ApiError(status, 'VALIDATION_ERROR', 'Проверьте заполнение полей', body.detail);
  return new ApiError(status, 'UNKNOWN', 'Не удалось выполнить запрос. Повторите');
}
```
- **Коды с особой реакцией:** `UNAUTHORIZED`, `FORBIDDEN`, `STALE_PROPOSAL`, `ILLEGAL_TRANSITION`, `COMMENT_REQUIRED`, `DUPLICATE_REQUEST`, `DATE_HAS_BOOKINGS`, `SLOT_TAKEN`, `BAD_CSV`, `ROWS_MISMATCH`, `REGION_UNKNOWN`, ⏳ `CLOCK_BACKWARD`.
- **Идентификатор заявки** в событиях и переназначении шлём как **`order_id`**: в схеме `request_id` помечен как устаревший алиас. Во всех остальных ручках — `request_id`, как в пути.
- **Опрос вместо вебсокетов:**

| Что | Интервал |
|---|---|
| День диспетчера (`/days`, план, лента) | 10 с |
| Экран инженера | 15 с |
| Календарь | 30 с |
| Слоты оператора | при изменении формы, debounce 300 мс |

  Опрос выключаем, когда вкладка скрыта: `refetchIntervalInBackground: false`.

### 5.2. Типы
1. **Генерация из живой схемы:** `npx openapi-typescript https://api.bee-dynasty.ru/openapi.json -o src/api/schema.d.ts` (скрипт `npm run gen:types`). Это источник правды для типизированных ответов. Ручные интерфейсы заводим только поверх `components['schemas'][...]`.
2. **Ответы без схемы** (в схеме тип «объект»): `/calendar`, `/days/{date}`, `/planning/{id}/requests/{rid}`, `/engineers/me/day`, `/engineers/me/route`, `GET /booking/requests`, ответы `cancel` / `reschedule`, `CompareResponse.columns` и `km_by_engineer`, `ReplanResult.applied_event`, `EventItem.payload`, `ReassignCheckResponse.checks`, `ExplanationOut.local_alternatives` / `schedule`.
   - Типы для них — в `api/types.ts` по гайду бэка.
   - Уточнить по снимкам `docs/api-examples/*.json` (§12).
   - В адаптерах для этих данных — только безопасный доступ (`?.`, значения по умолчанию).

**Главные схемы — кратко, по живой схеме 27.09:**
```ts
// PlanResponse
{ plan_id, scenario_id, parent_plan_id?, kind, status: 'draft'|'proposed'|'applied'|'rejected'|'superseded',
  version /*0 = черновик*/, strategy, event_id?, created_at,
  summary: { engineers_used, total_distance_km, planned_count, total_requests, unassigned_count, unassigned_urgent, objective[], elapsed_seconds? },
  metrics?: { optimized: MetricBlock, baseline: MetricBlock, engineers_saved, distance_saved_km, distance_saved_percent, extra_requests_planned },
  routes: RouteOut[], assignments: AssignmentOut[], unassigned: UnassignedOut[], explanations: ExplanationOut[],
  changes: object[], violations: object[], map_geojson?, algorithm_metadata }
// MetricBlock
{ engineers_used, total_distance_km, planned_count, total_requests, unassigned_count, unassigned_urgent }
// RouteOut
{ engineer_id, engineer_name, transport, transport_display, skills[], skills_display[], shift_start, shift_end,
  start_latitude?, start_longitude?, distance_km, task_count, route: RoutePoint[], geometry?: number[][], geometry_source?, explanation }
// RoutePoint
{ request_id, sequence, latitude, longitude, address?, arrival, start, end, travel_minutes, leg_distance_km, waiting_minutes,
  window_start, window_end, required_skill, required_skill_display, status, flags[], slack_minutes?, frozen,
  actual_arrival?, actual_start?, actual_end? }
// UnassignedOut
{ request_id, reason_code, reason, proven_static }
// ExplanationOut
{ request_id, status: 'assigned'|'unassigned', engineer_id?, engineer_name?, summary, reasons: string[], schedule?: object, local_alternatives: object[] }
// ScenarioOut — отсюда поля заявки и инженеров для карточек
{ scenario_id, name, region_id?, date?, source?, office?, active_plan_id?, draft_plan_id?, clock?, engineers: EngineerOut[], requests: RequestOut[] }
// RequestOut
{ id, latitude, longitude, address?, duration_minutes, window_start, window_end, priority, required_skill, required_skill_display,
  required_transport?, required_transport_display?, dispatcher_engineer_id?, external_id?, type_bk?, type_hd?, district?,
  gigabit, technology?, priority_rank, source, client_window_locked, status, flags[] }
// EngineerOut
{ id, name, latitude, longitude, shift_start, shift_end, skills[], skills_display[], transport, transport_display, available,
  start_kind, available_until?, shift_status, actual_transport?, assigned_tasks, distance_km }
// CompareResponse
{ region_id?, columns: { ours?: CompareColumn, fifo?: CompareColumn, dispatcher?: CompareColumn }, km_by_engineer: object, notes: string[] }
// CompareColumn
{ engineers_used, km_total, coverage_pct, unassigned_urgent, violations, km_is_estimate }
// ApplyEventRequest
{ type, plan_id?, event_time?, source?, order_id?, engineer_id?, request?: RequestIn, params?: object, apply?: boolean }
// RequestIn — обязательные: id, duration_minutes, window_start, window_end, required_skill
{ id, latitude?, longitude?, address?, duration_minutes, window_start, window_end, priority, required_skill, required_transport?,
  type_bk?, type_hd?, district?, gigabit?, technology?, source? }
// ReplanResult
{ event_id, event_type, previous_plan_id, status: 'applied'|'proposed', plan: PlanResponse, changes: object[], change_summary: object,
  applied_event: object, scenario: object, violations: object[] }
// PlanDiffResponse
{ base_plan_id, new_plan_id, summary: { reassigned, reordered, time_shifted, added, removed, newly_unassigned, newly_assigned, untouched },
  changes: object[], engineers: { engineer_id, km_before, km_after, route_changed }[], metrics_before, metrics_after, headline }
// PlanVersionResponse
{ plan_id, status, active_plan_id? }
// EventItem
{ event_id, event_type, plan_id?, scenario_id?, result_plan_id?, payload: object, needs_decision, created_at }
// ReassignRequest
{ plan_id?, order_id, to_engineer_id, position?, force? }
// ReassignCheckResponse
{ order_id, to_engineer_id, feasible, checks: object, new_start?, shifted_visits[], late_visits[], delta_km }
// BookingSlotsResponse
{ region_id, date, required_skill, duration_minutes, required_transport?, slots: { window, available, reason_code?, reason? }[] }
// BookingRequestIn
{ region_id, date, window, type_bk, type_hd?, address, district?, gigabit?, technology?, required_transport?, client_contact? }
// BookingRequestOut
{ request_id, scenario_id, status, tentative_engineer_id?, plan_id?, window }
// EngineerActionIn
{ action: 'shift_start'|'en_route'|'start'|'complete'|'fail'|'delay'|'unavailable'|'shift_end' (+ ⏳ 'incident'), request_id?, at?, payload? }
// EngineerActionOut
{ engineer_id, action, status, event_id?, request_id?, day? }
// EngineerVisit
{ request_id, sequence, status, flags[], type_bk?, type_hd?, address?, district?, window /*"10:00-12:00"*/, arrival?, start?,
  duration_minutes, leg_km, gigabit, technology?, why_you, lat?, lon? }
// UserOut
{ id, login, name, role, region_ids[], engineer_id? }
// RegionOut
{ region_id, name, office: { address, lat, lon }, request_count, engineer_count, demo_available, has_control }
```

**Ручные типы для ответов без схемы** (`api/types.ts`, по гайду — сверить со снимками):
```ts
export interface CalendarResponse { days: { date: string; request_count: number;
  by_status: Partial<Record<RequestStatus, number>>; flags: Partial<Record<Flag, number>>; sources: string[] }[] }
export interface DayRegion { region_id: RegionId; name: string; scenario_id: string; source: string; office: OfficeOut;
  active_plan_id: string | null; draft_plan_id: string | null; plan_state: 'none' | 'draft' | 'applied'; version: number;
  pending_proposals: { plan_id: string; event_id?: string; headline: string }[];
  last_recalc?: { at: string; request_id: string } | null;
  clock?: string | null /* ⏳ D-24 */ }
export interface DayResponse { date: string; regions: DayRegion[] }
export interface EngineerMeDay { date: string; plan_published: boolean; clock?: string | null /* ⏳ */;
  engineer: { id: string; name: string; transport: Transport; actual_transport?: Transport | null; shift_start: string;
              shift_end: string; shift_status: ShiftStatus; start?: { kind: string; address?: string; lat?: number; lon?: number } };
  summary: { total: number; done: number; km_planned?: number; first_start?: string | null };
  active_request_id?: string | null; visits: EngineerVisit[];
  banners: { type: string; text: string; at?: string; request_id?: string }[];
  shift_totals?: { done: number; total: number; started_in_window: number; km: number;
                   minutes_travel: number; minutes_work: number; minutes_wait: number; interrupted: number } }
export interface EngineerRoute { transport: Transport; start: { lat: number; lon: number; label: string };
  points: { request_id: string; sequence: number; lat: number; lon: number; address?: string }[];
  geometry: { type: 'LineString'; coordinates: [number, number][] } }   // [lon, lat]
export interface BookingSearchItem { request_id: string; region_id: RegionId; date: string; window: string;
  address: string; type_bk: string; type_hd?: string; status: RequestStatus }
```

### 5.3. Экран → ручка
| Экран / действие | Ручка | Примечание |
|---|---|---|
| Вход | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | демо-учётки — в README, пароль в `.env.local`, в код не кладём |
| DS-01 Календарь | `GET /calendar?from&to&region_id&status&type_bk` | по одному значению фильтра; фильтра по флагам нет (D-27) |
| DS-02 Импорт | `GET /regions` (число бригад) · `POST /data/import-beeline` (multipart: `requests_file`, `control_file?`, `region_id`, `date = todayMsk()`) | параллельно по регионам |
| DS-03 Шапка дня | `GET /days/{date}?region_id` | `plan_state`, `version`, `pending_proposals`, ⏳ `clock` |
| DS-03 Данные региона | `GET /data/scenarios/{scenario_id}` + `GET /planning/{active_plan_id ?? draft_plan_id}` (если есть) | склейка — §6.1 |
| DS-03 Карта | `GET /visualization/{plan_id}/geojson?geometry=road` | §6.6; до плана — точки из `ScenarioOut.requests` |
| DS-03 «Построить план» | `POST /planning/run {scenario_id, seed: 42, include_baseline: true}` → сразу `POST /planning/{plan_id}/apply` | D-25 |
| DS-03 «Начать рабочий день» | `POST /planning/{draft_plan_id}/apply` | только день из записей оператора |
| DS-03 «Сравнение», DS-05 | `POST /planning/compare {plan_id \| scenario_id, strategies}` + `POST /planning/baseline {plan_id}` | §6.3 |
| DS-03 «Лента» | `GET /events?scenario_id&limit=50` | §6.5 |
| DS-03 «Версии» | `GET /planning?scenario_id` | §8.2, ⏳ `version` и заголовок |
| DS-04 Карточка | данные из §6.1 + `plan.explanations` | только назначенные заявки (D-29) |
| DS-06 Событие | `POST /events/apply {apply: false, …}` | 3 события — §6.4 |
| DS-07 Предложение | `GET /planning/{new}/diff?against={previous_plan_id}` → `/apply` \| `/reject` | §6.4 |
| DS-08 Переназначение | `POST /planning/{id}/reassign/check` (кандидаты параллельно) → `/reassign` → `/apply` | §6.7 |
| DS-09 Состав | `GET /data/scenarios/{id}/engineers`; до публикации — `PATCH …/{engineer_id}`, `POST …/engineers`; после — `POST /events/apply` (`transport_changed`, `engineer_unavailable`, `engineer_available`); `POST /planning/{id}/extend-resource` | §8.2 |
| DS-10 Итоги | активный план + `compare` + `baseline` + `events` | §8.2 |
| O-01 Слоты и запись | `GET /booking/slots` → `POST /booking/requests` | `type_bk` — русская строка (§8.3) |
| O-02 Поиск, отмена, перенос | `GET /booking/requests?q&region_id&date`, `POST /booking/requests/{id}/cancel {reason}`, `…/reschedule {new_date, new_window}` | — |
| O-03 Авария | `POST /events/apply {type: 'urgent_order_added', source: 'operator', apply: false, plan_id, request}` | где взять `plan_id` — §8.3 ⏳ |
| E-01…E-10 | `GET /engineers/me/day`, `GET /engineers/me/route?remaining=true`, `POST /engineers/me/actions` | §9 |

После каждой мутации инвалидируем `['days', date]`, `['plan', id]`, `['scenario', id]`, `['events', scenarioId]`, `['calendar', month]`, `['engineerDay']`.

---

## 6. Адаптеры: где API расходится с макетами
Все обходы живут в `src/adapters/*` и покрываются юнит-тестами на фикстурах из `docs/api-examples`. Компоненты работают только с моделями адаптеров, а не с сырым API.

### 6.1. `dayModel.ts` — склейка плана, заявок и инженеров
В точке маршрута (`RoutePoint`) нет типа BK/HD, района, гигабита, технологии и требуемого транспорта. Поэтому на регион и день загружаем **`ScenarioOut`** один раз и строим:
```ts
type DayModel = {
  scenario: ScenarioOut; plan: PlanResponse;
  requests: Map<string, RequestOut>;          // по id
  engineers: Map<string, EngineerOut>;        // по id
  visits: Map<string, { point: RoutePoint; route: RouteOut }>;   // заявка → визит
  unassigned: Map<string, UnassignedOut>;
  explanations: Map<string, ExplanationOut>;
  engineerColor: Map<string, string>;         // §10.2
};
```
- Статус и флаги заявки: для назначенной — из `RoutePoint`, для остальных — из `RequestOut`.
- Стартовая точка инженера: `RouteOut.start_latitude/longitude`, иначе `EngineerOut.latitude/longitude`.
- До сборки модели данные проходят через `normalize.ts` (§6.8). В `DayModel` добавляются `synthetic: boolean` и `coordsApprox: boolean`, у заявок и бригад — готовые подписи (`label`, `typeShort`, `typeFull`, `addressText`).

### 6.2. `constraints.ts` — три ограничения в карточке заявки
В `ExplanationOut` нет разбивки по ограничениям: есть `summary` и `reasons[]` строками. Три строки «Квалификация / Время / Ресурс» **строим из фактов плана**. Это отображение, а не повторная проверка.
```ts
export function constraintRows(p: RoutePoint, r: RequestOut, e: EngineerOut): ConstraintRow[] {
  const eff = e.actual_transport ?? e.transport;
  const inWindow = toMin(p.start) >= toMin(p.window_start) && toMin(p.start) <= toMin(p.window_end);
  const inShift  = toMin(p.end) <= toMin(e.shift_end);
  return [
    { key: 'skill', label: 'Квалификация', ok: e.skills.includes(r.required_skill),
      text: `Нужен навык «${r.required_skill_display}», у бригады: ${e.skills_display.join(', ')}` },
    { key: 'time', label: 'Время', ok: inWindow && inShift,
      text: `Приезд ${p.arrival}${p.waiting_minutes ? `, ждёт окна ${p.waiting_minutes} мин` : ''}, начало ${p.start} `
          + `(окно ${p.window_start}–${p.window_end}), окончание ${p.end}, смена до ${e.shift_end}`
          + (p.slack_minutes != null ? `, запас ${p.slack_minutes} мин` : '') },
    { key: 'transport', label: 'Ресурс', ok: !r.required_transport || r.required_transport === eff,
      text: r.required_transport
        ? `Нужен ${r.required_transport_display}, бригада: ${TRANSPORT[eff]}`
        : `Особый транспорт не нужен, бригада: ${TRANSPORT[eff]}` },
  ];
}
```
- **Одна строка сверху** — `ExplanationOut.summary`. **«Подробнее»** — три строки выше + `reasons[]` списком.
- **«Почему не другие»** — `local_alternatives` (до 3 строк). Формат уточнить по снимку: ожидаем `engineer_id` / `engineer_name` + `reason` или `text`. Если формат другой — показываем `JSON`-поля `reason`, `text`, `why`, что найдётся.
- **Неназначенная заявка** — блок «Почему не назначена»: `UnassignedOut.reason`, подсказка из `lib/explainTexts.ts` по `reason_code` (тексты `DESIGN_SPEC` §7.2).
- Если строка у нашего плана получилась `ok=false` — показываем как есть, в консоль `console.warn('[constraints] mismatch', …)`: это баг валидатора, сообщить Кириллу.

### 6.3. `compare.ts` — три колонки
Строки — как в макете: Задействовано инженеров · Пробег суммарно, км · Неназначенные · Начато в окне · Просрочено. Под «Наш план» — Δ к базовому FIFO.

| Строка | Наш план | Базовый FIFO | Реальный диспетчер |
|---|---|---|---|
| Задействовано инженеров | `columns.ours.engineers_used` | `columns.fifo.engineers_used` | `columns.dispatcher.engineers_used` |
| Пробег суммарно, км | `columns.ours.km_total` | `columns.fifo.km_total` | `columns.dispatcher.km_total`; при `km_is_estimate` подпись «оценка» |
| Неназначенные | `plan.summary.unassigned_count` | `plan.metrics?.baseline.unassigned_count` ?? расчёт из `coverage_pct` | расчёт из `coverage_pct` |
| Начато в окне | `inWindow(plan.routes)` | `inWindow(baseline.baseline_routes)` | «—» |
| Просрочено | `lateCount(plan.routes)` | `lateCount(baseline.baseline_routes)` | «—» |

**Правила расчёта:**
- **Неназначенные из `coverage_pct`:** `round(total × (1 − coverage_pct / 100))`, где `total = plan.summary.total_requests`.
- **`inWindow(routes)`** = «N/M»:
  - M — число точек маршрутов;
  - N — точки, где начало (`actual_start ?? start`) лежит в `[window_start, window_end]`.
- **`lateCount(routes)`** — точки, где начало позже `window_end` или стоит флаг `late`.
- ⏳ Если бэк добавит эти поля в `CompareColumn`, берём с бэка.
- **`baseline`** — ответ `POST /planning/baseline {plan_id}`, из него нужен `baseline_routes`. Кэш — на версию плана.

**До построения плана** (`plan_state = none`):
- запрос `POST /planning/compare {scenario_id, strategies: ['fifo','dispatcher']}` ⏳;
- если бэк отвечает — заполняем FIFO и диспетчера, «Наш план» — «—»;
- подпись под таблицей: «Нажмите «Построить план», чтобы заполнить колонку «Наш план». Пробег реального диспетчера — оценка»;
- при ошибке — «—» во всех колонках.

**Особые случаи:**
- Нет ключа `dispatcher` в `columns` → колонка «нет данных: только для CSV-дня». На синтетическом наборе (§6.8) — «нет данных: синтетический набор».
- **«Пробег по инженерам, км» в панели — «наш / FIFO»:**
  - наш — `RouteOut.distance_km`;
  - FIFO — `baseline_routes[].distance_km`;
  - незадействованная бригада — «—».
- **Таблица DS-05** — колонки «Бригада · Заявок н / F / д · Км наш · FIFO · Дисп.*»:
  - «н» — `RouteOut.task_count`;
  - «F» — `baseline_routes[].task_count`;
  - «д» — число заявок с `RequestOut.dispatcher_engineer_id = id`;
  - км диспетчера по бригаде — из `km_by_engineer`, формат смотреть по снимку; если данных нет — «—».
- Подписи «пример» и «цифры — пример» из макета не выводим.

### 6.4. `proposal.ts` — событие → предложение
**Вкладки DS-06 — три события (D-26).** Во всех: `apply: false`, `source: 'dispatcher'`, `event_time` из поля «Время события» (по умолчанию — `nowFor(clock)` дня, подпись «По умолчанию — сейчас»). `plan_id` — активный план региона, выбранного в форме.

| Вкладка | `type` | Поля формы | Тело запроса |
|---|---|---|---|
| Срочная заявка | `urgent_order_added` | Время события · Регион · Адрес (свободный текст) · Тип заявки HD («Авария» / «Информация») · Требуемый транспорт (по умолчанию «Автомобиль») · инфо-строка «Аварийные работы · 80 мин на адресе · ориентир реакции до 2 ч» | `plan_id`, `event_time`, `request` (ниже) |
| Отмена | `order_cancelled` | Время события · Регион · Заявка (поиск по № или адресу среди заявок дня региона) · Причина («Клиент отказался» / «Другое» + текст) | `plan_id`, `event_time`, `order_id`, `params: {reason: 'client_refused' \| 'other', comment?}` ⏳ |
| Инженер недоступен | `engineer_unavailable` | Время («с какого времени») · Регион · Инженер (бригады региона на смене) · Причина — необязательно | `plan_id`, `event_time`, `engineer_id`, `params: {reason?}` ⏳ |

- Вкладки «Отмена» и «Инженер недоступен» в макете не нарисованы. Делаем в том же стиле, что «Срочная заявка»: сетка полей в 2 колонки, те же поля ввода и подписи.
- Строка «План не изменится, пока вы не примете предложение» и кнопки «Отмена» / «Рассчитать изменения» — на всех вкладках.
- «Смены транспорта» и «Задержки» у диспетчера нет. Транспорт меняется через «Состав и ресурсы» (DS-09).

**`request` для срочной заявки** (`RequestIn`):
```ts
{ id: `U-${Date.now().toString(36).toUpperCase()}`, address,            // адрес — свободный текст, геокодит бэк ⏳
  duration_minutes: 80, window_start: eventTime, window_end: shiftEnd /* max shift_end бригад региона на смене, не '22:00' */,
  priority: 'urgent', required_skill: 'emergency', required_transport: transport ?? 'car',
  type_bk: 'Глобальная проблема', type_hd: typeHd ?? 'Авария', source: 'dispatcher' }
```
Запасной путь, если бэк не геокодит адрес ⏳: поле «Адрес» подсказывает адреса заявок дня региона. Выбранная подсказка подставляет их `latitude` / `longitude`.

**Ответ → DS-07:**
1. `result.status === 'proposed'`: новый план — `result.plan`, прежний — `result.previous_plan_id`.
2. Запрос `GET /planning/{new}/diff?against={previous}`. Из ответа берём:
   - шапку: «Предложение: {событие}»; строку «Версия {v} → {v+1} · рассчитано в {HH:MM из plan.created_at}»;
   - заголовок-итог — `diff.headline`;
   - чипы-счётчики: Передано · Новый порядок · Сдвиг времени · Добавлено · Без исполнителя · Не тронуто.
3. **«Что изменится»** — `changes[]` сгруппированы по бригадам. Строка — тип и описание:

| Тип в `changes` | Строка в DS-07 | Пример |
|---|---|---|
| `added` | «Добавлена» | «U-0001 · Авария · 13:25–14:45» |
| `reordered` | «Новый порядок» | «…2310, U-0001, …5129» |
| `time_shifted` | «Сдвиг» | «№…5129: 14:00 → 15:00 (+60 мин)» |
| `reassigned` | «Передана» | «№…7780: Бригада Соколов → Бригада Мельников, 16:00 → 16:20» |
| `removed` | «Снята» | — |
| `newly_unassigned` | «Без исполнителя» | — |

   Незнакомый тип — строка «Изменение: {type}», без падения.
4. Итоговая строка: «Инженеров X → Y · Пробег A → B км (±Δ)» — из `metrics_before` / `metrics_after`.
5. **Карточка решения по аварии** — только для `urgent_order_added`:
   - поля — из `applied_event.decision ?? applied_event`: `engineer_id`, `arrival`, `reaction_minutes`, `rule`, `alternatives[]`;
   - если их нет — берём из diff (`added` по срочной заявке → бригада и начало; реакция = начало − `event_time`);
   - вид: чип «Срочная», «Бригада X — прибытие HH:MM, реакция N мин», правило одной строкой, таблица «Бригада · Свободна · В пути · Прибытие» с пометкой «выбрана»;
   - реакция > 120 мин → флаг «Реакция > 2 ч».
6. **«Показать на карте»:** изменённые маршруты подсвечены, старые — серым пунктиром.
7. **Кнопки:**
   - «Принять изменения» → `POST /planning/{new}/apply` → тост «Версия N применена. Инженеры получили обновление»;
   - «Отклонить» → `/reject`;
   - «Править вручную» → DS-08 на базе предложенного плана.
8. **`409 STALE_PROPOSAL`** → в дровере «План уже изменился. Пересчитать?» → повторяем тот же `POST /events/apply`. Тело запроса храним в состоянии дровера.
9. **Режим просмотра** — открыт из «Версии»: diff двух версий без карточки решения и без кнопок.
10. **Предложения, ждущие решения** — `DayRegion.pending_proposals`:
    - тёмный баннер под шапкой дня;
    - строки ленты с `needs_decision` (кнопки «Открыть» / «Решить») → `proposal=<plan_id>` → DS-07;
    - так же решаются «Отменяется» / «Переносится» от инженеров (D-29).

### 6.5. `feed.ts` — лента дня
Как в макете: фильтр «Все / Требуют решения N», строки новые сверху.

**Строка ленты:** время · иконка типа · текст · (необязательно) чип статуса или флага · вторая строка · действие справа.

| Поле | Откуда |
|---|---|
| Время | `payload.event_time ?? created_at` в HH:MM (Europe/Moscow) |
| Текст | `payload.headline` ⏳; иначе шаблон по `event_type` из `DESIGN_SPEC` §7.3 со значениями из `payload` (номер — последние 4 цифры с «…» или полный, имена бригад — из `DayModel`) |
| Чип | статус или флаг заявки из `payload` (`status`, `flag`): «Просрочена», «Отменяется», «Под угрозой» — `StatusChip` / `FlagChip` |
| Вторая строка | «Принято в HH:MM» — если есть применённый `result_plan_id`; «по плану версии N» — для фактов инженера |
| Действие | `needs_decision` и есть `result_plan_id` → «Открыть» (DS-07). Заявка в `cancel_pending` / `reschedule_pending` → «Решить» (DS-07 её предложения) |

**Иконки по типу:**

| Тип события | Иконка |
|---|---|
| `urgent_order_added` | `zap` |
| `order_cancelled`, `fail` | `x-circle` |
| `engineer_unavailable` | `user-x` |
| `order_added` (запись встроена) | `calendar-plus` |
| применена версия | `check` |
| `at_risk` | `clock-alert` |
| `late` | `alarm-clock-off` |
| факты инженера | `map-pin` |
| остальное | `circle-dot` |

- **Какие события должны приходить в ленту** ⏳ (правка бэка): события из `/events/apply`, факты инженера (прибыл, начал, выполнил, прервал), системные (версия применена, «Под угрозой», «Просрочена», запись встроена).
- **Бейдж на вкладке «Лента»** — число `needs_decision` [Д].

### 6.6. `geo.ts` — геометрия карты
- Для карты используем **`GET /visualization/{plan_id}/geojson?geometry=road`**: там порядок координат `[lon, lat]` задан явно. `RouteOut.geometry` не используем — порядок не описан.
- Какому инженеру принадлежит линия — `feature.properties.engineer_id`; уточнить по снимку.
- Если GeoJSON не пришёл или пуст — рисуем прямые отрезки по `start_latitude/longitude` → `RoutePoint.latitude/longitude` по `sequence`.
- `geometry_source` для не-авто: линия автомобильная, время — расчётное. Подписываем в легенде: «линия — по дорогам, время — по типу транспорта».
- **До построения плана** — только точки заявок из `ScenarioOut.requests` (нейтральные маркеры) и офис. По центру сверху плашка «{N} заявок загружены из CSV · план ещё не построен».
- **Условные координаты синтетики** — перенос к офису, прямые отрезки вместо дорог, без кнопки Яндекса: §6.8.

### 6.7. Ручное переназначение (DS-08)
- Заголовок: «Заявка №… → инженер», подпись «{Тип} · окно {окно} · {адрес}».
- **Кандидаты** — бригады региона на смене, кроме текущей:
  - сначала фильтр на фронте по навыку и транспорту;
  - не прошедшие фильтр идут вниз списка с меткой «Нет навыка» / «Нет авто» и без запроса к API;
  - для остальных — до 5 ближайших к заявке — параллельно `POST /planning/{id}/reassign/check {order_id, to_engineer_id}`.
- **Строка кандидата:** точка цвета, «Бригада X», подпись и метка.
  - Подпись: «свободен HH:MM · X км» / «начало HH:MM» / «пешком · X км» — из `new_start`, `delta_km`, транспорта.
  - Метки по ответу `check`:

| Ответ | Метка |
|---|---|
| `feasible` | «Подходит» (success) |
| нарушено окно | «Вне окна» (danger) |
| прочее нарушение | «Нарушение» (danger) |

- **«Позиция в маршруте»** — select «После №… · начало HH:MM» по точкам маршрута выбранной бригады (`position` = номер точки + 1). При смене — повторный `check`.
- **Результат проверки:**
  - `feasible` → зелёная плашка «Все три ограничения соблюдены»;
  - иначе — красная плашка со списком нарушений: ключи `checks` сводим к «Квалификация / Время / Ресурс» по словарю (`skill, qualification → Квалификация`; `time, window, shift → Время`; `transport, resource → Ресурс`). Текст — из значения или шаблон, например «Время: начало 16:40 вне окна 14–16».
- **Чипы-последствия:**
  - «Уйдут в просрочку: №… / нет» — из `late_visits`;
  - «Пробег ±X км» — из `delta_km`;
  - «Инженеров ±N» — считаем сами: −1, если маршрут «откуда» опустеет; +1, если маршрут «куда» был пуст.
- **Кнопки:**
  - `feasible` → primary «Применить»;
  - иначе → «Применить с нарушением» (иконка ⚠, после подтверждения, `force: true`).
  - Оба варианта: `POST /reassign {order_id, to_engineer_id, position, force}` → `ReplanResult` (`proposed`) → сразу `POST /planning/{new}/apply`. Это ручное решение диспетчера, второго подтверждения не нужно [Д].

### 6.8. `normalize.ts` — синтетические наборы (`*.instance.json`) · P0
**Что это.** Алгоритм бэка работает и на синтетических наборах `{pattern}_n{заявок}_k{бригад}_seed{N}.instance.json`: pattern — `clustered` / `mixed` / `spread`, в проекте сейчас n30_k8 × 6 файлов и `demo_30.json`, у бэка есть и n60_k12. Это формат **входа алгоритма**, а не ответ API. Фронт видит эти данные только через `ScenarioOut` / `PlanResponse`. В наборе нет полей CSV-дня, поэтому у заявки и бригады надёжно заполнены только id, окно, длительность, навык, транспорт и смена. Остальное может прийти пустым или условным.

**Формат набора** (факт, проверено по 7 файлам проекта):
```
tasks[]:     id "T000", node, duration (мин), window_start / window_end (мин от полуночи),
             skill: local | installation | emergency, transport: null | 'car', urgent, release_time
engineers[]: id "E00", start_node, shift_start / shift_end (мин), skills[], transport, used_today,
             available (в demo_30 поля нет), locked_prefix[]
travel_minutes{car, walk, bike, public_transport}, distance_m{…}: матрицы N×N, N = k + n
             (узлы 0…k−1 — старты бригад, дальше — заявки)
service_by_engineer, previous_assignment, previous_predecessor — для перепланирования
metadata: synthetic, seed, pattern, coordinates_km [[x, y]] (плоские км, не широта/долгота), warning
```

**Поле набора → API → экран → запасное значение.** Всё — в `adapters/normalize.ts`. Компоненты берут готовые подписи, сырые поля напрямую не читают.

| В наборе | В API | Где на экране | Если пусто |
|---|---|---|---|
| `id` "T000" | `RequestOut.id` | везде | `shortId`: id ≤ 6 символов — целиком («№T012»), длиннее — «…7741» |
| `window_start/end`, мин | `window_start/end` "HH:MM" | окна, таймлайн | есть всегда |
| `duration` | `duration_minutes` | DS-04 | подпись «{N} мин» без «по нормативу» |
| `skill` | `required_skill` | тип, фильтр, «Квалификация» | есть всегда |
| `transport` | `required_transport` | «Ресурс» | `null` → «любой» |
| `urgent` | `priority`, флаг `urgent` | чип «Срочная» | Это не авария. В наборах срочными бывают локальные заявки и подключения, а аварийные — несрочные. Красный маркер с `zap` ставим по навыку `emergency`, чип «Срочная» — по `urgent` |
| — | `type_bk`, `type_hd` | карточка, таймлайн, тултип, фильтр «Тип заявки» | подпись по навыку: `emergency` «Авария» · `installation` «Подключение и дозаказ» (коротко «Подкл.») · `local` «Локальные работы» («Лок.»); фильтр «Тип заявки» на таком дне — по навыку |
| — | `address` | DS-04, «Неназначенные», поиск в DS-06, DS-08 | «Адрес не указан» (серым); поиск — только по номеру |
| — | `district` | DS-04, «Неназначенные» | строку не выводим |
| — | `gigabit`, `technology` | DS-04 | строку не выводим |
| — | `dispatcher_engineer_id` | «Сравнение», DS-05 «д» | «нет данных: синтетический набор» / «—» |
| `coordinates_km` | `latitude/longitude` | карта, Яндекс Карты | см. «Координаты» ниже |
| engineer `id` "E00" | `EngineerOut.id`, `name` | чипы, таймлайн, DS-08, DS-09 | `name` пуст или равен id → «Бригада E00», в чипе — «E00» |
| `start_node` | `latitude/longitude`, `start_kind` | старт маршрута | координаты — как у заявок; `start_kind` пуст → «старт» |
| `shift_start/end`, мин | `shift_start/end` "HH:MM" | таймлайн, «Время» | есть всегда. **В наборах 09:00–19:00, в CSV-днях 10:00–22:00** — часы нигде не зашиваем |
| `available` | `available` | DS-09 | нет поля (`demo_30`) → `true` |
| — | `ScenarioOut.date`, `region_id`, `office` | шапка, календарь, маркер офиса | дату ставит бэк при загрузке [Д]; без `office` маркер офиса не рисуем |

**Фронту не нужны, не запрашиваем и не храним:**
- `travel_minutes`, `distance_m` — для n60_k12 это 72 × 72 × 8 ≈ 41 тыс. чисел; время и км по плечу уже есть в `RoutePoint.travel_minutes` / `leg_distance_km`;
- `node`, `start_node`, `used_today`, `locked_prefix`, `previous_assignment`, `previous_predecessor`, `service_by_engineer`, `release_time` — внутренние поля алгоритма; их результат фронт видит через `RoutePoint.frozen`, diff и метрики;
- `metadata.seed`, `metadata.pattern` — только для README и таблицы прогонов.

**Признак синтетики** `isSynthetic(scenario)` [Д] — по первому сработавшему условию:
1. `scenario.source` содержит `synth` / `instance` / `bench` ⏳ (явное значение просим у бэка);
2. id заявок вида `T\d{3}`, бригад — `E\d{2}`;
3. точки вне рамки Московского региона: широта 54,2…57,0, долгота 35,1…40,3.

**Что меняется на синтетическом дне:**
- бейдж «Синтетика» рядом с «CSV» в шапке дня и в «Сравнении». Тултип: «Координаты, длительности и состав бригад сгенерированы. Для оценки на реальных данных — дни из CSV» (это `metadata.warning`);
- **координаты.** Если пришли условные (точка вне рамки региона — например, бэк положил `coordinates_km` в `latitude/longitude` как есть, и точки оказались в Африке), переносим облако к офису региона (нет офиса — центр Москвы 55,751 / 37,618):
  `lat = lat0 + (y − ȳ) / 111,32`, `lon = lon0 + (x − x̄) / (111,32 · cos lat0)`,
  где x — пришедшая долгота, y — широта, x̄ / ȳ — средние по всем точкам дня (заявки и старты бригад).
  - Одно преобразование — для точек, стартов и линий GeoJSON.
  - Дорожную геометрию не берём, рисуем прямые отрезки.
  - На карте плашка «Координаты условные»;
- кнопку «Маршрут в Яндекс Картах» не показываем: координаты условные;
- «Реальный диспетчер» — «нет данных: синтетический набор», в DS-05 колонка «д» — «—»;
- экран инженера на синтетике не проверяем: у бригад `E00…` нет учётных записей.

**Особенности наборов, которые видны в интерфейсе.** У всех 8 бригад одна смена 09:00–19:00, окна заканчиваются не позже 18:00, бригад с одним навыком нет. Поэтому на синтетике ограничения «Время (смена)» и «Квалификация» срабатывают редко. Три ограничения и три колонки сравнения показываем в демо на CSV-дне Востока, синтетику — только для масштаба.

**Масштаб.** n60_k12 — 60 заявок и 12 бригад. 12 цветов палитры хватает ровно. Если бригад больше 12, цвета идут по кругу, у повторов линия пунктиром (§10.2). Ряд чипов бригад уже прокручивается.

**Тесты (vitest)** на фикстуре `docs/api-examples/synthetic-scenario.json` (снимок §12, шаг 17). Если бэк не отдаёт синтетику через API — ручная фикстура на 3 заявки и 2 бригады: пустые `type_bk` / `address` / `district` / `technology`, id `T000`, координаты в плоских км. Проверяем:
- подписи по навыку и «№T000»;
- перенос координат к офису;
- скрытую кнопку Яндекс Карт;
- «нет данных» у диспетчера;
- ось таймлайна 09–19.

---

## 7. Часы дня (D-24, D-28) · P0
**Зачем:** смена идёт 10:00–22:00, а видео пишем вечером, эксперты открывают стенд после 23:00. Поэтому у дня есть серверные часы. Если их нет — реальное время.

**Во фронте часы только показываются — элемента управления нет (D-28).**
- `clock` дня — в `DayRegion.clock` ⏳ и в `ScenarioOut.clock`; у инженера — в `EngineerMeDay.clock` ⏳.
- `lib/time.ts`: `nowFor(clock) = clock ?? nowMsk()`.
- **Где используется:**
  - в шапке дня — «Версия N · сейчас HH:MM»;
  - время события в DS-06 по умолчанию;
  - линия «сейчас» на таймлайне;
  - `at` у действий инженера **не шлём**: бэк берёт часы дня.
- **Кто переводит часы:**
  - бэк при старте сидит демо-день Востока с часами 12:30;
  - для видео — `POST /data/scenarios/{id}/clock {time, autoplay: true}` через Swagger. Инструкция — в README, раздел «Демо-время».
- **Запасной путь**, если бэк не вернёт часы до 28.09 12:00: параметр `?clock=HH:MM` в адресе дня диспетчера. `event_time` тогда шлём явно; автопрогона нет, видео снимаем от начала смены.

---

## 8. Экраны: логика
Вёрстка:
- **диспетчер** — макет `design/Dispatcher_Flow.html` (согласован 27.09). При расхождении с `DESIGN_SPEC` §6 прав макет и этот раздел;
- остальные роли — `design/` и `DESIGN_SPEC` §6.

Здесь только поведение и данные.

### 8.1. Общее
- **S-01 Вход:**
  - `POST /auth/login` → токен → `GET /auth/me` → редирект по `role`;
  - ошибка 401 — «Неверный логин или пароль»;
  - подвал: «Кейс от Билайн Бизнес · ЛЦТ 2026 · прототип».
- **AppBar (десктоп):**
  - логотип, «Билайн Бизнес · Маршруты инженеров»;
  - у диспетчера — вкладки «Календарь / День»;
  - справа — имя, подпись «{Роль} · {все регионы | названия регионов}», «Выйти» (`POST /auth/logout` → очистить токен и кэш).

### 8.2. Диспетчер — итоговое ТЗ (согласовано по макету 27.09)
**Общее для экранов диспетчера:**
- Вкладка «День» ведёт на последний открытый день (`sessionStorage.last_day`), иначе на сегодня.
- **Фильтры** — «Регион · X», «Статус», «Тип заявки». Каждый — один выбор, «Сбросить» есть только в календаре. **Фильтра по флагам нет** (D-27).
- **Регион:**
  - в календаре можно выбрать «Все регионы»;
  - день всегда показывает **один** регион. Из календаря с «Все регионы» открываем первый регион пользователя [Д]. Группировки по регионам нет.

**DS-01 Календарь заявок · P0**
- **Шапка:** «Календарь заявок», переключатель месяца, «Сегодня»; справа «{N} заявок за месяц · {K} региона». N — сумма `request_count`.
- **Легенда и полоса в ячейке — по статусам ТЗ** (D-29), не по группам макета:
  - сегменты по `by_status` в порядке: `done`, `in_progress`, `en_route`, `planned`, `cancel_pending`, `reschedule_pending`, `unassigned`;
  - тона — из `lib/statuses.ts`;
  - `cancelled` и `rescheduled` в полосу не входят;
  - легенда показывает только статусы, которые встречаются в месяце.
- **Ячейка:**
  - число, бейдж «CSV» (если в `sources` есть `csv` / `demo`), «N заявок»;
  - полоса статусов;
  - «N не назначена» — из `by_status.unassigned`, иконка `alert-circle`;
  - «N просрочена» — из `flags.late`, иконка `alarm-clock-off`;
  - сегодня — тёмная рамка и подпись «СЕГОДНЯ»; дни соседних месяцев приглушены; пустой день — «—».
- **Подсказка по наведению:** «Пн, 29 сентября · 66 заявок» + строка на каждый ненулевой статус (подпись и число) + «Флаг «Просрочена» N».
- **Клик** → `/dispatcher/day/:date?region=…`.
- **Состояния:** загрузка — скелетоны ячеек; пустой месяц — «В этом месяце заявок нет. Загрузите CSV или дождитесь записей оператора».
- Primary в AppBar — «Загрузить CSV» (`modal=import`).

**DS-02 Загрузка CSV · P0**
- **Шаг 1 — «Загрузка CSV»:**
  - подпись «Шаг 1 из 2 · файлы. Можно загрузить от 1 до 3 регионов»;
  - три карточки регионов: название + «N бригад» (из `GET /regions` → `engineer_count`);
  - в карточке две зоны: «Файл заявок (.csv)» («Перетащите файл или выберите») и «Контрольное распределение — по желанию» («Нужен для сравнения с реальным диспетчером»);
  - выбранный файл: имя, «66 строк · 48 КБ» (строки считаем на клиенте: без заголовка, пустых строк и строки «Адрес Офиса»), кнопка ✕;
  - кнопки «Отмена» и primary «Загрузить» — активна, если есть хотя бы один файл заявок.
- **Даты нет** (D-26): `date = todayMsk()`. Регионы грузим параллельно через `POST /data/import-beeline`. Ссылки на демо-набор нет.
- **Шаг 2 — «Отчёт импорта · Шаг 2 из 2 · план на DD.MM.YYYY»**, карточка на регион:
  - бейдж «Готово» — если нет замечаний; «Есть замечания» — если есть предупреждения, пропущенные строки или нет контрольного файла;
  - строки с иконками из `import_report`:
    - «Загружено X из Y заявок»;
    - «Офис: …»;
    - «Автомобиль нужен N заявкам (заполнено правилом: …)»;
    - «Назначений реального диспетчера: X из Y»;
    - предупреждения — списком;
    - «N строки пропущены: …»;
    - без контрольного файла — «Контрольный файл не загружен: в колонке «Реальный диспетчер» будет «нет данных»».
  - подвал: «Всего N заявок · K региона · M бригад», «Назад», primary «Открыть день» → `/dispatcher/day/<date>?region=<первый загруженный>`.
  - **Ошибка региона** (`BAD_CSV`, `ROWS_MISMATCH`, `REGION_UNKNOWN`, `DATE_HAS_BOOKINGS`) — та же карточка с красным бейджем «Ошибка» и `message` из `ApiError`. Макета нет, делаем в коде в стиле карточки «Есть замечания».

**DS-03 День · P0**
- **Шапка:**
  - «‹ Пн, 29 сентября ›» (предыдущий / следующий день), бейдж «CSV»;
  - статус: `plan_state = none` → «{N} заявок · плана нет»; иначе «Версия N · сейчас HH:MM» (§7);
  - фильтры «Регион», «Статус», «Тип заявки»;
  - кнопки справа:

| Состояние | Второстепенные | Primary |
|---|---|---|
| `none` (CSV-день) | «Состав и ресурсы» | **«Построить план»** → `POST /planning/run` → сразу `POST /planning/{plan_id}/apply` (D-25). Лоадер «Строим план…» |
| `draft` (день из записей оператора) | «Состав и ресурсы» | «Начать рабочий день» → `POST /planning/{draft_plan_id}/apply` |
| `applied` | «Итоги дня» + меню «⋯» → «Состав и ресурсы» | «Добавить событие» |

- **Баннер предложения** (тёмный, под шапкой) — если есть `pending_proposals`:
  - текст «Есть предложение после события «{событие}»: изменилось N назначений»;
  - справа «HH:MM · ждёт решения» и кнопка «Открыть» → DS-07;
  - N = сумма счётчиков diff (передано + новый порядок + добавлено + снято + без исполнителя).
- **Слева:**
  - сегменты «Карта / Таймлайн»;
  - чипы «Все бригады · 12» и по бригаде: точка цвета, фамилия (без «Бригада»), иконка транспорта, «{task_count} · {distance_km} км» (не задействована — «—»);
  - ряд чипов прокручивается по горизонтали;
  - клик по чипу — фильтр бригады: на карте остальные маршруты 30%, на таймлайне строка подсвечена [Д].
- **Карта:**
  - до плана — §6.6;
  - после плана:
    - маршруты с номерами точек;
    - выполненная точка — «галочка» цвета бригады;
    - авария — красный маркер с `zap`;
    - неназначенная — красный пунктирный круг с «!»;
    - офис;
    - кнопки масштаба +/−;
    - легенда свёрнута: «Легенда · линия = маршрут бригады»;
  - тултип: «№305838184 · Подключение · окно 18–20 / Бригада Соколов · начало 18:00»;
  - клик по назначенной → DS-04; по неназначенной → вкладка «Неназначенные» с прокруткой к заявке (D-29).
- **Таймлайн:**
  - шапка «БРИГАДА» + часы от min `shift_start` до max `shift_end` бригад дня, по целым часам (CSV-день — 10–22, синтетика — 09–19); линия «сейчас» с плашкой HH:MM;
  - **строка бригады:** точка, «Бригада X», иконки транспорта и навыков, «7 заявок · 42,3 км»; незадействованная — «не задействован», приглушена;
  - **блок заявки:**
    - «…7741» (последние 4 цифры; короткий id вида `T012` — целиком) и «Подкл. · 10–12»;
    - сокращения типа: Подключение «Подкл.» · Локальная заявка «Лок.» · Дозаказ «Дозак.» · Глобальная проблема «Авария»; нет `type_bk` — по навыку (§6.8);
    - дорога — штриховкой, ожидание — пунктиром;
    - иконки флагов;
  - у выбранного блока — полоса «ОКНО 18–20»;
  - последняя строка — «Неназначенные · N заявки», блоки по окнам;
  - клик — как на карте.
- **Правая панель, вкладки:**
  - **«Сравнение»** — §6.3; кнопка «На весь экран» → DS-05.
  - **«Неназначенные · N»:**
    - подзаголовок «клиентское окно не двигаем»;
    - карточка:
      - «№… {Тип} · окно …»;
      - адрес · район;
      - причина (красным, иконка по коду);
      - «Что поможет: …» (§6.2, `lib/explainTexts.ts`);
      - кнопки «Назначить вручную» (→ DS-08) и «Добавить инженера» (→ DS-09 с открытой формой добавления).
  - **«Лента · N»** — §6.5.
  - **«Версии»:**
    - «Версии плана · новые сверху»;
    - карточка: «Версия N · HH:MM» + бейдж «Текущая»; строка события (для первой — «План построен по CSV · {регион}»); «K бригад · M заявок · X км»; кнопка «Сравнить с текущей» → DS-07 в режиме просмотра;
    - данные — `GET /planning?scenario_id` (`created_at`, `engineers_used`, `planned_count`, `total_distance_km`, `status`), только `applied` / `superseded`;
    - ⏳ `version` и заголовок события — с бэка. Запасной путь: номер по порядку, заголовок — из событий с таким `result_plan_id`.

**DS-04 Карточка заявки · P0** — только для назначенных заявок (D-29).
- **Шапка:** «№305838184», «Подключение · Конвергенция абонента», `StatusChip`, флаги.
- **Серый блок:**
  - адрес;
  - район;
  - временное окно;
  - «Приезд · начало · окончание»;
  - длительность «70 мин по нормативу»;
  - «Гигабит · технология»;
  - требуемый транспорт;
  - инженер (точка, «Бригада X · транспорт»);
  - «№ в маршруте · от предыдущей» — «7 из 7 · 3,2 км».
- **«Почему этот инженер»:** `summary`; «Подробнее» раскрывает три ограничения (§6.2); ниже «Почему не другие» — до 3 строк.
- **Подвал:**
  - «Отменить заявку» (красная обводка) → DS-06 на вкладке «Отмена» с этой заявкой;
  - «Переназначить» → DS-08.

**DS-05 Сравнение на весь экран · P0**
- Шапка «Сравнение планов · {регион}, {дата}», подпись «Версия N · {заявок} заявок · {бригад} бригад».
- Слева три колонки крупно: инженеры, пробег (у диспетчера подпись «оценка»), неназначенные — с Δ.
- Справа таблица по бригадам (§6.3).
- Сноска: «Базовый вариант FIFO — заявки по порядку строк файла, каждая в конец маршрута первого подходящего инженера, без оптимизации. Пробег реального диспетчера — оценка: порядок визитов в выгрузке не указан».

**DS-06 Событие · P0** — §6.4.

**DS-07 Предложение · P0** — §6.4.

**DS-08 Переназначение · P1** — §6.7.

**DS-09 Состав и ресурсы · P1**
- **Дровер:** «Состав и ресурсы», подпись «{регион} · {дата} · {N} бригад».
- **Рекомендация** (голубая плашка) — если есть неназначенные:
  - запрос `POST /planning/{id}/extend-resource {order_ids: <неназначенные>, option: 'add_engineer'}` ⏳;
  - текст «Чтобы назначить N неназначенные, не хватает +K инженера с навыком «…» и {транспортом}»;
  - если из ответа это не собрать — плашку не показываем.
- **Таблица:**

| Колонка | Содержимое | Редактируется |
|---|---|---|
| «ИНЖЕНЕР · НАВЫКИ» | имя и чипы навыков | нет |
| «ТРАНСПОРТ» | select | да |
| «СМЕНА» | текст | нет |
| «В ДЕНЬ» | переключатель (`available`) | да |

  Выключенная бригада приглушена.
- **«+ Добавить инженера»** — строка-форма: имя, навыки, транспорт, смена (по умолчанию — самая частая смена в ростере региона, иначе 10:00–22:00) → `POST /data/scenarios/{id}/engineers`. Только до публикации.
- **Primary «Пересчитать план»:**
  - **до публикации:** `PATCH /data/scenarios/{id}/engineers/{engineer_id}` для изменённых → `POST /planning/run` (для CSV-дня — и сразу `apply`, D-25);
  - **после публикации** (подпись «Изменения станут событием и придут предложением»):
    - смена транспорта → `POST /events/apply {type: 'transport_changed', engineer_id, params: {transport}}`;
    - выключение → `engineer_unavailable`;
    - включение → `engineer_available`;
    - по одному изменению за раз [Д] → открывается DS-07.

**DS-10 Итоги дня · P1**
- **Шапка:** «Итоги дня · {дата}», подпись «{регион} · версия N».
- **Карточки:**
  - «Выполнено» — X, «из M назначенных»;
  - «Отменено» — N, частая причина ⏳;
  - «Перенесено» — N, «на DD.MM» ⏳;
  - «Неназначенные» — N, «перейдут на {следующий день}».
  - Где данных нет — подпись не показываем.
- **Крупные показатели:**
  - «Начато в окне X из Y» + Δ к FIFO;
  - «Пробег суммарно, км» (жёлтая плашка) + Δ к FIFO;
  - «Задействовано инженеров» + Δ к FIFO.
- **Таблица по бригадам:** Заявок · Выполн. · В окне · Км · Дорога (Σ `travel_minutes`) · Работа (Σ `end − start`) · Ожид. (Σ `waiting_minutes`). Считаем по активному плану; где есть факт — по факту.

**Общее для диспетчера — без макетов, делаем в коде:**
- **Тосты:**
  - «Версия N применена. Инженеры получили обновление»;
  - «План построен и опубликован»;
  - ошибки — через `toApiError`.
- **Пустые состояния, скелетоны загрузки, ошибка сети** с кнопкой «Повторить».

### 8.3. Оператор
**O-01 Новая запись · P1**
- Форма → `GET /booking/slots?region_id&date&type_bk&type_hd&address&gigabit&required_transport`.
- **`type_bk` — русская строка:** «Подключение» / «Локальная заявка» / «Глобальная проблема» / «Дозаказ».
- **Список HD** зависит от BK, строки — из выданных CSV (`lib/dictionaries.ts`):
  - **Подключение:** Конвергенция абонента · Заявка на подключение · Заказ подключения/Дозаказ оборудования
  - **Локальная заявка:** Нет линка · Работа с кабелем · Переключение на Гбит/с · IP-адрес 169... · Разрывы · Рост ошибок на порту · Низкая скорость · Роутер. Замена техническим специалистом · TVE/ENT. Замена приставки техником · ТВ. Замена приставки техником · TVE/ENT. Другие ошибки · Мониторинг
  - **Дозаказ:** Дозаказ оборудования · Заказ подключения/Дозаказ оборудования · Конвергенция абонента
  - **Глобальная проблема:** Авария · Информация
- **Окна:** `available: true` — яркие, `false` — тусклые. `reason` не показываем (D-22).
- «Записать» → `POST /booking/requests` → `BookingRequestOut` (бригада — поле `tentative_engineer_id`).
- **`SLOT_TAKEN`** → тост + повторный запрос окон.

**O-02 Поиск · P1**
- `GET /booking/requests?q=` (debounce 300 мс), до 20 результатов.
- «Перенести» → `reschedule {new_date, new_window}`; «Отменить» → `cancel {reason}`. Текст результата — `message` из ответа, если есть, иначе тексты из `DESIGN_SPEC` O-02.

**O-03 Авария · P1**
- Тело: `POST /events/apply {type: 'urgent_order_added', source: 'operator', apply: false, plan_id, event_time, request}`. `request` — как в §6.4.
- **`plan_id`** ⏳: `GET /days/{today}?region_id=<регион формы>` → `active_plan_id`.
- Если оператору `/days` закрыт (403) и бэк не принимает `params.region_id` — кнопку «Авария» у оператора скрываем, аварию вводит диспетчер. В видео так и показываем.

---

## 9. Инженер · E-01…E-10
- **Одна страница `/engineer`.** Состояние — из `GET /engineers/me/day` (опрос 15 с):

| Состояние | Экран |
|---|---|
| `plan_published = false` | пусто: «План на сегодня ещё не опубликован…» |
| `shift_status = not_started` | E-01 → «Начать смену» → E-02 → `shift_start {payload: {transport}}` |
| `on_shift` | E-03 «Список» / E-04 «Карта» |
| `finished` | E-10 по `shift_totals` |
| `unavailable` | баннер «С HH:MM ваши заявки переданы другим» + список без кнопок |

- **Действия** — `POST /engineers/me/actions {action, request_id, payload}`, `at` не шлём (§7):

| Кнопка | `action` | `payload` |
|---|---|---|
| «В пути» / «В работе» / «Выполнена» | `en_route` / `start` / `complete` | — |
| «Прервать выполнение» | `fail` | `{reason: client_refused \| no_access \| technical \| client_reschedule \| other, desired_date?, comment?}`; для `other` поле `comment` обязательно (иначе `COMMENT_REQUIRED`) |
| «Не могу работать с HH:MM» / «Не выйду сегодня» | `unavailable` | `{from: 'now' \| 'HH:MM', reason?}` |
| «Завершить смену» | `shift_end` | — |
| «Инцидент» · P1 ⏳ | `incident` | `{reason: transport_broken \| cannot_continue \| other, new_transport?, comment?}` |

- **«Инцидент»:**
  - если в `/openapi.json` нет `incident` — кнопку скрываем;
  - «Не могу продолжить» доступно через меню → «Не могу работать» (`unavailable`, `from: 'now'`);
  - `delay` не используем (D-14).
- **Ответ** `EngineerActionOut.day` — сразу кладём в кэш `engineerDay`.
- `409 ILLEGAL_TRANSITION` → откат оптимистичного статуса + тост с `message`.
- Кнопки в состоянии `loading` до ответа: двойное нажатие исключено.
- **Окно** в `EngineerVisit.window` — строка `"10:00-12:00"`, парсим в `lib/time.ts`.
- **E-04 Карта:** `GET /engineers/me/route?remaining=true` → полилиния `geometry.coordinates` (`[lon, lat]`) + маркеры `points`. После `complete` запрос обновляется.
- **Яндекс Карты** — `lib/yandexMaps.ts`:
```ts
const RTT: Record<Transport, string> = { car: 'auto', public_transport: 'mt', walk: 'pd', bike: 'bc' };
export function yandexRouteUrl(start: LatLon, points: LatLon[], transport: Transport): string {
  const pts = [start, ...points].slice(0, 20).map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join('~');
  return `https://yandex.ru/maps/?rtext=${pts}&rtt=${RTT[transport]}`;
}
```
  - «До следующей» — `points.slice(0, 1)`; «Маршрут на день» — все `points`.
  - Открываем через `<a target="_blank" rel="noopener">`.
  - [Г] Проверить на iPhone и Android, открывается ли приложение Карт. Запасной вариант — `yandexmaps://maps.yandex.ru/?rtext=…&rtt=…`.
- **Флаг «Изменено»** снимаем локально после открытия карточки: ключ `seen_changed_<request_id>` в localStorage.

---

## 10. Общие модули
### 10.1. `lib/statuses.ts`, `lib/dictionaries.ts`
Подписи и тона — строго `DESIGN_SPEC` §5 и §2.4:
- **Статусы:** `unassigned` Не назначена · `planned` Запланирована · `en_route` В пути · `in_progress` В работе · `done` Выполнена · `cancel_pending` Отменяется · `cancelled` Отменена · `reschedule_pending` Переносится · `rescheduled` Перенесена.
- **Флаги:** `urgent` Срочная · `at_risk` Под угрозой · `late` Просрочена · `changed` Изменено · `started_early` Начата раньше окна · `reaction_late` Реакция > 2 ч.
- **Навыки и транспорт:** `*_display` с бэка, если пришли; иначе словарь:
  - навыки: `local` Локальные работы · `installation` Подключение и дозаказ · `emergency` Аварийные работы;
  - транспорт: `car` Автомобиль · `public_transport` Общественный транспорт · `walk` Пешком · `bike` Велосипед.
- **Тип заявки без `type_bk`** (синтетика, §6.8) — по навыку: `emergency` «Авария» · `installation` «Подключение и дозаказ» / «Подкл.» · `local` «Локальные работы» / «Лок.».
- **Помощники подписей:** `shortId(id)`, `engineerLabel(name, id)` («Бригада X»), `engineerShort(name, id)` (без «Бригада») — в `lib/dictionaries.ts`.
- **Регионы:** `east` Восток · `south_east` Юго-восток · `south_center` Югоцентр.

### 10.2. `lib/colors.ts`
12 цветов маршрутов из `DESIGN_SPEC` §2.5. Цвет инженера = индекс в ростере региона, отсортированном по `id`, по модулю 12. Если бригад больше 12, у повторного цвета линия маршрута пунктиром.

### 10.3. `lib/time.ts`
- `nowMsk()` — через `Intl.DateTimeFormat('ru-RU', {timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit'})`.
- `nowFor(clock)`, `toMin` / `fromMin`, `parseWindow('10:00-12:00')`.
- Для таймлайна: `x = (toMin(t) − axisStart) / (axisEnd − axisStart) × width`, где `axisStart` — min `shift_start` бригад дня, округлённый вниз до часа, `axisEnd` — max `shift_end`, округлённый вверх. Константы 10:00 / 22:00 в коде не используем.

---

## 11. Качество
| Требование | Как проверить |
|---|---|
| `npm run check` (tsc + eslint) без ошибок | перед каждым коммитом |
| Юнит-тесты адаптеров §6 на фикстурах `docs/api-examples` (vitest) | `npm test` |
| Запуск по README | `npm i && npm run dev`; прод — `npm run build` + статический сервер |
| Стенд | `VITE_API_URL=https://api.bee-dynasty.ru/api/v1`, CORS ⏳ |
| Производительность | первая отрисовка дня < 2 с; строки таймлайна — `React.memo` |
| Доступность | фокус-кольцо, `aria-label` у иконок, статусы не только цветом, область касания на мобильном ≥ 44 px |
| Секреты | пароли демо-учёток только в `.env.local` (в `.gitignore`); в localStorage — только токен и UI-мелочи |

---

## 12. Шаг 0 — снимок живого API (первым делом, ~30 мин)
Чтобы адаптеры и моки не гадали о форме ответов «без схемы».

1. `.env.local` (не коммитить):
```
API_URL=https://api.bee-dynasty.ru/api/v1
DEMO_DISPATCHER=dispatcher
DEMO_OPERATOR=operator
DEMO_ENGINEER=eng-east-01
DEMO_PASSWORD=<пароль из гайда бэка>
```
2. `scripts/snapshot-api.mjs` (Node 18+, `fetch`):
   - логинится тремя ролями и сохраняет ответы в `docs/api-examples/<name>.json`;
   - **работает на отдельном тестовом дне** (`load-demo` на дату через 30 дней, регион Восток), чтобы не трогать демо-день и не упереться в записи оператора;
   - после события делает `reject` предложения.

   Порядок вызовов:
   1. `GET /regions`;
   2. `POST /data/load-demo?region_id=east&date=<сегодня + 30 дней>` → `scenario_id`;
   3. `GET /data/scenarios/{id}`; `POST /planning/compare {scenario_id, strategies: ['fifo','dispatcher']}` (до плана);
   4. `POST /planning/run` → `plan_id`;
   5. `GET /planning/{plan_id}`;
   6. `GET /visualization/{plan_id}/geojson?geometry=road`;
   7. `POST /planning/compare`; `POST /planning/baseline {plan_id}`; `GET /planning?scenario_id`; `POST /planning/{plan_id}/extend-resource {order_ids: <неназначенные>, option: 'add_engineer'}` (если есть неназначенные);
   8. `GET /planning/{plan_id}/requests/{первая заявка}`;
   9. `POST /planning/{plan_id}/apply`;
   10. `GET /calendar?from&to` (текущий месяц);
   11. `GET /days/<та же дата>?region_id=east`;
   12. `POST /events/apply` (`urgent_order_added`, `apply: false`) → `GET /planning/{new}/diff?against=` → `POST /planning/{new}/reject`;
   13. `GET /events?scenario_id`;
   14. `POST /planning/{plan_id}/reassign/check` (первая заявка → другой инженер);
   15. под инженером: `GET /engineers/me/day`, `GET /engineers/me/route?remaining=true`;
   16. под оператором: `GET /booking/slots` (та же дата, Восток), `GET /booking/requests?q=Москва`;
   17. синтетический сценарий ⏳ (ручку загрузки уточняем у бэка): `GET /data/scenarios/{id}` → `synthetic-scenario.json`, `POST /planning/run` → `synthetic-plan.json`. По снимку проверить, что пришло в `source`, `latitude/longitude`, `name`, `type_bk`, `address` (§6.8).
3. `npm run gen:types` — `src/api/schema.d.ts`.
4. По снимкам уточнить `api/types.ts` и форматы в §6.2, §6.3, §6.4, §6.5, §6.6, §6.7. Расхождения с этим ТЗ — в `docs/API_NOTES.md`.

---

## 13. Порядок работ
| # | Когда | Что | P | Готово, когда |
|---|---|---|---|---|
| 0 | 27.09 вечер | Шаг 0 (§12), каркас Vite, `tokens.css`, `ui/*`, клиент API и ошибки, авторизация, роутинг, моки из снимков | P0 | вход под тремя ролями ведёт на свой экран |
| 1 | 27.09 вечер | DS-01 календарь (статусы, подсказка, фильтры); DS-02 импорт (2 шага, ошибки) | P0 | шаг 1 демо |
| 2 | 28.09 утро | DS-03: `DayModel`, шапка и кнопки по состоянию, «Построить план» = run + apply, состояние до плана, карта, таймлайн, «Сравнение» (+ baseline), «Неназначенные», «сейчас» из часов дня | P0 | шаги 2, 3, 7 демо |
| 3 | 28.09 день | DS-04 (объяснение §6.2), DS-06 (3 вкладки), DS-07 + баннер предложения, «Лента» | P0 | шаги 4–6 демо |
| 4 | 28.09 день | Инженер: E-03, кнопки статуса, E-06, E-09 | P0 | 30–40 с инженера в видео |
| 5 | 28.09 до 16:00 | Прогон 7 шагов на стенде без моков; багфикс | P0 | без ошибок в консоли |
| 6 | 28.09 до 18:00 | DS-05, DS-08, DS-09 (меню ⋯), DS-10, «Версии»; E-01, E-02, E-04 + Яндекс, E-05, E-08, E-10; O-01…O-03 | P1 | — |
| 7 | 28.09 вечер | Фриз, запись видео: часы дня ставим через Swagger (§7) | P0 | — |

---

## 14. Приёмка — 7 шагов ТЗ §4 на Востоке
1. Вход диспетчером → календарь → «Загрузить CSV» (Восток + контрольный файл) → отчёт импорта → «Открыть день»: точки заявок, «плана нет», FIFO и диспетчер в сравнении.
2. «Построить план» → через ≤ 10 с план опубликован: маршруты бригад на карте, «Версия 1 · сейчас …», главная кнопка — «Добавить событие».
3. «Карта / Таймлайн» — кто, куда и во сколько; фильтр по инженеру работает.
4. Клик по заявке → строка объяснения + «Квалификация ✓ / Время ✓ / Ресурс ✓» + «Почему не другие».
5. Часы дня 12:30 с автопрогоном (сид или Swagger) → «Добавить событие» → «Срочная заявка» → «Рассчитать изменения».
6. Предложение: заголовок, счётчики, бригада и прибытие, diff → «Принять» → версия +1, флаги «Изменено».
7. «Сравнение»: наш / FIFO / реальный, по инженерам и суммарно, у диспетчера — «оценка».
8. **Дополнительно:** вход `eng-east-XX` бригады из аварии → баннер «Новая срочная заявка — после текущей» → «В пути» → «Прервать выполнение» (клиент отказался) → у диспетчера «требует решения» → «Подтвердить отмену».

## 15. Чего не делать
- Регистрацию, восстановление пароля, демо-кнопки входа (D-17).
- Мобильное приложение: инженер — адаптивная веб-страница.
- Вебсокеты, SSR.
- Геолокацию, «Задержусь» (`delay`), «Позвонить клиенту», причины занятых окон.
- Живой геокодинг с фронта.
- Новые элементы дизайна (дизайн заморожен). Исключение — поповер часов из существующих `ui/*`.
- Жёлтые вторичные кнопки, чистый чёрный текст, белый текст на жёлтом, перерисованный логотип.
- Устаревшее в схеме: `time`, `request_id` в событиях, `urgent_request`, `request_cancelled`, `/events/replan`, DELETE-ручки.
- `POST /planning/baseline` используем только ради `baseline_routes` (§6.3). Если в схеме ручка помечена `deprecated` или не отвечает — у FIFO в строках «Начато в окне» и «Просрочено» ставим «—».

---

## 16. Правила проекта
```md
# Правила проекта — фронтенд планировщика маршрутов (ЛЦТ 2026, Билайн Бизнес)

## Источники правды
- docs/spec/FRONTEND_SPEC.md (v2.2) — поведение, ручки, адаптеры, часы дня, порядок работ.
- src/api/schema.d.ts (генерируется из https://api.bee-dynasty.ru/openapi.json) + docs/api-examples/*.json — форма ответов API.
- design/ (Dispatcher_Flow.html, dispatcher-shots/) + docs/spec/DESIGN_SPEC.md — вёрстка (заморожена); docs/spec/UI_KIT_tokens.md — стиль, приоритет над макетом.

## Стек и команды
Vite + React 18 + TS strict · react-router 6 · @tanstack/react-query 5 · react-leaflet 4 · date-fns (ru) · lucide-react · CSS Modules · msw 2 · vitest.
- npm run dev — dev-сервер, /api проксируется на https://api.bee-dynasty.ru (VITE_USE_MOCKS=true — на моках)
- npm run gen:types — типы из OpenAPI
- npm run snapshot — снимок живых ответов в docs/api-examples (нужен .env.local)
- npm run check — tsc --noEmit + eslint; npm test — тесты адаптеров
- npm run build — прод-сборка

## Правила
- Компоненты работают только с моделями из src/adapters, не с сырым API.
- В событиях и переназначении id заявки — order_id. Все события — apply: false.
- «Сейчас» = nowFor(clock дня), часы во фронте не переводим; at у действий инженера не отправлять.
- Ошибки — только через toApiError (три формата бэка).
- UI-тексты по-русски, термины ТЗ дословно; код — по-английски.
- Цвета, отступы, скругления — только CSS-переменные из tokens.css. Одна жёлтая кнопка на экран, белый на жёлтом запрещён.
- Три ограничения подписаны «Квалификация», «Время», «Ресурс». Сравнение — 3 колонки.
- Статусы и флаги — только из src/lib/statuses.ts.
- У заявки и бригады надёжно заполнены только id, окно, длительность, навык, транспорт и смена. Адрес, район, type_bk, имя, координаты могут быть пустыми или условными (синтетика) — подписи только через src/adapters/normalize.ts (FRONTEND_SPEC §6.8). Часы 10:00/22:00 не зашивать.
- Фильтры и открытые панели — в URL. В localStorage — только токен и UI-мелочи. Пароли — только в .env.local.
- Перед коммитом: npm run check и npm test без ошибок.
```
