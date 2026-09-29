import type { FieldDef, Mapping } from '@/adapters/columnMap';
import type { CsvTable } from '@/adapters/csvTable';
import { Select, type SelectOption } from '@/ui';
import styles from './RegionWizard.module.css';

const NONE = '';

/** Первое непустое значение колонки — пример под выбором. */
function sampleOf(table: CsvTable, column: number | null): string {
  if (column === null) return '';
  return table.rows.find((row) => (row[column] ?? '').trim())?.[column]?.trim() ?? '';
}

/** Поле → колонка файла: список колонок и пример значения из файла. */
export function MappingTable<F extends string>({
  fields,
  mapping,
  table,
  onChange,
  disabled = false,
}: {
  fields: readonly FieldDef<F>[];
  mapping: Mapping<F>;
  table: CsvTable;
  onChange: (next: Mapping<F>) => void;
  disabled?: boolean;
}) {
  const options: SelectOption[] = [
    { value: NONE, label: '— нет колонки —' },
    ...table.header.map((name, index) => ({
      value: String(index),
      label: name || `Колонка ${index + 1}`,
    })),
  ];
  return (
    <div className={styles.mapping} role="group" aria-label="Колонки файла">
      <span className={styles.mappingHead}>Поле</span>
      <span className={styles.mappingHead}>Колонка файла</span>
      <span className={styles.mappingHead}>Пример</span>
      {fields.map((field) => {
        const column = mapping[field.key];
        return (
          <FieldRow
            key={field.key}
            label={field.label}
            required={field.required}
            value={column === null ? NONE : String(column)}
            sample={sampleOf(table, column)}
            options={options}
            disabled={disabled}
            onChange={(value) =>
              onChange({ ...mapping, [field.key]: value === NONE ? null : Number(value) })
            }
          />
        );
      })}
    </div>
  );
}

function FieldRow({
  label,
  required,
  value,
  sample,
  options,
  disabled,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  sample: string;
  options: SelectOption[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <span className={styles.fieldLabel}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden>
            {' '}
            *
          </span>
        )}
      </span>
      <Select
        size="sm"
        tone="white"
        aria-label={label}
        options={options}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
      <span className={styles.sample} title={sample}>
        {sample || '—'}
      </span>
    </>
  );
}
