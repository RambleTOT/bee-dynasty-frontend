/** DS-09 «Состав и ресурсы» (FRONTEND_SPEC §8.2). */
import type { DayModel } from '@/adapters/dayModel';
import { Drawer } from '@/ui';
import type { DayActions } from './useDayActions';

export function RosterDrawer({
  onClose,
}: {
  model: DayModel;
  /** Открыть сразу с формой «+ Добавить инженера». */
  withAddForm: boolean;
  actions: DayActions;
  /** После события состава (день начат) — открыть DS-07 по предложению. */
  onProposal: (planId: string) => void;
  onClose: () => void;
}) {
  return (
    <Drawer open width={560} onClose={onClose} title="Состав и ресурсы">
      <p>Раздел в работе.</p>
    </Drawer>
  );
}
