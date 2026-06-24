import { useEffect, useState, type FormEvent } from 'react';
import { verbindungenApi } from '../../api/verbindungen.js';
import { ApiError } from '../../api/client.js';
import { useToast } from '../../contexts/ToastContext.js';
import Spinner from '../../components/Spinner.js';
import type { VerbindungRow } from '../../types/api.js';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '8px 12px',
  borderRadius: 'var(--r-2)',
  border: '1px solid var(--line-2)',
  background: 'var(--bg)',
  color: 'var(--tinte)',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--tinte-3)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 5,
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  padding: '8px 16px',
  borderRadius: 'var(--r-2)',
  border: 'none',
  background: 'var(--korps-rot)',
  color: 'var(--kreide)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 36,
  padding: '4px 10px',
  borderRadius: 'var(--r-1)',
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--tinte-3)',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  ...btnGhost,
  border: '1px solid var(--korps-rot)',
  color: 'var(--korps-rot)',
};

const btnSuccess: React.CSSProperties = {
  ...btnGhost,
  border: '1px solid var(--erfolg)',
  color: 'var(--erfolg)',
};

// ---------------------------------------------------------------------------
// Formular: Neue Verbindung anlegen
// ---------------------------------------------------------------------------

function CreateVerbindungForm({ onCreated }: { onCreated(v: VerbindungRow): void }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState('');
  const [zirkel, setZirkel] = useState('');
  const [ort, setOrt] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const v = await verbindungenApi.create({
        name: name.trim(),
        zirkel: zirkel.trim() || null,
        ort: ort.trim() || null,
      });
      onCreated(v);
      setName('');
      setZirkel('');
      setOrt('');
      setOpen(false);
      showToast(`${v.name} wurde angelegt.`, 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Anlegen.');
    } finally {
      setIsPending(false);
    }
  }

  if (!open) {
    return (
      <button style={btnPrimary} onClick={() => setOpen(true)}>
        + Verbindung anlegen
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-2)',
        background: 'var(--bg-2)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Saxonia"
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Zirkel</label>
          <input
            style={inputStyle}
            value={zirkel}
            onChange={(e) => setZirkel(e.target.value)}
            placeholder="z. B. Sax."
          />
        </div>
        <div>
          <label style={labelStyle}>Ort</label>
          <input
            style={inputStyle}
            value={ort}
            onChange={(e) => setOrt(e.target.value)}
            placeholder="z. B. Musterstadt"
          />
        </div>
      </div>

      {error && (
        <p
          style={{
            color: 'var(--korps-rot)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={btnPrimary} disabled={isPending}>
          {isPending ? 'Speichern…' : 'Speichern'}
        </button>
        <button type="button" style={btnGhost} onClick={() => setOpen(false)}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tabellenzeile: Verbindung anzeigen + inline bearbeiten
// ---------------------------------------------------------------------------

function VerbindungRow({
  verbindung,
  onUpdated,
  onDeactivated,
}: {
  verbindung: VerbindungRow;
  onUpdated(v: VerbindungRow): void;
  onDeactivated(id: number): void;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState(verbindung.name);
  const [zirkel, setZirkel] = useState(verbindung.zirkel ?? '');
  const [ort, setOrt] = useState(verbindung.ort ?? '');

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    try {
      const updated = await verbindungenApi.update(verbindung.id, {
        name: name.trim(),
        zirkel: zirkel.trim() || null,
        ort: ort.trim() || null,
      });
      onUpdated(updated);
      setEditing(false);
      showToast('Verbindung gespeichert.', 'success');
    } catch {
      showToast('Speichern fehlgeschlagen.', 'error');
    } finally {
      setIsPending(false);
    }
  }

  async function handleToggleActive() {
    setIsPending(true);
    try {
      if (verbindung.active === 1) {
        await verbindungenApi.deactivate(verbindung.id);
        onDeactivated(verbindung.id);
        showToast(`${verbindung.name} deaktiviert.`, 'info');
      } else {
        const updated = await verbindungenApi.update(verbindung.id, { active: 1 });
        onUpdated(updated);
        showToast(`${verbindung.name} reaktiviert.`, 'success');
      }
    } catch {
      showToast('Aktion fehlgeschlagen.', 'error');
    } finally {
      setIsPending(false);
    }
  }

  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    color: verbindung.active === 0 ? 'var(--tinte-3)' : 'var(--tinte)',
    borderBottom: '1px solid var(--line)',
    verticalAlign: 'middle',
  };

  if (editing) {
    return (
      <tr>
        <td colSpan={4} style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
          <form
            onSubmit={(e) => void handleSave(e)}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr auto',
              gap: 8,
              alignItems: 'end',
            }}
          >
            <div>
              <label style={labelStyle}>Name *</label>
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Zirkel</label>
              <input
                style={inputStyle}
                value={zirkel}
                onChange={(e) => setZirkel(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Ort</label>
              <input style={inputStyle} value={ort} onChange={(e) => setOrt(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="submit" style={btnPrimary} disabled={isPending}>
                {isPending ? '…' : 'OK'}
              </button>
              <button type="button" style={btnGhost} onClick={() => setEditing(false)}>
                ✕
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={cellStyle}>
        {verbindung.name}
        {verbindung.active === 0 && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--tinte-3)',
              background: 'var(--line)',
              borderRadius: 4,
              padding: '1px 5px',
              textTransform: 'uppercase',
            }}
          >
            Inaktiv
          </span>
        )}
      </td>
      <td style={cellStyle}>{verbindung.zirkel ?? '–'}</td>
      <td style={cellStyle}>{verbindung.ort ?? '–'}</td>
      <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button style={btnGhost} onClick={() => setEditing(true)} disabled={isPending}>
            Bearbeiten
          </button>
          <button
            style={verbindung.active === 1 ? btnDanger : btnSuccess}
            onClick={() => void handleToggleActive()}
            disabled={isPending}
          >
            {verbindung.active === 1 ? 'Deaktivieren' : 'Reaktivieren'}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------

export default function VerbindungenPage() {
  const { showToast } = useToast();
  const [verbindungen, setVerbindungen] = useState<VerbindungRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    verbindungenApi
      .getAll(showInactive)
      .then(setVerbindungen)
      .catch(() => showToast('Verbindungen konnten nicht geladen werden.', 'error'))
      .finally(() => setIsLoading(false));
  }, [showInactive, showToast]);

  function handleCreated(v: VerbindungRow) {
    setVerbindungen((prev) => [...prev, v].sort((a, b) => a.name.localeCompare(b.name, 'de')));
  }

  function handleUpdated(v: VerbindungRow) {
    setVerbindungen((prev) => prev.map((x) => (x.id === v.id ? v : x)));
  }

  function handleDeactivated(id: number) {
    if (showInactive) {
      setVerbindungen((prev) => prev.map((x) => (x.id === id ? { ...x, active: 0 as const } : x)));
    } else {
      setVerbindungen((prev) => prev.filter((x) => x.id !== id));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <CreateVerbindungForm onCreated={handleCreated} />
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--tinte-2)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Inaktive anzeigen
        </label>
      </div>

      {isLoading ? (
        <Spinner />
      ) : verbindungen.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--tinte-3)' }}>
          Keine Verbindungen vorhanden.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Zirkel', 'Ort', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 12px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--tinte-3)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textAlign: h === '' ? 'right' : 'left',
                      borderBottom: '2px solid var(--korps-rot)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {verbindungen.map((v) => (
                <VerbindungRow
                  key={v.id}
                  verbindung={v}
                  onUpdated={handleUpdated}
                  onDeactivated={handleDeactivated}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
