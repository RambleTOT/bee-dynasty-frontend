import { Fragment } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import stub from '@/styles/stub.module.css';

interface PlaceholderProps {
  /** ID экрана из DESIGN_SPEC: DS-01, O-02, E-05… */
  id: string;
  title: string;
}

/** Заглушка экрана: ID, название, параметры пути и query (в них открываются модальные экраны). */
export function Placeholder({ id, title }: PlaceholderProps) {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const pathEntries = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );
  const queryEntries = [...searchParams.entries()];

  return (
    <section className={stub.card} aria-labelledby="placeholder-title">
      <span className={stub.muted}>{id}</span>
      <h1 id="placeholder-title" className={stub.title}>
        {title}
      </h1>
      <p className={stub.muted}>Заглушка экрана — вёрстка и данные появятся в следующих этапах.</p>

      <h2>Параметры пути</h2>
      <ParamList entries={pathEntries} />

      <h2>Query-параметры</h2>
      <ParamList entries={queryEntries} />
      <p className={stub.muted}>
        Модальные экраны открываются query-параметрами, а не маршрутами: <code>request</code>,{' '}
        <code>proposal</code>, <code>modal=…</code>.
      </p>
    </section>
  );
}

function ParamList({ entries }: { entries: [string, string][] }) {
  if (entries.length === 0) return <p className={stub.muted}>нет</p>;
  return (
    <dl className={stub.params}>
      {entries.map(([key, value], index) => (
        <Fragment key={`${key}-${index}`}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
