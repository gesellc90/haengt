import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { zeigerApi } from '../api/zeiger.js';
import { verbindungenApi } from '../api/verbindungen.js';
import { useToast } from '../contexts/ToastContext.js';
import Spinner from '../components/Spinner.js';
import SectionTitle from '../components/SectionTitle.js';
import type { ZeigerRow, VerbindungRow } from '../types/api.js';

// ---------------------------------------------------------------------------
// Styles (konsistent mit DrinksPage / VerbindungenPage)
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
  padding: '8px 20px',
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
  minHeight: 44,
  padding: '8px 16px',
  borderRadius: 'var(--r-2)',
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--tinte-3)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

// ---------------------------------------------------------------------------
// Formular: Neuen Zeiger anlegen
// ---------------------------------------------------------------------------

function CreateZeigerForm({
  verbindungen,
  onCreated,
}: {
  verbindungen: VerbindungRow[];
  onCreated(z: ZeigerRow): void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [titel, setTitel] = useState('');
  const [art, setArt] = useState<'veranstaltung' | 'besuch'>('veranstaltung');
  const [verbindungId, setVerbindungId] = useState<string>('');
  const [bbr, setBbr] = useState('');
  const [gaeste, setGaeste] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    try {
      const z = await zeigerApi.create({
        titel: titel.trim(),
        art,
        verbindung_id: verbindungId ? Number(verbindungId) : null,
        anzahl_bundesbrueder: bbr !== '' ? Number(bbr) : undefined,
        anzahl_gaeste: gaeste !== '' ? Number(gaeste) : undefined,
      });
      onCreated(z);
      setTitel('');
      setArt('veranstaltung');
      setVerbindungId('');
      setBbr('');
      setGaeste('');
      setOpen(false);
      showToast(`Zeiger „${z.titel}" geöffnet.`, 'success');
    } catch {
      showToast('Zeiger konnte nicht angelegt werden.', 'error');
    } finally {
      setIsPending(false);
    }
  }

  if (!open) {
    return (
      <button style={btnPrimary} onClick={() => setOpen(true)}>
        + Zeiger öffnen
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 16,
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-2)',
        background: 'var(--bg-2)',
      }}
    >
      {/* Titel + Art */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
        <div>
          <label style={labelStyle}>Titel *</label>
          <input
            style={inputStyle}
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="z. B. Besuch Saxonia"
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Art</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={art}
            onChange={(e) => setArt(e.target.value as 'veranstaltung' | 'besuch')}
          >
            <option value="veranstaltung">Veranstaltung</option>
            <option value="besuch">Couleurbesuch</option>
          </select>
        </div>
      </div>

      {/* Verbindungs-Schnellauswahl (nur bei Besuch sinnvoll, aber immer anzeigen) */}
      <div>
        <label style={labelStyle}>Verbindung (optional)</label>
        <select
          style={{ ...inputStyle, cursor: 'pointer' }}
          value={verbindungId}
          onChange={(e) => setVerbindungId(e.target.value)}
        >
          <option value="">— keine —</option>
          {verbindungen.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.zirkel ? ` (${v.zirkel})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Teilnehmerzahlen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Bundesbrüder</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={bbr}
            onChange={(e) => setBbr(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label style={labelStyle}>Gäste</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={gaeste}
            onChange={(e) => setGaeste(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

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
// Einzelne Zeiger-Karte
// ---------------------------------------------------------------------------

function ZeigerCard({
  zeiger,
  verbindungen,
}: {
  zeiger: ZeigerRow;
  verbindungen: VerbindungRow[];
}) {
  const navigate = useNavigate();
  const verbindung = verbindungen.find((v) => v.id === zeiger.verbindung_id);
  const offen = zeiger.status === 'offen';

  return (
    <button
      onClick={() => void navigate(`/zeiger/${zeiger.id}`)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '14px 16px',
        borderRadius: 'var(--r-2)',
        border: `1px solid ${offen ? 'var(--korps-rot)' : 'var(--line)'}`,
        background: 'var(--bg-card)',
        boxShadow: offen ? 'var(--sh-1)' : 'none',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'box-shadow 150ms',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--tinte)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {zeiger.titel}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 999,
            background: offen ? 'var(--korps-rot)' : 'var(--line)',
            color: offen ? 'var(--kreide)' : 'var(--tinte-3)',
            flexShrink: 0,
          }}
        >
          {offen ? 'Offen' : 'Geschlossen'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--tinte-3)' }}>
          {zeiger.art === 'besuch' ? 'Couleurbesuch' : 'Veranstaltung'}
          {verbindung ? ` · ${verbindung.name}` : ''}
        </span>
        {(zeiger.anzahl_bundesbrueder !== null || zeiger.anzahl_gaeste !== null) && (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--tinte-3)' }}>
            {zeiger.anzahl_bundesbrueder !== null ? `${zeiger.anzahl_bundesbrueder} BBr.` : ''}
            {zeiger.anzahl_bundesbrueder !== null && zeiger.anzahl_gaeste !== null ? ' · ' : ''}
            {zeiger.anzahl_gaeste !== null ? `${zeiger.anzahl_gaeste} Gäste` : ''}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--tinte-4)' }}>
          {new Date(zeiger.opened_at).toLocaleDateString('de-DE')}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------

export default function ZeigerPage() {
  const { showToast } = useToast();
  const [zeiger, setZeiger] = useState<ZeigerRow[]>([]);
  const [verbindungen, setVerbindungen] = useState<VerbindungRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    Promise.all([zeigerApi.getAll(showClosed ? undefined : 'offen'), verbindungenApi.getAll(false)])
      .then(([z, v]) => {
        setZeiger(z);
        setVerbindungen(v);
      })
      .catch(() => showToast('Zeiger konnten nicht geladen werden.', 'error'))
      .finally(() => setIsLoading(false));
  }, [showClosed, showToast]);

  function handleCreated(z: ZeigerRow) {
    setZeiger((prev) => [z, ...prev]);
  }

  const offene = zeiger.filter((z) => z.status === 'offen');
  const geschlossene = zeiger.filter((z) => z.status === 'geschlossen');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Anlegen */}
      <CreateZeigerForm verbindungen={verbindungen} onCreated={handleCreated} />

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {/* Offene Zeiger */}
          <section aria-labelledby="offene-heading">
            <SectionTitle>
              <span id="offene-heading">Offene Zeiger</span>
            </SectionTitle>
            {offene.length === 0 ? (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: 'var(--tinte-4)',
                }}
              >
                Keine offenen Zeiger.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {offene.map((z) => (
                  <ZeigerCard key={z.id} zeiger={z} verbindungen={verbindungen} />
                ))}
              </div>
            )}
          </section>

          {/* Geschlossene Zeiger */}
          <section aria-labelledby="geschlossene-heading">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <SectionTitle>
                <span id="geschlossene-heading">Geschlossene Zeiger</span>
              </SectionTitle>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--tinte-3)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showClosed}
                  onChange={(e) => {
                    setIsLoading(true);
                    setShowClosed(e.target.checked);
                  }}
                />
                Anzeigen
              </label>
            </div>
            {showClosed && geschlossene.length === 0 && (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: 'var(--tinte-4)',
                }}
              >
                Keine geschlossenen Zeiger.
              </p>
            )}
            {showClosed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {geschlossene.map((z) => (
                  <ZeigerCard key={z.id} zeiger={z} verbindungen={verbindungen} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
