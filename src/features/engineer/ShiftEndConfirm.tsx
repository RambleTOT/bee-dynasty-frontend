import { shiftEndWarning } from '@/lib/engineerLabels';
import { BottomSheet, Button } from '@/ui';
import { useEngineerAction } from './useEngineerDay';
import styles from './Sheets.module.css';

/**
 * «Завершить смену» при оставшихся запланированных (§9.2): «Осталось N заявок. Они вернутся
 * диспетчеру» → `shift_end`.
 */
export function ShiftEndConfirm({ count, onClose }: { count: number; onClose: () => void }) {
  const action = useEngineerAction();
  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Завершить смену"
      footer={
        <>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={action.isPending}
            onClick={() => action.mutate({ action: 'shift_end' }, { onSuccess: onClose })}
          >
            Завершить смену
          </Button>
          <Button
            variant="tertiary"
            size="lg"
            fullWidth
            disabled={action.isPending}
            onClick={onClose}
          >
            Отмена
          </Button>
        </>
      }
    >
      <p className={styles.text}>{shiftEndWarning(count)}</p>
    </BottomSheet>
  );
}
