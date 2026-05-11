import { Routes, Route, Link } from 'react-router-dom';

function Home(): JSX.Element {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Willkommen</h2>
      <p className="text-slate-600">
        Dies ist der M1-Platzhalter. Login und Buchungen folgen ab M3/M5.
      </p>
    </section>
  );
}

function NotFound(): JSX.Element {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Seite nicht gefunden</h2>
      <Link to="/" className="text-blue-600 underline">
        Zurück zur Startseite
      </Link>
    </section>
  );
}

export default function App(): JSX.Element {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Hängt! – Jeder Strich zählt!</h1>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
