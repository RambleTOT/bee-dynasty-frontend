import { CONTROL_FIELDS, groupNotes, REQUEST_FIELDS, ROSTER_FIELDS } from '@/adapters/columnMap';
import { DELIMITER_LABEL, ENCODING_LABEL, type CsvTable } from '@/adapters/csvTable';
import { countOf, formatInt, plural, PL_BRIGADE, PL_REQUEST, PL_ROW } from '@/lib/format';
import { Callout } from '@/ui';
import { MappingTable } from './MappingTable';
import type { RegionDraft } from './useRegionDraft';
import styles from './RegionWizard.module.css';

const tableMeta = (table: CsvTable) =>
  `${ENCODING_LABEL[table.encoding]} · разделитель ${DELIMITER_LABEL[table.delimiter]} · ${countOf(table.rows.length, PL_ROW)}`;

/** «строки 3, 7, 12» — не больше восьми номеров. */
function linesText(lines: readonly number[]): string {
  const shown = lines.slice(0, 8).join(', ');
  const more = lines.length > 8 ? ` и ещё ${formatInt(lines.length - 8)}` : '';
  return `${lines.length === 1 ? 'строка' : 'строки'} ${shown}${more}`;
}

function Errors({ errors }: { errors: readonly string[] }) {
  if (errors.length === 0) return null;
  return (
    <Callout tone="danger">
      {errors.length === 1 ? (
        errors[0]
      ) : (
        <ul className={styles.list}>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </Callout>
  );
}

/** Шаг 2: какая колонка файла — какое поле заявки, контрольного распределения и бригад. */
export function ColumnsStep({ draft, disabled }: { draft: RegionDraft; disabled: boolean }) {
  const requests = draft.files.requests?.table;
  const control = draft.files.control?.table;
  const roster = draft.files.roster?.table;
  const { read, controlRead } = draft;
  const skipped = read ? groupNotes(read.skipped) : [];
  const notes = read ? groupNotes(read.notes) : [];

  return (
    <div className={styles.stack}>
      {requests && draft.requestMap && (
        <section className={styles.section} aria-label="Файл заявок">
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Файл заявок</h3>
            <span className={styles.sectionNote}>{tableMeta(requests)}</span>
          </div>
          <MappingTable
            fields={REQUEST_FIELDS}
            mapping={draft.requestMap}
            table={requests}
            disabled={disabled}
            onChange={draft.setRequestMap}
          />
          <Errors errors={draft.requestErrors} />
          {draft.requestErrors.length === 0 && read && (
            <>
              <Callout tone={read.rows.length > 0 ? 'success' : 'danger'}>
                {read.rows.length > 0
                  ? `Загрузим ${countOf(read.rows.length, PL_REQUEST)}`
                  : 'Ни одной заявки: в каждой строке нет адреса'}
              </Callout>
              {(skipped.length > 0 || notes.length > 0) && (
                <Callout tone="warning">
                  <ul className={styles.list}>
                    {skipped.map(({ text, lines }) => (
                      <li key={`skip:${text}`}>
                        Не загрузим — {text}: {linesText(lines)}
                      </li>
                    ))}
                    {notes.map(({ text, lines }) => (
                      <li key={`note:${text}`}>
                        {text[0].toUpperCase() + text.slice(1)}: {linesText(lines)}
                      </li>
                    ))}
                  </ul>
                </Callout>
              )}
            </>
          )}
        </section>
      )}

      {control && draft.controlMap && (
        <section className={styles.section} aria-label="Контрольное распределение">
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Контрольное распределение</h3>
            <span className={styles.sectionNote}>{tableMeta(control)}</span>
          </div>
          <MappingTable
            fields={CONTROL_FIELDS}
            mapping={draft.controlMap}
            table={control}
            disabled={disabled}
            onChange={draft.setControlMap}
          />
          {typeof controlRead === 'string' && <Errors errors={[controlRead]} />}
          {controlRead && typeof controlRead !== 'string' && read && (
            <Callout tone={controlRead.matched === read.rows.length ? 'success' : 'warning'}>
              Бригада есть у {formatInt(controlRead.matched)} из {formatInt(read.rows.length)}{' '}
              {plural(read.rows.length, ['заявки', 'заявок', 'заявок'])}:{' '}
              {controlRead.by === 'id'
                ? 'сопоставили по номеру заявки'
                : 'сопоставили по порядку строк'}
            </Callout>
          )}
        </section>
      )}

      {roster && draft.rosterMap && (
        <section className={styles.section} aria-label="Файл бригад">
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Бригады</h3>
            <span className={styles.sectionNote}>{tableMeta(roster)}</span>
          </div>
          <MappingTable
            fields={ROSTER_FIELDS}
            mapping={draft.rosterMap}
            table={roster}
            disabled={disabled}
            onChange={draft.setRosterMap}
          />
          <Errors errors={draft.rosterErrors} />
          {draft.rosterErrors.length === 0 && (
            <Callout tone={draft.rosterFileRows.length > 0 ? 'success' : 'danger'}>
              {draft.rosterFileRows.length > 0
                ? `В файле ${countOf(draft.rosterFileRows.length, PL_BRIGADE)}`
                : 'В файле нет ни одной бригады с именем'}
            </Callout>
          )}
        </section>
      )}
    </div>
  );
}
