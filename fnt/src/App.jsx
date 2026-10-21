import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Agendar from './paginas/publico/Agendar.jsx';
import Inicio from './paginas/publico/Inicio.jsx';
import MiCita from './paginas/publico/MiCita.jsx';

// El panel del barbero se carga aparte: los clientes nunca descargan ese código.
const Layout = lazy(() => import('./paginas/admin/Layout.jsx'));
const Entrar = lazy(() => import('./paginas/admin/Entrar.jsx'));
const Hoy = lazy(() => import('./paginas/admin/Hoy.jsx'));
const Agenda = lazy(() => import('./paginas/admin/Agenda.jsx'));
const Clientes = lazy(() => import('./paginas/admin/Clientes.jsx'));
const ClienteDetalle = lazy(() => import('./paginas/admin/ClienteDetalle.jsx'));
const Finanzas = lazy(() => import('./paginas/admin/Finanzas.jsx'));
const Ajustes = lazy(() => import('./paginas/admin/Ajustes.jsx'));

function NoEncontrada() {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: 48, fontWeight: 400 }}>
          Página no encontrada
        </h1>
        <a href="/" className="btn btn--oro">
          Volver al inicio
        </a>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/cita/:id" element={<MiCita />} />
          <Route path="/admin/entrar" element={<Entrar />} />
          <Route path="/admin" element={<Layout />}>
            <Route index element={<Hoy />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/:id" element={<ClienteDetalle />} />
            <Route path="finanzas" element={<Finanzas />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
