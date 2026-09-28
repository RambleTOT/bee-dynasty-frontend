import { dateWithWeekday, dayOfMonth, weekdayShort } from '@/lib/booking';
import { cx } from '@/ui';
import { T } from '../operatorTexts';
import styles from './DateStrip.module.css';

/** Лента дат шага «Дата и окно»: пилюли 56 px, выбранная — тёмная (FRONTEND_SPEC §8.3.8). */
export function DateStrip({
  days,
  value,
  onChange,
  disabled = false,
}: {
  days: readonly string[];
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.strip} role="group" aria-label={T.slots.dates}>
      {days.map((day) => {
        const active = day === value;
        return (
          <button
            key={day}
            type="button"
            className={cx(styles.day, active && styles.active)}
            aria-pressed={active}
            aria-label={dateWithWeekday(day)}
            disabled={disabled}
            onClick={() => onChange(day)}
          >
            <span className={styles.weekday}>{weekdayShort(day)}</span>
            <span className={styles.number}>{dayOfMonth(day)}</span>
          </button>
        );
      })}
    </div>
  );
}
