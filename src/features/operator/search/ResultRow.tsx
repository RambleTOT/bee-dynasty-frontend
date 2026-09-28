import type { BookingItem } from '@/adapters/booking';
import { dateShort, typeShort, windowShort } from '@/lib/booking';
import { cx, StatusChip } from '@/ui';
import { T } from '../operatorTexts';
import styles from './ResultRow.module.css';

/** «29.09 · окно 18–20 · Подключение». */
function metaOf(item: BookingItem): string {
  return [dateShort(item.date), T.search.window(windowShort(item.window)), typeShort(item.typeBk)]
    .filter(Boolean)
    .join(' · ');
}

/** Строка результата поиска: выбранная — белая с рамкой 2 px, остальные — на nested-фоне. */
export function ResultRow({
  item,
  selected,
  onSelect,
}: {
  item: BookingItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={cx(styles.row, selected && styles.selected)}
      aria-pressed={selected}
      onClick={() => onSelect(item.id)}
    >
      <span className={styles.top}>
        <span className={styles.id}>№{item.id}</span>
        {item.status && <StatusChip status={item.status} size="sm" />}
      </span>
      <span className={cx(styles.address, !item.address && styles.muted)}>
        {item.address || T.card.noAddress}
      </span>
      <span className={styles.meta}>{metaOf(item)}</span>
    </button>
  );
}
