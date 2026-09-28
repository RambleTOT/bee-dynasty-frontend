/** DS-06 «Событие». */
import type { DispatcherEvent } from '@/api/events';
import type { DayModel } from '@/adapters/dayModel';
import { Modal } from '@/ui';
import type { EventTab } from './daySearch';
import type { DayActions } from './useDayActions';

export function EventModal({
  onClose,
}: {
  tab: EventTab;
  model: DayModel;
  orderId: string | null;
  actions: DayActions;
  onTab: (tab: EventTab) => void;
  onClose: () => void;
  onProposal: (planId: string, event: DispatcherEvent) => void;
}) {
  return (
    <Modal open onClose={onClose} title="Событие">
      <p>…</p>
    </Modal>
  );
}
