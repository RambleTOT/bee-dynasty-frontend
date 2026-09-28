/** DS-08 «Ручное переназначение» (FRONTEND_SPEC §6.7). */
import type { DayModel } from '@/adapters/dayModel';
import { Modal } from '@/ui';
import type { DayActions } from './useDayActions';

export function ReassignModal({
  requestId,
  onClose,
}: {
  requestId: string;
  /** План, от которого переназначаем; `null` — действующий. */
  basePlanId: string | null;
  model: DayModel;
  actions: DayActions;
  onClose: () => void;
}) {
  return (
    <Modal open width={560} onClose={onClose} title={`Заявка №${requestId} → инженер`}>
      <p>Раздел в работе.</p>
    </Modal>
  );
}
