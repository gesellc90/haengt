import { useEffect, useState, type FormEvent } from 'react';
import { drinkCategoriesApi } from '../../api/drinkCategories.js';
import { ApiError } from '../../api/client.js';
import { useToast } from '../../contexts/ToastContext.js';
import Spinner from '../../components/Spinner.js';
import type { DrinkCategoryRow } from '../../types/api.js';

// ---------------------------------------------------------------------------
// Styles (angelehnt an die übrigen Admin-Seiten)
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
  justifyContent: 'center',
  minHeight: 36,
  minWidth: 36,
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

// ---------------------------------------------------------------------------
// Formular: Neue Kategorie anlegen
// ---------------------------------------------------------------------------

function CreateCategoryForm({ onCreated }: { onCreated(c: DrinkCategoryRow): void }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const c = await drinkCategoriesApi.create({ name: name.trim() });
      onCreated(c);
      setName('');
      setOpen(false);
      showToast(`Kategorie „${c.name}" wurde angelegt.`, 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Anlegen.');
    } finally {
      setIsPending(false);
    }
  }

  if (!open) {
    return (
      <button style={btnPrimary} onClick={() => setOpen(true)}>
        + Kategorie anlegen
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
      <div>
        <label style={labelStyle}>Name *</label>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Bier"
          required
          autoFocus
        />
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
// Tabellenzeile
// ---------------------------------------------------------------------------

function CategoryRow({
  category,
  index,
  count,
  onUpdated,
  onDeleted,
  onMove,
  busy,
}: {
  category: DrinkCategoryRow;
  index: number;
  count: number;
  onUpdated(c: DrinkCategoryRow): void;
  onDeleted(id: number): void;
  onMove(index: number, dir: -1 | 1): void;
  busy: boolean;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [isPending, setIsPending] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    try {
      const updated = await drinkCategoriesApi.update(category.id, { name: name.trim() });
      onUpdated(updated);
      setEditing(false);
      showToast('Kategorie gespeichert.', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen.', 'error');
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Kategorie „${category.name}" wirklich löschen?`)) return;
    setIsPending(true);
    try {
      await drinkCategoriesApi.remove(category.id);
      onDeleted(category.id);
      showToast(`Kategorie „${category.name}" gelöscht.`, 'info');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Löschen fehlgeschlagen.', 'error');
    } finally {
      setIsPending(false);
    }
  }

  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    color: 'var(--tinte)',
    borderBottom: '1px solid var(--line)',
    verticalAlign: 'middle',
  };

  return (
    <tr>
      <td style={{ ...cellStyle, width: 90, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            style={{ ...btnGhost, opacity: index === 0 ? 0.4 : 1 }}
            onClick={() => onMove(index, -1)}
            disabled={index === 0 || busy}
            aria-label="Nach oben"
            title="Nach oben"
          >
            ↑
          </button>
          <button
            style={{ ...btnGhost, opacity: index === count - 1 ? 0.4 : 1 }}
            onClick={() => onMove(index, 1)}
            disabled={index === count - 1 || busy}
            aria-label="Nach unten"
            title="Nach unten"
          >
            ↓
          </button>
        </div>
      </td>
      <td style={cellStyle}>
        {editing ? (
          <form onSubmit={(e) => void handleSave(e)} style={{ display: 'flex', gap: 6 }}>
            <input
              style={{ ...inputStyle, maxWidth: 260 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" style={btnPrimary} disabled={isPending}>
              {isPending ? '…' : 'OK'}
            </button>
            <button type="button" style={btnGhost} onClick={() => setEditing(false)}>
              ✕
            </button>
          </form>
        ) : (
          <span style={{ fontWeight: 600 }}>{category.name}</span>
        )}
      </td>
      <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
        {!editing && (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button style={btnGhost} onClick={() => setEditing(true)} disabled={isPending || busy}>
              Umbenennen
            </button>
            <button
              style={btnDanger}
              onClick={() => void handleDelete()}
              disabled={isPending || busy}
            >
              Löschen
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------

export default function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<DrinkCategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    drinkCategoriesApi
      .getAll()
      .then(setCategories)
      .catch(() => showToast('Kategorien konnten nicht geladen werden.', 'error'))
      .finally(() => setIsLoading(false));
  }, [showToast]);

  function handleCreated(c: DrinkCategoryRow) {
    setCategories((prev) => [...prev, c]);
  }

  function handleUpdated(c: DrinkCategoryRow) {
    setCategories((prev) => prev.map((x) => (x.id === c.id ? c : x)));
  }

  function handleDeleted(id: number) {
    setCategories((prev) => prev.filter((x) => x.id !== id));
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved!);

    // Optimistisch anzeigen, dann persistieren.
    const previous = categories;
    setCategories(reordered);
    setReordering(true);
    try {
      const saved = await drinkCategoriesApi.reorder(reordered.map((c) => c.id));
      setCategories(saved);
    } catch (err) {
      setCategories(previous);
      showToast(
        err instanceof ApiError ? err.message : 'Reihenfolge konnte nicht gespeichert werden.',
        'error',
      );
    } finally {
      setReordering(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <CreateCategoryForm onCreated={handleCreated} />

      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'var(--tinte-3)',
          margin: 0,
        }}
      >
        Die Reihenfolge bestimmt, in welcher Folge die Kategorien in der Buchungsansicht angezeigt
        werden. Kategorien mit zugeordneten Getränken lassen sich nicht löschen.
      </p>

      {isLoading ? (
        <Spinner />
      ) : categories.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--tinte-3)' }}>
          Keine Kategorien vorhanden.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Reihenfolge', 'Name', ''].map((h) => (
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
              {categories.map((c, i) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  index={i}
                  count={categories.length}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                  onMove={(idx, dir) => void handleMove(idx, dir)}
                  busy={reordering}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
