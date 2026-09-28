# Интеграционный гайд для агента фронтендера

API: `https://api.bee-dynasty.ru`, префикс `/api/v1`. Машинная схема: `docs/openapi.json`
(Swagger UI: `/docs`). Единицы: время `HH:MM`, дата `YYYY-MM-DD`, длительность — минуты,
расстояние — км, координаты WGS84 (`latitude`/`longitude`, в GeoJSON — `[lon, lat]`).

## 1. Аутентификация (JWT)

1. `POST /api/v1/auth/login` → `{"login","password"}`.
   Ответ: `{"access_token","token_type":"bearer","user":{id,login,name,role,region_ids,engineer_id?}}`.
   Ошибка: `401 {"error":{"code":"UNAUTHORIZED","message":"Неверный логин или пароль"}}`.
2. Все последующие запросы: заголовок `Authorization: Bearer <access_token>`. Срок — 21 день.
3. `GET /api/v1/auth/me` — профиль; `POST /api/v1/auth/logout` → 204 (удалить токен на клиенте).
4. Открыты без токена: `/health`, `/api/v1/auth/login`, `/docs`, `/openapi.json`.
   Без токена → `401 UNAUTHORIZED`; чужая роль → `403 FORBIDDEN`.

**Роли и доступ**

| Роль | Доступно |
|---|---|
| `dispatcher` | всё, кроме `/engineers/me/*` |
| `operator` | `/regions`, `/booking/*`, `/events/apply` только `type=urgent_order_added` |
| `engineer` | `/engineers/me/*` |

**Демо-учётки (пароль — в `.env.local`, в репозиторий не кладём):** `dispatcher`, `operator`, `eng-east-01`…`eng-east-12`,
`eng-se-01`…, `eng-sc-01`…

```js
const api = "https://api.bee-dynasty.ru/api/v1";
async function login(login, password) {
  const r = await fetch(`${api}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  const data = await r.json();
  localStorage.token = data.access_token;   // хранить токен
  return data.user;
}
const auth = () => ({ Authorization: `Bearer ${localStorage.token}` });
```

## 2. Формат ошибок

- Валидация: `422 {"detail":"Ошибка валидации входных данных","code":"VALIDATION_ERROR","context":{"errors":[...]}}`.
- HTTPException-ошибки: `{"detail":{"error":{"code":"...","message":"...","details":{...}}}}`.
- Middleware-ошибки (auth): `{"error":{"code":"UNAUTHORIZED|FORBIDDEN|DESTRUCTIVE_DISABLED","message":"..."}}`.

Коды: `UNAUTHORIZED`, `FORBIDDEN`, `STALE_PROPOSAL`, `ILLEGAL_TRANSITION`, `COMMENT_REQUIRED`,
`DUPLICATE_REQUEST`, `DATE_HAS_BOOKINGS`, `SLOT_TAKEN`, `DESTRUCTIVE_DISABLED`, `BAD_CSV`,
`ROWS_MISMATCH`, `REGION_UNKNOWN`. Причины неназначения: `NO_SKILL`, `NO_SKILL_LEVEL`,
`NO_TRANSPORT`, `NO_EQUIPMENT`, `NO_CAPACITY`, `NO_DIRECT_FEASIBLE_SLOT`.

## 3. Справочники

| Сущность | Значения |
|---|---|
| Навык | `local`, `installation`, `emergency` |
| Транспорт | `car`, `walk`, `bike`, `public_transport` |
| Приоритет | `normal`, `urgent` (`priority_rank`: 1 Авария, 2 Подключение, 3 Локальная/Дозаказ) |
| Статус заявки | `unassigned`, `planned`, `en_route`, `in_progress`, `done`, `cancel_pending`, `cancelled`, `reschedule_pending`, `rescheduled` |
| Флаги | `urgent`, `at_risk`, `late`, `changed`, `started_early`, `reaction_late` |
| Статус плана | `draft`, `proposed`, `applied`, `rejected`, `superseded` |
| `plan_state` дня | `none`, `draft`, `applied` |
| Событие | `urgent_order_added`, `order_added`, `order_cancelled`, `engineer_unavailable`, `engineer_available`, `engineer_delayed`, `finished_early`, `transport_changed`, `order_window_changed`, `order_scope_changed`, `shift_windows`, `manual_reassign`, `extend_resource` |
| Действие инженера | `shift_start`, `en_route`, `start`, `complete`, `fail`, `delay`, `unavailable`, `shift_end` |
| Причина `fail` | `client_refused`, `no_access`, `technical`, `client_reschedule`, `other` (+ обязательный `comment`) |

## 4. Ручки (актуальный список)

### Служебные/авторизация
`GET /health` · `POST /auth/login` · `GET /auth/me` · `POST /auth/logout` · `GET /regions`.

### Данные
- `POST /data/load` (JSON), `POST /data/load-files` (CSV/JSON multipart).
- `POST /data/load-demo?region_id=east|south_east|south_center&date=YYYY-MM-DD` (по умолчанию сегодня).
- `POST /data/import-beeline` (multipart: `requests_file`*, `control_file`, `engineers_file`, `region_id`, `date`).
- `GET /data/scenarios?region_id=&date=&source=&limit=`; `GET /data/scenarios/{id}`; `GET /data/latest`.
- `GET|POST /data/scenarios/{id}/engineers`; `PATCH .../engineers/{engineer_id}` (только до публикации).
- `DELETE /data/scenarios[/{id}]` (закрывается `ALLOW_DESTRUCTIVE=false`). Часы (`/clock`) удалены.

### Календарь
- `GET /calendar?from&to&region_id=all|east|…&status=&type_bk=&flag=` → `{days:[{date,request_count,by_status,flags,sources}]}`.
- `GET /days/{date}?region_id=all|east|…` → `{date,regions:[{region_id,name,scenario_id,source,office,active_plan_id,draft_plan_id,plan_state,version,pending_proposals,last_recalc}]}`.

### Планирование
- `POST /planning/run` `{scenario_id,solver?,seed=42,time_limit_seconds=10,include_baseline=true}` → `PlanResponse` (`status=draft`).
- `GET /planning?scenario_id=`; `GET /planning/{id}?geometry=road|straight` (по умолчанию `road`).
- `GET /planning/{id}/explanations`; `GET /planning/{id}/requests/{request_id}`; `GET /planning/{id}/diff?against=`.
- `POST /planning/compare` `{scenario_id|plan_id, strategies:["ours","fifo","dispatcher"]}`.
- `POST /planning/{id}/apply` | `/reject` (apply: draft/proposed→applied, прежняя applied→superseded, version+1).
- `POST /planning/{id}/reassign/check` | `/reassign`; `POST /planning/{id}/suggest`;
  `POST /planning/{id}/extend-resource` (`option: extend_shift|neighbor_region|add_engineer`);
  `POST /planning/{id}/what-if`.

### События
- `POST /events/apply` (единое). Поля: `type`, `plan_id?`, `event_time?` (по умолчанию «сейчас»),
  `source` (`dispatcher|operator|engineer|client|system`), `request_id`/`order_id`, `engineer_id`,
  `request?`, `params`, `telemetry?`, `apply?` (факты сразу, остальное — `proposed`).
- `GET /events?plan_id=&scenario_id=` → `EventItem[]` с `needs_decision`.
- `DELETE /events[/{id}]`.

### Оператор (booking)
- `GET /booking/slots?region_id&date&type_bk&type_hd&address&gigabit&required_transport`.
- `POST /booking/requests` → `{request_id,scenario_id,status,engineer_id,plan_id,window}`.
  День не начат → полный пересчёт (draft); начат → встраивание сразу (version+1). Конфликт → `409 SLOT_TAKEN`.
- `GET /booking/requests?q=&region_id=&date=` — поиск (номер/адрес), до 20.
- `POST /booking/requests/{id}/cancel` `{reason}`; `POST .../reschedule` `{new_date,new_window}`.
  `/booking/callbacks` удалён.

### Инженер (по токену)
- `GET /engineers/me/day` → `{date,plan_published,engineer,summary,visits[{...,lat,lon,flags}],shift_totals?,banners}`.
- `POST /engineers/me/actions` `{action,request_id?,at?,payload?}` (at по умолчанию «сейчас»).
  `fail.reason=other` требует `payload.comment` → иначе `422 COMMENT_REQUIRED`.
- `GET /engineers/me/route?remaining=true` → `{transport,start:{lat,lon,label},points[],geometry:{type:"LineString",coordinates}}`.
- Диспетчерские `GET /engineers/{id}/day` и `POST /engineers/{id}/actions` — для просмотра.

### Визуализация
- `GET /visualization/{plan_id}/geojson?geometry=road|straight|cached&engineer_id=`.
- `GET /visualization/{plan_id}/map`.

## 5. Ключевые формы ответов

**PlanResponse:** `plan_id, scenario_id, parent_plan_id, kind(optimized|replanned), status, version,
strategy, event_id, created_at, summary{engineers_used,total_distance_km,planned_count,total_requests,
unassigned_count,unassigned_urgent,objective[4],elapsed_seconds}, metrics{optimized,baseline,...}|null,
routes[{engineer_id,engineer_name,transport,shift_start,shift_end,start_latitude,start_longitude,
distance_km,task_count,route[{request_id,sequence,arrival,start,end,travel_minutes,leg_distance_km,
waiting_minutes,window_start,window_end,status,flags,slack_minutes,frozen,actual_*}],geometry,geometry_source,explanation}],
assignments[], unassigned[{request_id,reason_code,reason,proven_static}], explanations[{request_id,status,
engineer_id,summary,reasons[],schedule,local_alternatives[]}], changes[], violations[], map_geojson,
algorithm_metadata{solver,seed,elapsed_seconds,matrix_sources,warnings,...}`.

**ReplanResult:** `event_id, event_type, previous_plan_id, status, plan, changes[], change_summary,
applied_event, scenario, violations[]`.

**Календарь:** см. §4. **День:** см. §4.

## 6. Сценарии интеграции

**Диспетчер (главный экран):** login → `GET /calendar`/`GET /days/{date}` → при `plan_state=none`
`POST /planning/run` → `POST /planning/{id}/apply` → карта `GET /visualization/{id}/geojson?geometry=road`
→ сравнение `POST /planning/compare` → события `POST /events/apply` (proposed + diff) →
`GET /planning/{new}/diff` → `POST /planning/{new}/apply`.

**Оператор (запись):** login (operator) → `GET /booking/slots` → `POST /booking/requests`
(план пересчитывается/встраивается автоматически) → отмена/перенос → `GET /booking/requests?q=`.

**Инженер:** login (eng-*) → `GET /engineers/me/day` → `GET /engineers/me/route` (карта/Яндекс) →
`POST /engineers/me/actions` (`shift_start`→`en_route`→`start`→`complete`; `delay`; `fail`; `unavailable`).

## 7. Правила и подводные камни

- **Реальное время** (`Europe/Moscow`): `event_time`/`at` необязательны, по умолчанию «сейчас».
  Часов симуляции нет.
- **Один сценарий на (регион, дата)**. Импорт CSV на дату с записями оператора → `409 DATE_HAS_BOOKINGS`.
- **Версии:** одна `applied` + одна `draft`; предложения применяются только от действующей версии,
  иначе `409 STALE_PROPOSAL`. Факты применяются сразу, изменения назначений — предложения (кроме
  записи оператора — она встраивается сразу).
- **Геометрия:** `geometry_source`: `local_osrm:car` (основной, дороги), `...+walk|bike|public_transport`
  (для не-авто линия автомобильная, время/дистанция — математика), `openrouteservice:*`/`osrm:*` (фолбэки),
  `straight_line`. Матрицы: `matrix_sources` → `local_osrm:car`, `math:walk|bike|public_transport`.
- **Недопустимые переходы** статусов заявки → `409 ILLEGAL_TRANSITION`.
- Пагинация списков — `limit` (по умолчанию 50).

---

## 8. Правки 28.09 (часы дня и контракты)

### Часы дня (D-24) — обязательно
У каждого сценария свои «часы»: `scenario.clock` (`HH:MM`) или `null` (реальное время Europe/Moscow).
Стенд сидит демо-день Востока на сегодня с `clock = 12:30` (работает 24/7).

- `GET /api/v1/data/scenarios/{id}/clock` → `{scenario_id, clock, real_now}`.
- `POST /api/v1/data/scenarios/{id}/clock` тело `{time: "HH:MM"|null, autoplay: true}` →
  `{scenario_id, clock, autoplayed:{done,in_progress,en_route,total}}`.
  Назад переводить нельзя → `409 CLOCK_BACKWARD`. `time:null` — вернуть реальное время.
- Автопрогон помечает визиты `done` / `in_progress` / `en_route` по плану.
- Внутри дня «сейчас» = `clock` для: `event_time` по умолчанию в `/events/apply`,
  `at` по умолчанию в `/engineers/*/actions`, SHIFT и флаги.
- `clock` также в `GET /days/{date}` (`regions[].clock`) и `GET /engineers/me/day`.

### Авария от оператора (D-33)
`POST /events/apply` без `plan_id`/`event_time`, `source: "operator"`,
`params: {region_id, comment}`. Бэк сам берёт активный план региона, время = часы дня,
окно = `[время, max shift_end]`, геокодит адрес. Нет активного дня → `409 DAY_NOT_STARTED`.

### Оператор: отмена/поиск/ответы
- `BookingCancelIn {reason: client_refused|booking_error|other, comment?}`; `other` без `comment` → `422 COMMENT_REQUIRED`.
- Отмена/перенос недопустимы для `done`/`cancelled`/`rescheduled`/`*_pending` → `409 ILLEGAL_TRANSITION` с текстом.
- `GET /booking/requests?q=&region_id=&date=` → строки с `district`, `gigabit`, `technology`, `required_transport`, `engineer_name`.
- Ответы `/booking/requests`, `/cancel`, `/reschedule` содержат `message` (готовый текст для тоста), у переноса — `date`, `window`.

### Версии и сравнение
- `GET /planning?scenario_id=` → `PlanListItem` c `version`, `event_id`, `event_type`, `headline`.
- `CompareColumn`: `strategy`, `available`, `unassigned`, `visits_total`, `started_in_window`, `late`, `km_by_engineer[{engineer_id,km,tasks}]`.
- `km_by_engineer` верхнего уровня: `{engineer_id: {ours:{km,tasks}, fifo:{...}, dispatcher:{...}}}`.
- Для дня без распределения диспетчера `dispatcher.available = false`.

### Лента
`GET /events?scenario_id=` → `EventItem` с `headline`, `source`, `event_time`, `order_id`,
`engineer_id`, `status`, `flag`, `applied_at`, `needs_decision`. В ленту попадают события
`/events/apply`, применение версии (`plan_applied`) и факты инженера (`engineer_action`).

### Инженер
- `GET /engineers/me/day`: добавлены `clock`, `plan_published`, `visits[].lat/lon`,
  `visits[].actual_start/actual_end/equipment`, `banners[{type,text,at,request_id?}]`,
  `shift_totals{...,started_at,ended_at}`.
- `POST /engineers/me/actions`: `fail.reason ∈ {client_refused,no_access,technical,client_reschedule,other}`;
  `other` требует `comment` (`422 COMMENT_REQUIRED`), `client_reschedule` — `desired_date`.
  После `fail` заявка не активна (`active_request_id=null`), следующая доступна сразу.
- Действие `incident`: `transport_broken`+`new_transport` → предложение `transport_changed`;
  `cannot_continue` → `engineer_unavailable`; `other`+`comment` → запись в ленту.

### Ответы на §11 (синтетика)
1. Отдельной ручки загрузки `*.instance.json` нет — синтетику загружайте через `POST /data/load`
   (инженеры+заявки), координаты переводите на своей стороне.
2. `source` задаётся в `scenario_metadata.source` (можно `"synthetic"`).
3. Backend не переносит `coordinates_km`; передайте lat/lon по формуле из спеки — иначе геометрия/карта прямые.
4. Смена CSV-дней в нашем демо — 10:00–22:00.
