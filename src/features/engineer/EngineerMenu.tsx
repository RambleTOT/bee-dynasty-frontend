import { Ellipsis } from 'lucide-react';
import { hasActiveVisit, type EngineerDayModel } from '@/adapters/engineerDay';
import { useAuth } from '@/auth/useAuth';
import { ActionMenu, IconButton } from '@/ui';

/**
 * Меню ⋯ (D-31): «Не могу работать» и «Завершить смену» — только на смене; «Завершить смену»
 * неактивна, пока есть заявка в пути или в работе (бэк вернёт 409); «Выйти» — всегда.
 */
export function EngineerMenu({
  day,
  onUnavailable,
  onShiftEnd,
}: {
  day?: EngineerDayModel;
  onUnavailable: () => void;
  onShiftEnd: () => void;
}) {
  const { logout } = useAuth();
  const onShift = day?.engineer.shiftStatus === 'on_shift';
  const busy = day ? hasActiveVisit(day) : false;
  const items = [
    ...(onShift
      ? [
          { label: 'Не могу работать', onSelect: onUnavailable },
          {
            label: 'Завершить смену',
            onSelect: onShiftEnd,
            disabled: busy,
            hint: busy ? 'Сначала завершите текущую заявку' : undefined,
          },
        ]
      : []),
    { label: 'Выйти', onSelect: () => void logout() },
  ];
  return (
    <ActionMenu
      items={items}
      trigger={({ open, toggle, id }) => (
        <IconButton
          icon={Ellipsis}
          label="Меню"
          variant="ghost"
          size="lg"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={toggle}
        />
      )}
    />
  );
}
