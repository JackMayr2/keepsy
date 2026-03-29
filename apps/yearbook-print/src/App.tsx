import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { PhoneSignIn } from './components/PhoneSignIn';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';
import type { YearbookCompilationDoc } from './types';
import { listPrintStudioYearbooks, loadArchiveBundle } from './services/data';

type Phase = 'loading' | 'config' | 'auth' | 'list';

export function App() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<
    Array<{ yearbookId: string; name: string; compilation: YearbookCompilationDoc }>
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setPhase('config');
      return;
    }
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setPhase(u ? 'list' : 'auth');
    });
    return unsub;
  }, []);

  const refreshList = useCallback(async (uid: string) => {
    setMsg(null);
    try {
      const rows = await listPrintStudioYearbooks(uid);
      setItems(rows);
      if (rows.length === 0) {
        setMsg({
          kind: 'info',
          text: 'No compiled yearbooks yet. Finish review and compilation in the Keepsy app first.',
        });
      }
    } catch (e) {
      setMsg({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not load yearbooks',
      });
    }
  }, []);

  useEffect(() => {
    if (user) void refreshList(user.uid);
  }, [user, refreshList]);

  const selected = items.find((x) => x.yearbookId === selectedId) ?? null;

  const downloadPdf = async () => {
    if (!selected) return;
    setPdfBusy(true);
    setMsg(null);
    try {
      const bundle = await loadArchiveBundle(selected.yearbookId, selected.compilation);
      if (!bundle) {
        setMsg({ kind: 'error', text: 'Could not load archive data for this yearbook.' });
        return;
      }
      const { buildPrintPdf } = await import('./pdf/buildPrintPdf');
      const bytes = await buildPrintPdf(bundle);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selected.name.replace(/[^\w\d-]+/g, '_')}_print.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg({
        kind: 'error',
        text: e instanceof Error ? e.message : 'PDF build failed (images may be blocked by CORS).',
      });
    } finally {
      setPdfBusy(false);
    }
  };

  if (phase === 'loading') {
    return (
      <div className="app-frame">
        <div className="loading-screen">Loading…</div>
      </div>
    );
  }

  if (phase === 'config') {
    return (
      <div className="app-frame">
        <header className="app-header">
          <div className="app-header__inner">
            <div className="app-brand">
              <p className="app-brand__kicker">Keepsy</p>
              <h1 className="app-brand__title">Print studio</h1>
            </div>
          </div>
        </header>
        <main className="app-main">
          <div className="panel config-screen">
            <h1>Configure Firebase</h1>
            <p>
              Copy <code>.env.example</code> to <code>.env</code> inside{' '}
              <code>apps/yearbook-print</code> and set <code>VITE_FIREBASE_*</code> to the same values
              as <code>EXPO_PUBLIC_FIREBASE_*</code> in the main app. Restart <code>npm run dev</code>.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-brand">
            <p className="app-brand__kicker">Keepsy</p>
            <h1 className="app-brand__title">Yearbook print studio</h1>
            <p className="app-brand__tag">
              Sign in with your Keepsy phone number, pick a compiled yearbook, download a print PDF from
              the archived snapshot.
            </p>
          </div>
          {user ? (
            <div className="user-bar">
              <p className="user-bar__text">
                Signed in as <strong>{user.phoneNumber ?? user.uid}</strong>
              </p>
              <button type="button" className="btn btn--secondary" onClick={() => signOut(getFirebaseAuth())}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="app-main">
        {!user ? (
          <PhoneSignIn onSignedIn={() => setPhase('list')} />
        ) : (
          <>
            {msg ? (
              <div
                className={`msg-banner ${msg.kind === 'error' ? 'msg-banner--error' : 'msg-banner--info'}`}
              >
                {msg.text}
              </div>
            ) : null}

            <section className="panel">
              <h2 className="panel__title">Your yearbooks</h2>
              <p className="panel__meta">Creator or admin · must have a compilation document in Firestore</p>
              {items.length === 0 ? (
                <p className="panel__meta" style={{ marginBottom: 0 }}>
                  Nothing to show yet.
                </p>
              ) : (
                <ul className="yb-list">
                  {items.map((row) => (
                    <li key={row.yearbookId} className="yb-list__item">
                      <button
                        type="button"
                        className={`yb-tile ${selectedId === row.yearbookId ? 'yb-tile--selected' : ''}`}
                        onClick={() => setSelectedId(row.yearbookId)}
                      >
                        <span className="yb-tile__name">{row.name}</span>
                        <span className="yb-tile__sub">
                          Phase {row.compilation.phase} · {row.compilation.pagePlan.length} planned pages
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {selected ? (
              <section className="panel">
                <h2 className="panel__title">{selected.name}</h2>
                <p className="panel__meta">
                  Compilation <code>{selected.compilation.id}</code> · {selected.compilation.phase}
                </p>
                {selected.compilation.editorNotes ? (
                  <div className="editor-notes">
                    <strong>Editor notes</strong>
                    <div>{selected.compilation.editorNotes}</div>
                  </div>
                ) : null}
                <button type="button" className="btn btn--primary" disabled={pdfBusy} onClick={downloadPdf}>
                  {pdfBusy ? 'Building PDF…' : 'Download print PDF'}
                </button>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
