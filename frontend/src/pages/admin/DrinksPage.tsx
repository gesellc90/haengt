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
      <button
        onClick={() => setOpen(true)}
        className="min-h-touch rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        + Getränk anlegen
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30"
    >
      <h3 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">Neues Getränk</h3>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Wasser"
            className="min-h-touch w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div className="w-36">
          <label className="mb-1 block text-xs font-medium text-slate-600">Preis (€)</label>
          <input
            type="text"
            required
            inputMode="decimal"
            value={priceEuro}
            onChange={(e) => setPriceEuro(e.target.value)}
            placeholder="1,00"
            className="min-h-touch w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-touch flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending && <Spinner size="h-3 w-3" />}
          Anlegen
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-touch rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
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
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-2 flex items-center gap-2">
      <input
        type="text"
        inputMode="decimal"
        required
        placeholder="Neuer Preis in € (z. B. 1,50)"
        value={priceEuro}
        onChange={(e) => setPriceEuro(e.target.value)}
        className="min-h-touch flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
      <button
        type="submit"
        disabled={isPending}
        className="min-h-touch rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? <Spinner size="h-3 w-3" /> : 'Speichern'}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="min-h-touch rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
      >
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
    <div className="space-y-4">
      <CreateDrinkForm onCreated={(d) => setDrinks((prev) => [d, ...prev])} />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="h-10 w-10" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-slate-700">
                {['Name', 'Status', 'Aktionen'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {drinks.map((d) => (
                <>
                  <tr key={d.id} className={d.is_available === 0 ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                      {d.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.is_available ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {d.is_available ? 'Verfügbar' : 'Deaktiviert'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => setPriceFormId(priceFormId === d.id ? null : d.id)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
                        >
                          Preis ändern
                        </button>
                        <button
                          onClick={() => void toggleAvailable(d)}
                          className={`rounded-md border px-2 py-1 text-xs font-medium ${d.is_available ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400' : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400'}`}
                        >
                          {d.is_available ? 'Deaktivieren' : 'Aktivieren'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {priceFormId === d.id && (
                    <tr key={`${d.id}-price`}>
                      <td colSpan={3} className="px-4 pb-3">
                        <AddPriceForm drinkId={d.id} onClose={() => setPriceFormId(null)} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {drinks.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">Keine Getränke vorhanden.</p>
          )}
        </div>
      )}
    </div>
  );
}
