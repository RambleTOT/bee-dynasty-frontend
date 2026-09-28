/** DS-04 «Карточка заявки». */
import type { DayModel } from '@/adapters/dayModel';
import { Drawer } from '@/ui';

export function RequestDrawer({
  requestId,
  onClose,
}: {
  model: DayModel;
  requestId: string;
  onClose: () => void;
  onCancel: (orderId: string) => void;
  onReassign: (orderId: string) => void;
}) {
  return (
    <Drawer open onClose={onClose} title={`№${requestId}`}>
      <p>…</p>
    </Drawer>
  );
}
