/**
 * DS-04 «Карточка заявки» — только для назначенных (D-29): серый блок фактов, «Почему этот инженер»
 * с тремя ограничениями и «Почему не другие» (FRONTEND_SPEC §6.2, §8.2).
 */
import { ArrowRightLeft, ChevronDown, ChevronUp, CircleCheck, CircleX } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { assignmentSummary, constraintRows, otherEngineers } from '@/adapters/constraints';
import type { DayModel } from '@/adapters/dayModel';
import { formatKm } from '@/lib/format';
import { isRequestStatus } from '@/lib/statuses';
import { Button, Drawer, EmptyState, FlagChip, StatusChip, cx } from '@/ui';
import styles from './Overlays.module.css';

export function RequestDrawer({
  model,
  requestId,
  onClose,
  onCancel,
  onReassign,
}: {
  model: DayModel;
  requestId: string;
  onClose: () => void;
  onCancel: (orderId: string) => void;
  onReassign: (orderId: string) => void;
}) {
  const [details, setDetails] = useState(false);
  const request = model.requestById.get(requestId);
  const visit = request?.visit ?? null;
  const engineer = request?.engineerId ? model.engineerById.get(request.engineerId) : null;

  if (!request || !visit || !engineer) {
    return (
      <Drawer open onClose={onClose} title={`№${requestId}`}>
        <EmptyState title="Заявка не найдена в текущей версии плана">
          Возможно, её сняли или передали в другую версию. Обновите день.
        </EmptyState>
      </Drawer>
    );
  }

  const route = model.routeByEngineer.get(engineer.id);
  const position = (route?.visits.findIndex((v) => v.requestId === request.id) ?? -1) + 1;
  const explanation = model.explanations.get(request.id);
  const rows = constraintRows(visit, request, engineer);
  const others = otherEngineers(model, request, explanation);
  const reasons = explanation?.reasons ?? [];
  const canEdit = model.planState === 'applied';
  const closed = request.status === 'done' || request.status === 'cancelled';
  const gigabit = request.raw.gigabit || request.technology
    ? [request.raw.gigabit ? 'да' : 'нет', request.technology].filter(Boolean).join(' · ')
    : null;

  const fields: { label: string; value: ReactNode; wide?: boolean }[] = [
    { label: 'Адрес', value: request.addressText, wide: true },
    ...(request.district ? [{ label: 'Район', value: request.district }] : []),
    { label: 'Временное окно', value: request.windowFull },
    { label: 'Приезд · начало · окончание', value: `${visit.arrival} · ${visit.start} · ${visit.end}` },
    {
      label: 'Длительность',
      value: model.synthetic ? `${request.durationMinutes} мин` : `${request.durationMinutes} мин по нормативу`,
    },
    ...(gigabit && !model.synthetic ? [{ label: 'Гигабит · технология', value: gigabit }] : []),
    { label: 'Требуемый транспорт', value: request.requiredTransport ? request.requiredTransportLabel : 'Не требуется' },
    {
      label: 'Инженер',
      value: (
        <>
          <span className={cx(styles.dot, styles[`c${engineer.color.index}`])} aria-hidden />
          {engineer.label} · {engineer.transportLabel.toLowerCase()}
        </>
      ),
    },
    {
      label: '№ в маршруте · от предыдущей',
      value: `${position || visit.sequence} из ${route?.visits.length ?? '—'} · ${formatKm(visit.legKm)} км`,
    },
  ];

  return (
    <Drawer
      open
      onClose={onClose}
      title={request.number}
      subtitle={request.typeFull}
      footer={
        <>
          <Button
            variant="danger"
            icon={CircleX}
            disabled={!canEdit || closed}
            onClick={() => onCancel(request.id)}
          >
            Отменить заявку
          </Button>
          <Button
            variant="tertiary"
            icon={ArrowRightLeft}
            disabled={!canEdit || closed}
            onClick={() => onReassign(request.id)}
          >
            Переназначить
          </Button>
        </>
      }
    >
      <div className={styles.chipsRow}>
        {isRequestStatus(request.status) && <StatusChip status={request.status} />}
        {request.flags.map((flag) => (
          <FlagChip key={flag} flag={flag} />
        ))}
      </div>
      <dl className={styles.facts}>
        {fields.map((field) => (
          <div key={field.label} className={cx(styles.fact, field.wide && styles.factWide)}>
            <dt className={styles.factLabel}>{field.label}</dt>
            <dd className={cx(styles.factValue, field.label === 'Адрес' && !request.hasAddress && styles.tertiary)}>
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
      <section className={styles.section}>
        <h3 className={styles.h3}>Почему этот инженер</h3>
        <p className={styles.body}>{assignmentSummary(visit, request, engineer)}</p>
        <button type="button" className={styles.more} aria-expanded={details} onClick={() => setDetails((v) => !v)}>
          Подробнее
          {details ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
        </button>
        {details && (
          <>
            <div className={styles.checks}>
              {rows.map((row) => (
                <div key={row.key} className={styles.check}>
                  <span className={row.ok ? styles.ok : styles.bad}>
                    {row.ok ? <CircleCheck size={18} aria-label="соблюдено" /> : <CircleX size={18} aria-label="нарушено" />}
                  </span>
                  <div>
                    <div className={styles.checkTitle}>{row.label}</div>
                    <div className={styles.caption}>{row.text}</div>
                  </div>
                </div>
              ))}
            </div>
            {reasons.length > 0 && (
              <ul className={styles.reasons}>
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </>
        )}
        {others.length > 0 && (
          <>
            <div className={styles.subhead}>Почему не другие</div>
            {others.map((other) => (
              <div key={other.engineerId} className={styles.other}>
                <span className={cx(styles.dot, styles[`c${other.color.index}`])} aria-hidden />
                <span className={styles.otherName}>{other.label}</span>
                <span className={styles.caption}>— {other.reason}</span>
              </div>
            ))}
          </>
        )}
      </section>
    </Drawer>
  );
}
