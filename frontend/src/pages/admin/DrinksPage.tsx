import { useEffect, useState, type FormEvent } from 'react';
import { drinksApi } from '../../api/drinks.js';
import { ApiError } from '../../api/client.js';
import { useToast } from '../../contexts/ToastContext.js';
import Spinner from '../../components/Spinner.js';
import type { DrinkRow } from '../../types/api.js';

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

// ---------------------------------------------------------------------------
// Gemeinsame Styles
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
  outline: 'none',
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
  gap: 6,
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

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 44,
  padding: '8px 16px',
  borderRadius: 'var(--r-2)',
  border: '1px solid var(--line-2)',
  background: 'transparent',
  color: 'var(--tinte-2)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 500,
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
// Neues-Getränk-Formular
// ---------------------------------------------------------------------------

interface CreateDrinkFormProps {
  onCreated(drink: DrinkRow): void;
}

function CreateDrinkForm({ onCreated }: CreateDrinkFormProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState('');
  const [priceEuro, setPriceEuro] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const price_cents = Math.round(parseFloat(priceEuro.replace(',', '.')) * 100);
    if (isNaN(price_cents) || price_cents <= 0) {
      setError('Bitte gib einen gültigen Preis ein.');
      return;
    }
    setIsPending(true);
    try {
      const drink = await drinksApi.create({ name: name.trim(), price_cents });
      onCreated(drink);
      setName('');
      setPriceEuro('');
      setOpen(false);
      showToast(`${drink.name} wurde angelegt.`, 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Anlegen.');
    } finally {
      setIsPending(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={btnPrimary}>
        + Getränk anlegen
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{
        borderRadius: 'var(--r-3)',
        border: '1px solid var(--line)',
        background: 'var(--bg-card)',
        padding: 20,
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: 'var(--tinte)',
          margin: '0 0 14px',
          paddingBottom: 8,
          borderBottom: '2px solid var(--korps-rot)',
          display: 'inline-block',
        }}
      >
        Neues Getränk
      </h3>

      {error && (
        <p
          role="alert"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--fehler)',
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Wasser"
            style={inputStyle}
          />
        </div>
        <div style={{ width: 140 }}>
          <label style={labelStyle}>Preis (€)</label>
          <input
            type="text"
            required
            inputMode="decimal"
            value={priceEuro}
            onChange={(e) => setPriceEuro(e.target.value)}
            placeholder="1,00"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={isPending}
          style={{ ...btnPrimary, opacity: isPending ? 0.6 : 1 }}
        >
          {isPending && <Spinner size="h-3 w-3" />}
          Anlegen
        </button>
        <button type="button" onClick={() => setOpen(false)} style={btnSecondary}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Preis-hinzufügen-Formular (inline)
// ---------------------------------------------------------------------------

interface AddPriceFormProps {
  drinkId: number;
  onClose(): void;
}

function AddPriceForm({ drinkId, onClose }: AddPriceFormProps) {
  const { showToast } = useToast();
  const [priceEuro, setPriceEuro] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const price_cents = Math.round(parseFloat(priceEuro.replace(',', '.')) * 100);
    if (isNaN(price_cents) || price_cents <= 0) return;
    setIsPending(true);
    try {
      await drinksApi.addPrice(drinkId, { price_cents });
      showToast(`Preis wurde auf ${formatCents(price_cents)} gesetzt.`, 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Fehler.', 'error');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <input
        type="text"
        inputMode="decimal"
        required
        placeholder="Neuer Preis in € (z. B. 1,50)"
        value={priceEuro}
        onChange={(e) => setPriceEuro(e.target.value)}
        style={{ ...inputStyle, flex: 1 }}
      />
      <button
        type="submit"
        disabled={isPending}
        style={{ ...btnPrimary, opacity: isPending ? 0.5 : 1 }}
      >
        {isPending ? <Spinner size="h-3 w-3" /> : 'Speichern'}
      </button>
      <button type="button" onClick={onClose} style={btnSecondary}>
        ✕
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export default function DrinksPage() {
  const { showToast } = useToast();
  const [drinks, setDrinks] = useState<DrinkRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [priceFormId, setPriceFormId] = useState<number | null>(null);

  useEffect(() => {
    drinksApi
      .getAll()
      .then(setDrinks)
      .catch(() => showToast('Getränke konnten nicht geladen werden.', 'error'))
      .finally(() => setIsLoading(false));
  }, [showToast]);

  async function toggleAvailable(drink: DrinkRow) {
    const newAvail: 0 | 1 = drink.is_available === 1 ? 0 : 1;
    try {
      const updated = await drinksApi.update(drink.id, { is_available: newAvail });
      setDrinks((prev) => prev.map((d) => (d.id === drink.id ? updated : d)));
      showToast(`${drink.name} wurde ${newAvail === 1 ? 'aktiviert' : 'deaktiviert'}.`, 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Fehler.', 'error');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CreateDrinkForm onCreated={(d) => setDrinks((prev) => [d, ...prev])} />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="h-10 w-10" />
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            borderRadius: 'var(--r-3)',
            border: '1px solid var(--line)',
            background: 'var(--bg-card)',
            boxShadow: 'var(--sh-1)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Name', 'Status', 'Aktionen'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--tinte-3)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drinks.map((d, i) => (
                <>
                  <tr
                    key={d.id}
                    style={{
                      opacity: d.is_available === 0 ? 0.45 : 1,
                      borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 16px',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        color: 'var(--tinte)',
                      }}
                    >
                      {d.name}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 'var(--r-pill)',
                          border: `1px solid ${d.is_available ? 'var(--erfolg)' : 'var(--line-2)'}`,
                          background: d.is_available ? 'var(--erfolg-bg)' : 'var(--bg-2)',
                          color: d.is_available ? 'var(--erfolg)' : 'var(--tinte-4)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {d.is_available ? 'Verfügbar' : 'Deaktiviert'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <button
                          onClick={() => setPriceFormId(priceFormId === d.id ? null : d.id)}
                          style={btnGhost}
                        >
                          Preis ändern
                        </button>
                        <button
                          onClick={() => void toggleAvailable(d)}
                          style={d.is_available ? btnDanger : btnSuccess}
                        >
                          {d.is_available ? 'Deaktivieren' : 'Aktivieren'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {priceFormId === d.id && (
                    <tr key={`${d.id}-price`}>
                      <td
                        colSpan={3}
                        style={{ padding: '4px 16px 14px', borderTop: '1px solid var(--line)' }}
                      >
                        <AddPriceForm drinkId={d.id} onClose={() => setPriceFormId(null)} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {drinks.length === 0 && (
            <p
              style={{
                padding: '40px 0',
                textAlign: 'center',
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--tinte-4)',
              }}
            >
              Keine Getränke vorhanden.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
