# design/ — эталон вёрстки диспетчера

- `Dispatcher_Flow.html` — экспорт макета, **согласованный макет диспетчера** (27.09). Кадры подгружаются лениво: откройте в браузере и подождите ~30–40 с.
- `dispatcher-shots/*.png` — скриншоты всех кадров 1440×900 (смотреть их быстрее, чем HTML).
- `dispatcher-frames.json` — тексты каждого кадра (точные подписи и копирайт).

Где макет расходится с `docs/spec/FRONTEND_SPEC.md` §8.2 — прав §8.2 (согласовано): статусы календаря — 9 статусов ТЗ, фильтров по флагам нет, у CSV-дня нет черновика и т. п.

| Файл | Кадр |
|---|---|
| `dispatcher-shots/00_S-01.png` | S-01 Вход |
| `dispatcher-shots/01_DS-01.png` | DS-01 Календарь заявок |
| `dispatcher-shots/02_DS-02.png` | DS-02 · 1 Загрузка CSV · файлы |
| `dispatcher-shots/03_DS-02.png` | DS-02 · 2 Отчёт импорта |
| `dispatcher-shots/04_DS-03.png` | DS-03 День из CSV, плана нет |
| `dispatcher-shots/05_DS-03.png` | DS-03 День из CSV, плана нет |
| `dispatcher-shots/06_DS-03.png` | DS-03 План опубликован · карта |
| `dispatcher-shots/07_DS-06.png` | DS-06 Событие · срочная заявка |
| `dispatcher-shots/08_DS-07.png` | DS-07 Предложение с diff |
| `dispatcher-shots/09_DS-07.png` | DS-07 Предложение с diff |
| `dispatcher-shots/10_DS-03.png` | DS-03 День идёт · таймлайн |
| `dispatcher-shots/11_DS-03.png` | DS-03 День идёт · карта, маршрут |
| `dispatcher-shots/12_DS-03.png` | DS-03 Предложение ждёт решения · таймлайн |
| `dispatcher-shots/13_DS-03.png` | DS-03 День идёт · таймлайн |
| `dispatcher-shots/14_DS-04.png` | DS-04 Карточка заявки |
| `dispatcher-shots/15_DS-08.png` | DS-08 Переназначение · ок |
| `dispatcher-shots/16_DS-08.png` | DS-08 Переназначение · нарушение |
| `dispatcher-shots/17_DS-09.png` | DS-09 Состав и ресурсы |
| `dispatcher-shots/18_DS-07.png` | DS-07 Предложение с diff |
| `dispatcher-shots/19_DS-05.png` | DS-05 Сравнение на весь экран |
| `dispatcher-shots/20_DS-10.png` | DS-10 Итоги дня |
| `dispatcher-shots/21_DS-03.png` | DS-03 Панель · Неназначенные |
| `dispatcher-shots/22_DS-03.png` | DS-03 Панель · Лента |
| `dispatcher-shots/23_DS-03.png` | DS-03 Панель · Версии |
