import { CalendarDays, LayoutDashboard, LogOut, Settings, Users, Wallet } from 'lucide-react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../lib/auth.jsx';
import './admin.css';

const SECCIONES = [
  { a: '/admin', texto: 'Hoy', Icono: LayoutDashboard, fin: true },
  { a: '/admin/agenda', texto: 'Agenda', Icono: CalendarDays },
  { a: '/admin/clientes', texto: 'Clientes', Icono: Users },
  { a: '/admin/finanzas', texto: 'Finanzas', Icono: Wallet },
  { a: '/admin/ajustes', texto: 'Ajustes', Icono: Settings },
];

export default function Layout() {
  const { usuario, verificando, salir } = useAuth();
  const ubicacion = useLocation();

  if (verificando) return null;
  if (!usuario) return <Navigate to="/admin/entrar" replace state={{ desde: ubicacion.pathname }} />;

  return (
    <div className="admin">
      <aside className="admin__lateral">
        <Link to="/admin" className="admin__marca">
          <span>Maligno's Barber</span>
        </Link>
        <nav className="admin__nav" aria-label="Panel">
          {SECCIONES.map(({ a, texto, Icono, fin }) => (
            <NavLink key={a} to={a} end={fin}>
              <Icono aria-hidden="true" />
              {texto}
            </NavLink>
          ))}
        </nav>
        <div className="admin__usuario">
          <span>{usuario.nombre}</span>
          <button type="button" className="icono-btn" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut />
          </button>
        </div>
      </aside>
      <div>
        <div className="admin__movil">
          <Link to="/admin" className="admin__marca">
            <span>Maligno's Barber</span>
          </Link>
          <button type="button" className="icono-btn" onClick={salir} aria-label="Cerrar sesión">
            <LogOut />
          </button>
        </div>
        <main className="admin__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
