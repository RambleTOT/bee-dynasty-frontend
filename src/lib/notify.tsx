import { useSyncExternalStore, type ReactNode } from 'react';
import styles from './notify.module.css';

export type NotifyKind = 'info' | 'error' | 'success';

interface Notice {
  id: number;
  text: string;
  kind: NotifyKind;
}

const HIDE_AFTER_MS = 4_000;

// Стек живёт вне React, поэтому notify() можно звать откуда угодно: из обработчиков, эффектов, api.
let notices: readonly Notice[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  for (const listener of listeners) listener();
}

function hide(id: number) {
  timers.delete(id);
  notices = notices.filter((notice) => notice.id !== id);
  emit();
}

function scheduleHide(id: number) {
  clearTimeout(timers.get(id));
  timers.set(
    id,
    setTimeout(() => hide(id), HIDE_AFTER_MS),
  );
}

/** Уведомление внизу экрана на 4 с. Такое же уже на экране — не дублируем, а продлеваем. */
// eslint-disable-next-line react-refresh/only-export-components -- API стека, а не компонент
export function notify(text: string, kind: NotifyKind = 'info'): void {
  const same = notices.find((notice) => notice.text === text && notice.kind === kind);
  if (same) {
    scheduleHide(same.id);
    return;
  }
  const id = nextId++;
  notices = [...notices, { id, text, kind }];
  scheduleHide(id);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => notices;

/** Рендерит приложение и стек уведомлений поверх него. Вид — временный, до Toast из ui/ (этап 02). */
export function NotifyProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (
    <>
      {children}
      <div className={styles.stack} aria-live="polite">
        {items.map((notice) => (
          <div
            key={notice.id}
            role={notice.kind === 'error' ? 'alert' : undefined}
            className={`${styles.item} ${styles[notice.kind]}`}
          >
            {notice.text}
          </div>
        ))}
      </div>
    </>
  );
}
