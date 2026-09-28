/**
 * DS-06 «Событие» (FRONTEND_SPEC §6.4): «Срочная заявка» · «Отмена» · «Инженер недоступен».
 * Все события — `apply: false`, `source: 'dispatcher'`; ответ открывает DS-07 с предложением.
 */
import { Calculator, Car, Clock, Info, MapPin, Search, X, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DispatcherEvent } from '@/api/events';
import { errorMessage } from '@/api/errors';
import type { DayModel, DayRequest } from '@/adapters/dayModel';
import {
  cancelEvent,
  maxShiftEnd,
  TRANSPORT_OPTIONS,
  unavailableEvent,
  urgentEvent,
  urgentIdFor,
} from '@/adapters/proposal';
import { notify } from '@/lib/notify';
import { REGION_LABEL, REGIONS, isRequestStatus, REQUEST_STATUS_LABEL } from '@/lib/statuses';
import { Button, Callout, Input, Modal, RadioCards, SegmentedControl, Select, Textarea, cx } from '@/ui';
import type { EventTab } from './daySearch';
import type { DayActions } from './useDayActions';
import styles from './Overlays.module.css';

const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;
const CLOSED = new Set(['done', 'cancelled', 'rescheduled']);
const HD_OPTIONS = [
  { value: 'Авария', label: 'Авария' },
  { value: 'Информация', label: 'Информация' },
];

function matchRequest(request: DayRequest, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^№/, '');
  if (!q) return true;
  return request.id.toLowerCase().includes(q) || (request.hasAddress && request.addressText.toLowerCase().includes(q));
}

export function EventModal({
  tab,
  model,
  orderId,
  actions,
  onTab,
  onRegion,
  onClose,
  onProposal,
}: {
  tab: EventTab;
  model: DayModel;
  orderId: string | null;
  actions: DayActions;
  onTab: (tab: EventTab) => void;
  onRegion: (regionId: string) => void;
  onClose: () => void;
  onProposal: (planId: string, event: DispatcherEvent) => void;
}) {
  const [time, setTime] = useState(model.now);
  const [address, setAddress] = useState('');
  const [typeHd, setTypeHd] = useState<'Авария' | 'Информация'>('Авария');
  const [transport, setTransport] = useState('car');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(orderId);
  const [reason, setReason] = useState<'client_refused' | 'other'>('client_refused');
  const [comment, setComment] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [offReason, setOffReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const published = model.planState === 'applied' && Boolean(model.planId);
  const addressHints = useMemo(() => {
    const seen = new Set<string>();
    return model.requests.filter((r) => {
      if (!r.hasAddress || !r.point || seen.has(r.addressText)) return false;
      seen.add(r.addressText);
      return true;
    });
  }, [model.requests]);
  const openRequests = model.requests.filter((r) => !CLOSED.has(r.status));
  const found = openRequests.filter((r) => matchRequest(r, query)).slice(0, 6);
  const pickedRequest = picked ? model.requestById.get(picked) : undefined;
  const onShift = model.engineers.filter((e) => e.available && e.shiftStatus !== 'finished');

  const timeError = touched && !TIME.test(time) ? 'Время в формате ЧЧ:ММ' : null;
  const addressError = touched && tab === 'urgent' && !address.trim() ? 'Укажите адрес' : null;
  const orderError = touched && tab === 'cancel' && !pickedRequest ? 'Выберите заявку' : null;
  const commentError = touched && tab === 'cancel' && reason === 'other' && !comment.trim() ? 'Опишите причину' : null;
  const engineerError = touched && tab === 'off' && !engineerId ? 'Выберите инженера' : null;

  const build = (): DispatcherEvent | null => {
    if (!model.planId || !TIME.test(time)) return null;
    const eventTime = time.padStart(5, '0');
    if (tab === 'urgent') {
      if (!address.trim()) return null;
      const hint = addressHints.find((r) => r.addressText === address.trim());
      const raw = hint?.raw;
      return urgentEvent(
        {
          planId: model.planId,
          eventTime,
          address,
          typeHd,
          transport: transport || null,
          shiftEnd: maxShiftEnd(model),
          point: raw && Number.isFinite(raw.latitude) ? { lat: raw.latitude, lon: raw.longitude } : null,
          district: hint?.district ?? null,
        },
        urgentIdFor(new Set(model.requests.map((r) => r.id))),
      );
    }
    if (tab === 'cancel') {
      if (!pickedRequest || (reason === 'other' && !comment.trim())) return null;
      return cancelEvent(model.planId, eventTime, pickedRequest.id, reason, comment);
    }
    if (!engineerId) return null;
    return unavailableEvent(model.planId, eventTime, engineerId, offReason);
  };

  const submit = async () => {
    setTouched(true);
    setError(null);
    const event = build();
    if (!event) return;
    try {
      const result = await actions.sendEvent.mutateAsync(event);
      if (result.status === 'proposed') {
        onProposal(result.plan.plan_id, event);
      } else {
        notify('Событие применено', 'success');
        onClose();
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const regionField = (
    <Select
      label="Регион"
      tone="filled"
      value={model.regionId}
      options={REGIONS.map((r) => ({ value: r as string, label: REGION_LABEL[r] }))}
      onChange={onRegion}
    />
  );
  const timeField = (
    <Input
      label={tab === 'off' ? 'С какого времени' : 'Время события'}
      tone="filled"
      icon={Clock}
      inputMode="numeric"
      placeholder="ЧЧ:ММ"
      value={time}
      onChange={(e) => setTime(e.target.value)}
      hint="По умолчанию — сейчас"
      error={timeError}
    />
  );

  return (
    <Modal
      open
      width={560}
      onClose={onClose}
      title="Событие"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            icon={Calculator}
            loading={actions.sendEvent.isPending}
            disabled={!published}
            onClick={() => void submit()}
          >
            Рассчитать изменения
          </Button>
        </>
      }
    >
      <SegmentedControl<EventTab>
        fullWidth
        value={tab}
        onChange={(next) => {
          setTouched(false);
          setError(null);
          onTab(next);
        }}
        label="Тип события"
        options={[
          { value: 'urgent', label: 'Срочная заявка', icon: Zap },
          { value: 'cancel', label: 'Отмена' },
          { value: 'off', label: 'Инженер недоступен' },
        ]}
      />
      {!published && (
        <Callout tone="warning">
          В регионе «{REGION_LABEL[model.regionId as keyof typeof REGION_LABEL] ?? model.regionId}» план на этот день не
          опубликован — события появятся после публикации.
        </Callout>
      )}
      <div className={styles.grid2}>
        {timeField}
        {regionField}
      </div>

      {tab === 'urgent' && (
        <>
          <Input
            label="Адрес"
            tone="filled"
            icon={MapPin}
            list="event-address-hints"
            placeholder="Улица, дом"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            error={addressError}
            hint="Подсказки — адреса заявок дня: по ним точка встанет на карту"
          />
          <datalist id="event-address-hints">
            {addressHints.map((r) => (
              <option key={r.id} value={r.addressText} />
            ))}
          </datalist>
          <div className={styles.grid2}>
            <Select
              label="Тип заявки HD"
              tone="filled"
              value={typeHd}
              options={HD_OPTIONS}
              onChange={(value) => setTypeHd(value as 'Авария' | 'Информация')}
            />
            <Select
              label="Требуемый транспорт"
              tone="filled"
              icon={Car}
              value={transport}
              options={TRANSPORT_OPTIONS}
              onChange={setTransport}
            />
          </div>
          <div className={styles.infoRow}>
            <Zap size={16} className={styles.danger} aria-hidden />
            Аварийные работы · 80 мин на адресе · ориентир реакции до 2 ч
          </div>
        </>
      )}

      {tab === 'cancel' && (
        <>
          {pickedRequest ? (
            <div className={styles.pickedRequest}>
              <div className={styles.pickedText}>
                <div className={styles.pickedTitle}>
                  №{pickedRequest.id} · {pickedRequest.typeBk} · окно {pickedRequest.windowShort}
                </div>
                <div className={styles.caption}>
                  {pickedRequest.addressText}
                  {pickedRequest.engineerId
                    ? ` · ${model.engineerById.get(pickedRequest.engineerId)?.label ?? ''}`
                    : isRequestStatus(pickedRequest.status)
                      ? ` · ${REQUEST_STATUS_LABEL[pickedRequest.status]}`
                      : ''}
                </div>
              </div>
              <Button variant="ghost" size="sm" icon={X} onClick={() => setPicked(null)}>
                Другая
              </Button>
            </div>
          ) : (
            <div className={styles.picker}>
              <Input
                label="Заявка"
                tone="filled"
                icon={Search}
                placeholder="№ заявки или адрес"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                error={orderError}
              />
              <div className={styles.pickList} role="listbox" aria-label="Заявки дня">
                {found.length === 0 ? (
                  <div className={cx(styles.caption, styles.pickEmpty)}>Не нашли заявку среди заявок дня</div>
                ) : (
                  found.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      className={styles.pickItem}
                      onClick={() => setPicked(r.id)}
                    >
                      <span className={styles.pickId}>№{r.id}</span>
                      <span className={styles.caption}>
                        {r.typeShort} · {r.windowShort} · {r.addressText}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          <RadioCards
            name="cancel-reason"
            value={reason}
            onChange={setReason}
            options={[
              { value: 'client_refused', label: 'Клиент отказался' },
              { value: 'other', label: 'Другое' },
            ]}
          />
          {reason === 'other' && (
            <Textarea
              label="Опишите причину"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              error={commentError}
            />
          )}
        </>
      )}

      {tab === 'off' && (
        <>
          <Select
            label="Инженер"
            tone="filled"
            placeholder="Выберите бригаду на смене"
            value={engineerId}
            options={onShift.map((e) => ({
              value: e.id,
              label: `${e.label} · ${e.used ? `${e.taskCount} заявок` : 'не задействован'}`,
            }))}
            onChange={setEngineerId}
            error={engineerError}
          />
          <Input
            label="Причина — необязательно"
            tone="filled"
            value={offReason}
            onChange={(e) => setOffReason(e.target.value)}
          />
        </>
      )}

      {error && <Callout tone="danger">{error}</Callout>}
      <div className={styles.note}>
        <Info size={16} aria-hidden />
        План не изменится, пока вы не примете предложение
      </div>
    </Modal>
  );
}
