/** DS-10 «Итоги дня» (FRONTEND_SPEC §8.2). */
import type { DayChain } from '@/adapters/dayChain';
import type { DayModel } from '@/adapters/dayModel';
import { Modal } from '@/ui';

export function SummaryModal({ model, onClose }: { model: DayModel; chain: DayChain; onClose: () => void }) {
  return (
    <Modal open width={720} onClose={onClose} title={`Итоги дня · ${model.date}`}>
      <p>Раздел в работе.</p>
    </Modal>
  );
}
