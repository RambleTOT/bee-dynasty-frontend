/** Баннер предложения (DS-03): «Есть предложение после события «…»: изменилось N назначений». */
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, GitCompareArrows } from 'lucide-react';
import { getPlanDiff } from '@/api/planning';
import { queryKeys } from '@/api/queryKeys';
import type { DayChain } from '@/adapters/dayChain';
import type { DayModel } from '@/adapters/dayModel';
import { changedAssignments, eventTimeOf, eventTitle } from '@/adapters/proposal';
import { plural, timeOfIso } from '@/lib/format';
import { Button, DarkBanner } from '@/ui';

const PL_ASSIGNMENT = ['назначение', 'назначения', 'назначений'] as const;

export function ProposalBanner({
  model,
  chain,
  onOpen,
}: {
  model: DayModel;
  chain: DayChain;
  onOpen: (planId: string) => void;
}) {
  const proposal = model.pendingProposals[0];
  const against = model.planId;
  const diff = useQuery({
    queryKey: queryKeys.diff(proposal?.plan_id ?? '-', against ?? '-'),
    queryFn: ({ signal }) => getPlanDiff(proposal.plan_id, against as string, signal),
    enabled: Boolean(proposal && against),
    staleTime: Infinity,
    retry: false,
  });
  if (!proposal) return null;

  const event = chain.events.find((e) => e.event_id === proposal.event_id);
  const title = event
    ? eventTitle(model, event.event_type, event.payload)
    : (proposal.event_type ?? proposal.headline ?? 'событие');
  const n = diff.data ? changedAssignments(diff.data.summary) : null;
  const more = model.pendingProposals.length - 1;
  // время события по часам дня, как в ленте; нет — время расчёта
  const time = (event ? eventTimeOf(event) : null) ?? timeOfIso(proposal.created_at ?? event?.created_at);

  return (
    <DarkBanner
      icon={GitCompareArrows}
      aside={`${time ? `${time} · ` : ''}ждёт решения${more > 0 ? ` · ещё ${more}` : ''}`}
      action={
        <Button variant="secondary" size="sm" iconRight={ArrowRight} onClick={() => onOpen(proposal.plan_id)}>
          Открыть
        </Button>
      }
    >
      Есть предложение после события «{title}»
      {n != null ? `: изменилось ${n} ${plural(n, PL_ASSIGNMENT)}` : ''}
    </DarkBanner>
  );
}
