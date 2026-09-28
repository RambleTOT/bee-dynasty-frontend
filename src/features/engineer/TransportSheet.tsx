import { Play } from 'lucide-react';
import { useState } from 'react';
import type { EngineerModel } from '@/adapters/engineerDay';
import { TRANSPORT_ICON } from '@/lib/dictionaries';
import { TRANSPORT_LABEL, TRANSPORTS, type Transport } from '@/lib/statuses';
import { BottomSheet, Button, Callout, RadioCards } from '@/ui';
import { useEngineerAction } from './useEngineerDay';
import styles from './Sheets.module.css';

/**
 * E-02 «На чём сегодня?» → `shift_start {payload: {transport}}`. По умолчанию — транспорт по
 * справочнику; бэк сам сообщает диспетчеру о смене транспорта (`transport_changed`).
 */
export function TransportSheet({
  engineer,
  onClose,
}: {
  engineer: Pick<EngineerModel, 'transport'>;
  onClose: () => void;
}) {
  const reference = engineer.transport;
  const [transport, setTransport] = useState<Transport>(reference ?? 'car');
  const action = useEngineerAction();

  const options = TRANSPORTS.map((value) => ({
    value,
    label: TRANSPORT_LABEL[value],
    icon: TRANSPORT_ICON[value],
    meta: value === reference ? 'по справочнику' : undefined,
  }));
  // [Д] Плашка — когда отказались от справочного транспорта не в пользу автомобиля
  const warn = reference !== null && transport !== reference && transport !== 'car';

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="На чём сегодня?"
      subtitle="От этого зависят маршрут и заявки"
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={Play}
          loading={action.isPending}
          onClick={() =>
            action.mutate({ action: 'shift_start', payload: { transport } }, { onSuccess: onClose })
          }
        >
          Поехали
        </Button>
      }
    >
      <RadioCards
        name="transport"
        dotSide="right"
        options={options}
        value={transport}
        onChange={setTransport}
        className={styles.options}
      />
      {warn && (
        <Callout tone="warning">
          Заявки, где нужен автомобиль, передадут другим инженерам после решения диспетчера
        </Callout>
      )}
    </BottomSheet>
  );
}
