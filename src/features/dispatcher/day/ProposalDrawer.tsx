/** DS-07 «Предложение». */
import type { DispatcherEvent } from '@/api/events';
import type { DayChain } from '@/adapters/dayChain';
import type { DayModel } from '@/adapters/dayModel';
import { Drawer } from '@/ui';
import type { MapHighlight } from './DayMap';
import type { DayActions } from './useDayActions';

export function ProposalDrawer({
  onClose,
}: {
  planId: string;
  against: string | null;
  model: DayModel;
  chain: DayChain;
  actions: DayActions;
  sentEvent: DispatcherEvent | null;
  onResent: (planId: string, event: DispatcherEvent) => void;
  onShowOnMap: (highlight: MapHighlight) => void;
  onEditManually: (orderId: string, basePlanId: string) => void;
  onClose: () => void;
}) {
  return (
    <Drawer open width={560} onClose={onClose} title="Предложение">
      <p>…</p>
    </Drawer>
  );
}
