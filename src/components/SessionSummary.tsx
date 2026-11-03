import { Link } from 'react-router-dom';

export type SessionMiss = {
  id: string;
  primary: string;
  secondary?: string;
};

type Props = {
  ui: 'en' | 'ru';
  title: string;
  /** Cards the learner actually checked this session. */
  answered: number;
  correct: number;
  misses: SessionMiss[];
  emptyMessage: string;
  footnote?: string;
  onAgain: () => void;
};

export function SessionSummary({
  ui,
  title,
  answered,
  correct,
  misses,
  emptyMessage,
  footnote,
  onAgain,
}: Props) {
  const hasWork = answered > 0;

  return (
    <div className="learn-screen">
      <section className="panel empty-state session-summary">
        <h2>{title}</h2>
        {!hasWork ? (
          <p className="muted">{emptyMessage}</p>
        ) : (
          <>
            <p className="session-score">
              {ui === 'ru'
                ? `${correct} из ${answered} верно`
                : `${correct} of ${answered} correct`}
            </p>
            {misses.length > 0 ? (
              <div className="session-misses">
                <div className="example-label">
                  {ui === 'ru' ? 'Ошибки — стоит повторить' : 'Misses — worth reviewing'}
                </div>
                <ul className="session-miss-list">
                  {misses.map((m) => (
                    <li key={m.id}>
                      <span className="session-miss-primary">{m.primary}</span>
                      {m.secondary ? (
                        <span className="session-miss-secondary">{m.secondary}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="muted">
                {ui === 'ru'
                  ? 'Без ошибок в этой сессии.'
                  : 'No misses in this session.'}
              </p>
            )}
          </>
        )}
        {footnote ? <p className="muted">{footnote}</p> : null}
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-primary" to="/">
            {ui === 'ru' ? 'На главную' : 'Home'}
          </Link>
          <button type="button" className="btn btn-secondary" onClick={onAgain}>
            {ui === 'ru' ? 'Ещё сессия' : 'Another session'}
          </button>
        </div>
      </section>
    </div>
  );
}
