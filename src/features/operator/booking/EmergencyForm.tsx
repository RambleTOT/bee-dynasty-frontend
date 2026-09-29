import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Info, Map as MapIcon, Send, Zap } from 'lucide-react';
import { useState } from 'react';
import { applyOperatorEmergency } from '@/api/booking';
import { errorMessage, isApiError } from '@/api/errors';
import { BK, HD_BY_BK, TRANSPORT_ICON } from '@/lib/dictionaries';
import { notify } from '@/lib/notify';
import { TRANSPORT_LABEL, TRANSPORTS, isTransport, type Transport } from '@/lib/statuses';
import { Button, Callout, Select, Textarea } from '@/ui';
import { AddressInput } from '../../shared/AddressInput';
import { invalidateBooking, mutationErrorText } from '../bookingCache';
import { T } from '../operatorTexts';
import { emergencyInput, type EmergencyInput } from './emergency';
import type { RegionPicker } from './RegularForm';
import styles from './forms.module.css';

/** HD аварии: «Авария» (по умолчанию) · «Информация». */
const EMERGENCY_HD = HD_BY_BK[BK.emergency];
const HD_OPTIONS = EMERGENCY_HD.map((hd) => ({ value: hd, label: hd }));
const TRANSPORT_OPTIONS = TRANSPORTS.map((transport) => ({
  value: transport,
  label: TRANSPORT_LABEL[transport],
}));

/**
 * Вкладка «Авария» O-01 (FRONTEND_SPEC §8.3.9) — только при `emergencyByRegion` (⏳ 9.1).
 * Дата и окно не нужны: аварию распределит диспетчер, он получит предложение.
 */
export function EmergencyForm({ regions }: { regions: RegionPicker }) {
  const queryClient = useQueryClient();
  const [typeHd, setTypeHd] = useState<string>(EMERGENCY_HD[0]);
  const [address, setAddress] = useState('');
  const [transport, setTransport] = useState<Transport>('car');
  const [comment, setComment] = useState('');
  // 409 / 422 бэка — плашка над кнопкой («Рабочий день в регионе … ещё не начат»)
  const [problem, setProblem] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: (input: EmergencyInput) => applyOperatorEmergency(input),
    onSuccess: () => {
      notify(T.crash.ok, 'success');
      // форма очищается, регион остаётся
      setTypeHd(EMERGENCY_HD[0]);
      setAddress('');
      setTransport('car');
      setComment('');
      invalidateBooking(queryClient);
    },
    onError: (error) => {
      if (isApiError(error) && (error.status === 409 || error.status === 422)) {
        setProblem(errorMessage(error));
        return;
      }
      notify(mutationErrorText(error), 'error');
    },
  });

  const region = regions.region;
  const ready = Boolean(region) && address.trim() !== '';

  function submit() {
    if (!region || !ready || send.isPending) return;
    setProblem(null);
    send.mutate(emergencyInput({ region, typeHd, address, transport, comment }));
  }

  // правка полей убирает устаревшую ошибку
  const edited =
    <V,>(set: (value: V) => void) =>
    (value: V) => {
      set(value);
      setProblem(null);
    };

  return (
    <>
      <div className={styles.grid}>
        <Select
          label={T.new.region}
          icon={MapIcon}
          options={regions.regions.map((item) => ({ value: item.id, label: item.name }))}
          value={region ?? ''}
          placeholder={T.new.choose}
          disabled={regions.regions.length === 0}
          onChange={edited(regions.setRegion)}
        />
        <Select
          label={T.new.typeHd}
          icon={Zap}
          options={HD_OPTIONS}
          value={typeHd}
          onChange={edited(setTypeHd)}
        />
        <AddressInput
          fieldClassName={styles.wide}
          label={T.new.address}
          value={address}
          onChange={edited(setAddress)}
        />
        <Select
          fieldClassName={styles.wide}
          label={T.new.transport}
          icon={TRANSPORT_ICON[transport]}
          options={TRANSPORT_OPTIONS}
          value={transport}
          onChange={(value) => isTransport(value) && edited(setTransport)(value)}
        />
        <Textarea
          fieldClassName={styles.wide}
          label={T.crash.comment}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      <Callout icon={Info}>{T.crash.note}</Callout>
      {problem && <Callout tone="danger">{problem}</Callout>}
      <div className={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          icon={Send}
          disabled={!ready}
          loading={send.isPending}
          onClick={submit}
        >
          {T.crash.cta}
        </Button>
      </div>
    </>
  );
}
