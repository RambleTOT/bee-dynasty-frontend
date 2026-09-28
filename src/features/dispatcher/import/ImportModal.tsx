import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FilePlus2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  firstLoadedRegion,
  importReportFromError,
  importReportFromSummary,
  importTotals,
  type ImportRegionReport,
} from '@/adapters/importReport';
import { importBeeline } from '@/api/data';
import { getDay } from '@/api/days';
import { queryKeys } from '@/api/queryKeys';
import type { DayRegion } from '@/api/types';
import { formatFileSize, readCsvRowCount } from '@/lib/csv';
import { countOf, formatDateFull, formatDayMonth, PL_BRIGADE, PL_ROW } from '@/lib/format';
import { REGION_LABEL, REGIONS, type RegionId } from '@/lib/statuses';
import { todayMsk } from '@/lib/time';
import { Button, Callout, Input, Modal } from '@/ui';
import { regionsQuery } from '../calendar/regionsQuery';
import { FileDrop } from './FileDrop';
import { initialImportDate, isImportDate } from './importDate';
import { ReportCard } from './ReportCard';
import styles from './ImportModal.module.css';

type FileKind = 'requests' | 'control';

interface Picked {
  file: File;
  /** Строк заявок в файле; `null` — ещё считаем или не прочитали. */
  rows: number | null;
}

type Picks = Record<RegionId, Record<FileKind, Picked | null>>;

const NO_PICKS = Object.fromEntries(
  REGIONS.map((region) => [region, { requests: null, control: null }]),
) as Picks;

interface ImportJob {
  regionId: RegionId;
  requestsFile: File;
  controlFile: File | null;
}

interface ImportRun {
  date: string;
  reports: ImportRegionReport[];
}

/**
 * Чем занят день региона — второй файл на него не грузим. Демо-день не мешает: календарь создаёт
 * его на сегодня сам, а заменить его CSV должен бэк (docs/BACKEND_REQUESTS.md п. 31).
 */
const DAY_TAKEN: Record<string, string> = {
  csv: 'уже загружен CSV',
  booking: 'уже есть записи оператора',
};

/** День региона на дату (`/days` пропускает архивные), если он не даёт загрузить CSV. */
function takenDay(
  data: { regions: DayRegion[] } | undefined,
  regionId: RegionId,
): DayRegion | null {
  const day = data?.regions.find((region) => region.region_id === regionId && region.scenario_id);
  return day && DAY_TAKEN[day.source ?? ''] ? day : null;
}

const requestsMeta = ({ file, rows }: Picked) =>
  rows === null
    ? formatFileSize(file.size)
    : `${countOf(rows, PL_ROW)} · ${formatFileSize(file.size)}`;

const controlMeta = ({ rows }: Picked) =>
  rows === null
    ? 'Контрольное распределение'
    : `Контрольное распределение · ${countOf(rows, PL_ROW)}`;

/** Файл, брошенный мимо зоны, браузер открыл бы вместо приложения — пока модалка открыта, не даём. */
function useBlockStrayDrops() {
  useEffect(() => {
    const block = (event: DragEvent) => event.preventDefault();
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);
}

/**
 * DS-02 «Загрузка CSV» — модалка 720 в два шага (FRONTEND_SPEC §8.2):
 * 1) дата плана и файлы по регионам → регионы грузятся параллельно на выбранную дату;
 * 2) отчёт импорта по каждому региону → «Открыть день».
 * Дата по умолчанию — сегодня, с пустого дня — дата этого дня (`initialDate`). В спеке даты нет
 * (D-26: всегда сегодня) — поле добавлено по просьбе заказчика, docs/API_NOTES.md п. 55.
 */
export function ImportModal({
  onClose,
  initialDate = null,
}: {
  onClose: () => void;
  initialDate?: string | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const regions = useQuery(regionsQuery);
  const [picks, setPicks] = useState<Picks>(NO_PICKS);
  const [run, setRun] = useState<ImportRun | null>(null);
  const [date, setDate] = useState(() => initialImportDate(initialDate));
  const dateOk = isImportDate(date);
  useBlockStrayDrops();

  // Один CSV на (регион, дату): если у региона на эту дату уже загружен CSV или есть записи
  // оператора, второй файл не грузим — сначала старые записи дня нужно удалить.
  const dayChecks = useQueries({
    queries: REGIONS.map((regionId) => ({
      queryKey: queryKeys.days(date, regionId),
      queryFn: ({ signal }: { signal: AbortSignal }) => getDay(date, regionId, signal),
      enabled: dateOk && !run,
      staleTime: 0,
    })),
  });
  const taken = Object.fromEntries(
    REGIONS.map((regionId, index) => [regionId, takenDay(dayChecks[index].data, regionId)]),
  ) as Record<RegionId, DayRegion | null>;
  const checking = dateOk && !run && dayChecks.some((check) => check.isPending);

  const upload = useMutation({
    mutationFn: async ({ date, jobs }: { date: string; jobs: ImportJob[] }): Promise<ImportRun> => {
      const settled = await Promise.allSettled(
        jobs.map((job) =>
          importBeeline({
            requestsFile: job.requestsFile,
            controlFile: job.controlFile,
            regionId: job.regionId,
            date,
          }),
        ),
      );
      const reports = settled.map((result, index) => {
        const job = jobs[index];
        return result.status === 'fulfilled'
          ? importReportFromSummary(job.regionId, result.value, job.controlFile !== null)
          : importReportFromError(job.regionId, result.reason);
      });
      return { date, reports };
    },
    // Колбэк мутации, а не вызова: календарь обновится, даже если модалку закрыли во время загрузки.
    onSuccess: ({ reports }) => {
      if (!reports.some((report) => report.loaded)) return;
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['days'] });
    },
  });

  function setPicked(region: RegionId, kind: FileKind, picked: Picked | null) {
    setPicks((prev) => ({ ...prev, [region]: { ...prev[region], [kind]: picked } }));
  }

  function pick(region: RegionId, kind: FileKind, file: File) {
    setPicked(region, kind, { file, rows: null });
    readCsvRowCount(file).then(
      (rows) =>
        setPicks((prev) =>
          prev[region][kind]?.file === file
            ? { ...prev, [region]: { ...prev[region], [kind]: { file, rows } } }
            : prev,
        ),
      () => undefined, // не прочитали — покажем только размер, число строк посчитает бэк
    );
  }

  const jobs: ImportJob[] = REGIONS.flatMap((regionId) => {
    const { requests, control } = picks[regionId];
    return requests && !taken[regionId]
      ? [{ regionId, requestsFile: requests.file, controlFile: control?.file ?? null }]
      : [];
  });

  const busy = upload.isPending;

  if (run) {
    const totals = importTotals(run.reports);
    const dayRegion = firstLoadedRegion(run.reports);
    return (
      <Modal
        open
        width={720}
        title="Отчёт импорта"
        subtitle={`Шаг 2 из 2 · план на ${formatDateFull(run.date)}`}
        onClose={onClose}
        footer={
          <>
            {totals && <span className={styles.totals}>{totals}</span>}
            <Button
              variant="ghost"
              icon={ArrowLeft}
              onClick={() => {
                upload.reset();
                setRun(null);
              }}
            >
              Назад
            </Button>
            <Button
              variant="primary"
              iconRight={ArrowRight}
              disabled={!dayRegion}
              onClick={() => navigate(`/dispatcher/day/${run.date}?region=${dayRegion}`)}
            >
              Открыть день
            </Button>
          </>
        }
      >
        <div className={styles.stack}>
          {run.reports.map((report) => (
            <ReportCard key={report.regionId} report={report} />
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      width={720}
      title="Загрузка CSV"
      subtitle="Шаг 1 из 2 · файлы. Можно загрузить от 1 до 3 регионов"
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            icon={Upload}
            loading={busy}
            disabled={jobs.length === 0 || !dateOk || checking}
            onClick={() => upload.mutate({ date, jobs }, { onSuccess: setRun })}
          >
            Загрузить
          </Button>
        </>
      }
    >
      <div className={styles.stack}>
        <Input
          type="date"
          label="Дата плана"
          value={date}
          min={todayMsk()}
          required
          disabled={busy}
          fieldClassName={styles.dateField}
          hint={dateOk ? `Заявки из файлов попадут на ${formatDayMonth(date)}` : undefined}
          error={dateOk ? undefined : 'Выберите сегодняшний или будущий день'}
          onChange={(event) => setDate(event.target.value)}
        />
        {REGIONS.map((regionId) => {
          const { requests, control } = picks[regionId];
          const brigades = regions.data?.find(
            (region) => region.region_id === regionId,
          )?.engineer_count;
          const name = REGION_LABEL[regionId];
          const day = taken[regionId];
          const locked = busy || day !== null;
          return (
            <section key={regionId} className={styles.region} aria-label={name}>
              <div className={styles.regionHead}>
                <h3 className={styles.regionName}>{name}</h3>
                {brigades !== undefined && (
                  <span className={styles.regionNote}>{countOf(brigades, PL_BRIGADE)}</span>
                )}
              </div>
              {day && (
                <Callout tone="warning">
                  На {formatDayMonth(date)} у региона {DAY_TAKEN[day.source ?? '']}. Второй CSV на
                  этот день не загрузить — сначала удалите старые записи дня
                </Callout>
              )}
              <div className={styles.files}>
                <FileDrop
                  label="Файл заявок (.csv)"
                  hint="Перетащите файл или выберите"
                  icon={Upload}
                  inputLabel={`Файл заявок (.csv) · ${name}`}
                  picked={requests && { name: requests.file.name, meta: requestsMeta(requests) }}
                  disabled={locked}
                  onPick={(file) => pick(regionId, 'requests', file)}
                  onClear={() => setPicked(regionId, 'requests', null)}
                />
                <FileDrop
                  label="Контрольное распределение — по желанию"
                  hint="Нужен для сравнения с реальным диспетчером"
                  icon={FilePlus2}
                  inputLabel={`Контрольное распределение · ${name}`}
                  picked={control && { name: control.file.name, meta: controlMeta(control) }}
                  disabled={locked}
                  onPick={(file) => pick(regionId, 'control', file)}
                  onClear={() => setPicked(regionId, 'control', null)}
                />
              </div>
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
