import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { AvisoError } from '../../components/Formulario.jsx';
import { admin, mensajeDeError } from '../../lib/api.js';
import { fechaLocal, partesDia, sumarDias } from '../../lib/formato.js';
import { useCarga } from '../../lib/useCarga.js';
import { ListaCitas } from './componentes/ListaCitas.jsx';
import { NuevaCita } from './componentes/NuevaCita.jsx';
import { RegistrarVisita } from './componentes/RegistrarVisita.jsx';
import '../publico/publico.css';

// Lunes de la semana de una fecha.
function lunesDe(iso) {
  const dia = partesDia(iso).diaSemana;
  return sumarDias(iso, dia === 0 ? -6 : 1 - dia);
}

export default function Agenda() {
  const hoy = fechaLocal();
  const [fecha, setFecha] = useState(hoy);
  const lunes = lunesDe(fecha);
  const domingo = sumarDias(lunes, 6);
  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

  const citas = useCarga(() => admin(`/citas?desde=${lunes}&hasta=${domingo}`), [lunes]);
  const [visita, setVisita] = useState({ abierto: false, cita: null });
  const [nuevaCita, setNuevaCita] = useState(false);

  const porDia = (d) => (citas.datos ?? []).filter((c) => fechaLocal(new Date(c.inicio)) === d);
  const delDia = porDia(fecha);
  const activas = (d) => porDia(d).filter((c) => ['pendiente', 'confirmada'].includes(c.estado)).length;
  const p = partesDia(fecha);

  return (
    <>
      <header className="cabecera">
        <div>
          <h1>Agenda</h1>
          <p>{p.larga}</p>
        </div>
        <div className="cabecera__acciones">
          <button type="button" className="btn btn--oro" onClick={() => setNuevaCita(true)}>
            <CalendarPlus /> Nueva cita
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button type="button" className="icono-btn" aria-label="Semana anterior" onClick={() => setFecha(sumarDias(fecha, -7))}>
          <ChevronLeft />
        </button>
        <button type="button" className="btn btn--suave btn--chico" onClick={() => setFecha(hoy)} disabled={fecha === hoy}>
          Hoy
        </button>
        <button type="button" className="icono-btn" aria-label="Semana siguiente" onClick={() => setFecha(sumarDias(fecha, 7))}>
          <ChevronRight />
        </button>
        <input
          type="date"
          className="input"
          style={{ width: 'auto', minHeight: 40 }}
          aria-label="Ir a una fecha"
          value={fecha}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
        />
      </div>

      <div className="dias" role="listbox" aria-label="Día" style={{ marginBottom: 20 }}>
        {semana.map((d) => {
          const pd = partesDia(d);
          const n = activas(d);
          return (
            <button key={d} type="button" role="option" aria-selected={d === fecha} className="dia" onClick={() => setFecha(d)}>
              <span className="dia__semana">{d === hoy ? 'Hoy' : pd.semana}</span>
              <span className="dia__numero num">{pd.dia}</span>
              <span className="dia__mes num">{citas.datos ? (n ? `${n} ${n === 1 ? 'cita' : 'citas'}` : 'Libre') : '…'}</span>
            </button>
          );
        })}
      </div>

      <section className="bloque" aria-label={`Citas del ${p.larga}`}>
        {citas.error ? (
          <div className="bloque__cuerpo" style={{ paddingTop: 20 }}>
            <AvisoError>{mensajeDeError(citas.error)}</AvisoError>
          </div>
        ) : !citas.datos ? (
          <div className="bloque__cuerpo pila" style={{ paddingTop: 20 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="esqueleto" style={{ height: 56 }} />
            ))}
          </div>
        ) : delDia.length === 0 ? (
          <div className="bloque__cuerpo" style={{ paddingTop: 20 }}>
            <div className="vacio" style={{ background: 'var(--surface-2)' }}>
              <p className="vacio__titulo">Sin citas este día</p>
              <p>Puedes agendar a alguien que te escribió o llamó con “Nueva cita”.</p>
            </div>
          </div>
        ) : (
          <ListaCitas citas={delDia} alAtender={(c) => setVisita({ abierto: true, cita: c })} alCambiar={citas.recargar} />
        )}
      </section>

      <RegistrarVisita
        abierto={visita.abierto}
        cita={visita.cita}
        alCerrar={() => setVisita({ abierto: false, cita: visita.cita })}
        alGuardar={citas.recargar}
      />
      <NuevaCita abierto={nuevaCita} alCerrar={() => setNuevaCita(false)} alGuardar={citas.recargar} fechaInicial={fecha} />
    </>
  );
}
