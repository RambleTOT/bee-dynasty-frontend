/** DS-05 «Сравнение на весь экран» (FRONTEND_SPEC §6.3, §8.2). */
import type { DayChain } from '@/adapters/dayChain';
import type { DayModel } from '@/adapters/dayModel';
import { Modal } from '@/ui';

export function CompareModal({ model, onClose }: { model: DayModel; chain: DayChain; onClose: () => void }) {
  return (
    <Modal open width={1200} onClose={onClose} title="Сравнение планов" subtitle={`Версия ${model.version}`}>
      <p>Раздел в работе.</p>
    </Modal>
  );
}
