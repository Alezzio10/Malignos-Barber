import NumberFlow from '@number-flow/react';
import { ArrowRight, ArrowUpRight, Plus, RotateCcw } from 'lucide-react';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Tijeras } from '../../components/Dibujos.jsx';
import { FotoRevelada } from '../../components/FotoRevelada.jsx';
import { Revelar } from '../../components/Revelar.jsx';
import { TarjetaFidelidad } from '../../components/TarjetaFidelidad.jsx';
import { publico } from '../../lib/api.js';
import { DIAS, cuandoRelativo, dinero, duracion, fechaLocal, hora, partesDia } from '../../lib/formato.js';
import { useCarga } from '../../lib/useCarga.js';
import { BarraSitio } from './BarraSitio.jsx';
import './publico.css';

const EASE = [0.22, 1, 0.36, 1];

export default function Inicio() {
  const servicios = useCarga(() => publico('/servicios'), []);
  const agenda = useCarga(() => publico('/agenda-resumen'), []);

  return (
    <div className="sitio">
      {/* La cinta y la barra quedan juntas y fijas arriba al hacer scroll. */}
      <div className="cabecera-fija">
        <Cinta servicios={servicios.datos} />
        <BarraSitio />
      </div>
      <main>
        <Portada agenda={agenda} />
        <Servicios estado={servicios} />
        <Precision totalServicios={servicios.datos?.length} />
        <ComoFunciona />
        <Fidelidad />
        <Horario agenda={agenda} />
        <Cierre />
      </main>
      <PieSitio />
    </div>
  );
}

/* ---------- Cinta: los servicios pasando como en un letrero ---------- */

const FRASES_CINTA = ['Agenda en línea', 'El décimo corte va por la casa', 'Un solo barbero, de principio a fin'];

function Cinta({ servicios }) {
  const frases = [...(servicios ?? []).map((s) => s.nombre), ...FRASES_CINTA];
  // Se repite el grupo para que la cinta nunca muestre un hueco al dar la vuelta.
  const grupo = [...frases, ...frases];
  return (
    <div className="cinta" aria-hidden="true">
      <div className="cinta__pista">
        {[0, 1].map((n) => (
          <ul key={n} className="cinta__grupo">
            {grupo.map((f, i) => (
              <li key={i}>
                {f}
                <Tijeras className="cinta__marca" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/* ---------- Portada ---------- */

function Portada({ agenda }) {
  const reducir = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yFoto = useTransform(scrollYProgress, [0, 1], ['0%', reducir ? '0%' : '16%']);
  const escalaFoto = useTransform(scrollYProgress, [0, 1], [1, reducir ? 1 : 1.1]);
  const proxima = agenda.datos?.proxima_hora;

  // Cada renglón del titular sube desde detrás de una máscara.
  const linea = (i) => ({
    initial: reducir ? { opacity: 0 } : { transform: 'translateY(110%)' },
    animate: reducir ? { opacity: 1 } : { transform: 'translateY(0%)' },
    transition: { duration: 0.95, delay: 0.15 + i * 0.11, ease: EASE },
  });
  const subir = (i) => ({
    initial: reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateY(16px)' },
    animate: { opacity: 1, transform: 'translateY(0px)' },
    transition: { duration: 0.7, delay: 0.7 + i * 0.08, ease: EASE },
  });

  return (
    <section ref={ref} className="portada" aria-labelledby="portada-titulo">
      <div className="portada__texto">
        <motion.p className="etiqueta" {...subir(0)}>
          Barbería · desde 2023
        </motion.p>
        <h1 id="portada-titulo" className="portada__titulo">
          <span className="solo-lector">Maligno's Barber: precisión en cada corte</span>
          <span aria-hidden="true">
            {['Precisión', 'en cada'].map((t, i) => (
              <span key={t} className="linea">
                <motion.span className="linea__texto" {...linea(i)}>
                  {t}
                </motion.span>
              </span>
            ))}
            <span className="linea">
              <motion.span className="linea__texto portada__firma" {...linea(2)}>
                corte.
              </motion.span>
            </span>
          </span>
        </h1>
        <motion.p className="portada__frase" {...subir(1)}>
          Cortes, fades y barba por cita, con un solo barbero que te atiende de principio a fin. Eliges servicio, día
          y hora en un minuto.
        </motion.p>
        <motion.div className="portada__acciones" {...subir(2)}>
          <Link to="/agendar" className="btn btn--oro">
            Agendar cita <ArrowRight className="btn__flecha" />
          </Link>
          <a href="#servicios" className="btn btn--borde">
            Ver servicios
          </a>
        </motion.div>
        <motion.p className="portada__vivo" aria-live="polite" {...subir(3)}>
          {agenda.cargando && !agenda.datos ? (
            <span className="esqueleto" style={{ display: 'inline-block', width: 220, height: 18 }} />
          ) : proxima ? (
            <>
              <span className="punto-vivo" aria-hidden="true" />
              Próxima hora libre: <strong>{cuandoRelativo(proxima)}</strong> a las{' '}
              <strong className="num">{hora(proxima)}</strong>
            </>
          ) : agenda.datos ? (
            'Pronto abriremos la agenda en línea.'
          ) : null}
        </motion.p>
      </div>

      <div className="portada__visual">
        <motion.div
          className="portada__foto"
          initial={reducir ? { opacity: 0 } : { clipPath: 'inset(100% 0% 0% 0%)' }}
          animate={reducir ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0%)' }}
          transition={{ duration: 1.25, delay: 0.25, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.img
            src="/imagenes/maquinas-roja-dorada.jpg"
            alt="Máquinas de cortar pelo roja y dorada, tijeras y navaja sobre la mesa del barbero"
            width="1800"
            height="1200"
            fetchPriority="high"
            style={{ y: yFoto, scale: escalaFoto }}
          />
        </motion.div>
        <Sello />
      </div>
    </section>
  );
}

// El logo dentro de un sello de texto que gira despacio.
function Sello() {
  const reducir = useReducedMotion();
  return (
    <motion.div
      className="sello"
      aria-hidden="true"
      initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.6) rotate(-40deg)' }}
      animate={{ opacity: 1, transform: 'scale(1) rotate(0deg)' }}
      transition={{ duration: 0.9, delay: 1.1, ease: EASE }}
    >
      <svg viewBox="0 0 200 200" className="sello__texto">
        <defs>
          <path id="sello-circulo" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0" />
        </defs>
        <text>
          <textPath href="#sello-circulo" textLength="500">
            Maligno's Barber · Desde 2023 · Agenda en línea ·
          </textPath>
        </text>
      </svg>
      <img src="/logo.png" alt="" width="120" height="120" className="sello__logo logo-luz" />
    </motion.div>
  );
}

/* ---------- Servicios: una herramienta por servicio ---------- */

const FOTOS = {
  maquina: { src: '/imagenes/maquina-dorada-pomadas.jpg', ancho: 1800, alto: 2250 },
  tijeras: { src: '/imagenes/tijeras-pomada.jpg', ancho: 1800, alto: 1200, posicion: '40% 50%' },
  navajaPeine: { src: '/imagenes/navaja-peine-dorados.jpg', ancho: 1800, alto: 1200 },
  brocha: { src: '/imagenes/brocha-afeitar.jpg', ancho: 1800, alto: 2700 },
  peine: { src: '/imagenes/peine-negro.jpg', ancho: 1800, alto: 1200 },
  navaja: { src: '/imagenes/navaja-madera.jpg', ancho: 1800, alto: 2700 },
  guias: { src: '/imagenes/maquinas-fila-madera.jpg', ancho: 1800, alto: 2696 },
  maquinaDorada: { src: '/imagenes/maquinas-mesa-dorada.jpg', ancho: 1800, alto: 1200, posicion: '35% 50%' },
};

// La foto se elige por el nombre del servicio; si no coincide ninguna, se reparten en orden.
const REGLAS_FOTO = [
  [/corte.*barba|barba.*corte/i, 'navajaPeine'],
  [/buzz|rapad/i, 'guias'],
  [/low fade|fade bajo/i, 'maquinaDorada'],
  [/fade|degrad|máquina|maquina/i, 'maquina'],
  [/barba|afeit/i, 'brocha'],
  [/niñ|infantil/i, 'peine'],
  [/diseñ|raya|línea|linea/i, 'navaja'],
  [/corte|tijera/i, 'tijeras'],
];
const ORDEN_FOTOS = Object.keys(FOTOS);

function fotoDeServicio(nombre, i) {
  const regla = REGLAS_FOTO.find(([patron]) => patron.test(nombre));
  return FOTOS[regla ? regla[1] : ORDEN_FOTOS[i % ORDEN_FOTOS.length]];
}

// Cards que completan la última fila cuando los servicios no llenan todas las columnas.
const RELLENOS = [
  {
    clave: 'agendar',
    to: '/agendar',
    foto: { src: '/imagenes/barberia-interior.jpg', ancho: 1800, alto: 1196 },
    etiqueta: 'Agenda',
    titulo: '¿No sabes cuál?',
    texto: 'Agenda tu cita y lo decidimos juntos en la silla.',
    accion: 'Agendar',
  },
  {
    clave: 'fidelidad',
    href: '#fidelidad',
    foto: { src: '/imagenes/maquinas-roja-dorada.jpg', ancho: 1800, alto: 1200 },
    etiqueta: 'Fidelidad',
    titulo: 'La décima es gratis',
    texto: 'Cada corte suma un sello; al completar diez, el siguiente va por la casa.',
    accion: 'Ver tarjeta',
  },
  {
    clave: 'horario',
    href: '#horario',
    foto: { src: '/imagenes/kit-naranja.jpg', ancho: 1800, alto: 1440 },
    etiqueta: 'Horario',
    titulo: 'Cuándo venir',
    texto: 'Revisa los días y horas en que atendemos.',
    accion: 'Ver horario',
  },
];

// Cuántas columnas muestra la cuadrícula ahora mismo (cambia con el ancho de la pantalla).
// `listo` avisa cuándo la cuadrícula ya existe (aparece cuando llegan los servicios).
function useColumnas(ref, listo) {
  const [columnas, setColumnas] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // El CSS publica cuántas columnas de cards hay en --columnas (los carriles del lema no cuentan).
    const medir = () => setColumnas(Number(getComputedStyle(el).getPropertyValue('--columnas')) || 1);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref, listo]);
  return columnas;
}

function Servicios({ estado }) {
  const lista = estado.datos ?? [];
  const grid = useRef(null);
  const columnas = useColumnas(grid, lista.length > 0);
  const sobran = lista.length % columnas;
  const rellenos = sobran ? RELLENOS.slice(0, columnas - sobran) : [];
  return (
    <section id="servicios" className="claro dientes servicios" aria-labelledby="servicios-titulo">
      <div className="cabeza-seccion">
        <div>
          <Revelar como="p" className="etiqueta">
            Servicios y precios
          </Revelar>
          <Revelar como="h2" id="servicios-titulo" className="titulo-seccion" retraso={0.06}>
            Elige tu corte
          </Revelar>
        </div>
        <Revelar como="p" className="cabeza-seccion__texto" retraso={0.12}>
          Ves cuánto dura y cuánto cuesta antes de reservar. Toca cualquiera para agendarlo directo.
        </Revelar>
      </div>

      {estado.cargando && !estado.datos ? (
        <div className="servicios__grid" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="esqueleto" style={{ aspectRatio: '4 / 5', background: 'var(--crema-2)' }} />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="texto-seccion">Estamos preparando la lista de servicios. Vuelve pronto.</p>
      ) : (
        <ul ref={grid} className="servicios__grid">
          {lista.map((s, i) => {
            const foto = fotoDeServicio(s.nombre, i);
            return (
              <li key={s.id} className="tarjeta">
                <Tarjeta
                  como={Link}
                  to={`/agendar?servicio=${s.id}`}
                  foto={foto}
                  retraso={(i % 3) * 0.1}
                  numero={i + 1}
                  titulo={s.nombre}
                  precio={dinero(s.precio)}
                >
                  {s.descripcion && <p className="tarjeta__texto">{s.descripcion}</p>}
                  <span className="tarjeta__pie">
                    <span className="num">{duracion(s.duracion_min)}</span>
                    <span className="tarjeta__accion">
                      Agendar <ArrowUpRight />
                    </span>
                  </span>
                </Tarjeta>
              </li>
            );
          })}
          {rellenos.map((r, i) => (
            <li key={r.clave} className="tarjeta tarjeta--relleno">
              <Tarjeta
                como={r.to ? Link : 'a'}
                {...(r.to ? { to: r.to } : { href: r.href })}
                foto={r.foto}
                retraso={((lista.length + i) % 3) * 0.1}
                etiqueta={r.etiqueta}
                titulo={r.titulo}
              >
                <p className="tarjeta__texto">{r.texto}</p>
                <span className="tarjeta__pie">
                  <span />
                  <span className="tarjeta__accion">
                    {r.accion} <ArrowUpRight />
                  </span>
                </span>
              </Tarjeta>
            </li>
          ))}
          <Lemas columnas={columnas} filas={Math.ceil((lista.length + rellenos.length) / columnas)} />
        </ul>
      )}
    </section>
  );
}

// "Elige tu corte" en vertical dentro de cada carril entre columnas (2.ª, 4.ª… columna de la
// cuadrícula), ocupando todas las filas. Como se colocan a mano, las cards se acomodan alrededor.
function Lemas({ columnas, filas }) {
  return Array.from({ length: columnas - 1 }, (_, i) => (
    <li
      key={i}
      className="servicios__lema"
      aria-hidden="true"
      style={{ gridColumn: (i + 1) * 2, gridRow: `1 / span ${filas}`, animationDelay: `${-0.9 - i * 1.7}s` }}
    >
      Elige tu corte
    </li>
  ));
}

// Card de foto con nombre (y precio) siempre a la vista. Con ratón, al pasar por encima sube
// y despliega debajo un panel con el detalle; en pantallas táctiles el panel queda abierto.
function Tarjeta({ como: Elemento = 'div', foto, retraso, numero, etiqueta, titulo, precio, children, ...resto }) {
  return (
    <Elemento className="tarjeta__marco" {...resto}>
      <span className="aro">
        <FotoRevelada {...foto} retraso={retraso} className="tarjeta__foto">
          {precio && <span className="servicio__precio num">{precio}</span>}
          <span className="tarjeta__rotulo">
            <span className="tarjeta__num num">{etiqueta ?? String(numero).padStart(2, '0')}</span>
            <h3 className="tarjeta__titulo">{titulo}</h3>
          </span>
        </FotoRevelada>
      </span>
      <div className="tarjeta__panel">
        <div className="tarjeta__recorte">
          <div className="tarjeta__detalle">{children}</div>
        </div>
      </div>
    </Elemento>
  );
}

/* ---------- Precisión: la máquina en grande y el texto que corre con el scroll ---------- */

function Precision({ totalServicios }) {
  const ref = useRef(null);
  const reducir = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], reducir ? ['0%', '0%'] : ['8%', '-42%']);
  const yFoto = useTransform(scrollYProgress, [0, 1], reducir ? ['0%', '0%'] : ['-7%', '7%']);

  return (
    <section ref={ref} className="precision" aria-labelledby="precision-titulo">
      <motion.img
        className="precision__foto"
        src="/imagenes/maquina-azul.jpg"
        alt=""
        width="1800"
        height="1201"
        loading="lazy"
        decoding="async"
        style={{ y: yFoto }}
      />
      <h2 id="precision-titulo" className="solo-lector">
        Precisión en cada herramienta
      </h2>
      <motion.p className="precision__gigante" aria-hidden="true" style={{ x }}>
        Precisión · Filo · Detalle · Oficio
      </motion.p>
      <div className="precision__contenido">
        <Revelar como="p" className="precision__texto">
          Máquina, tijera y navaja: las herramientas de siempre, en manos de un barbero que te conoce por tu nombre.
        </Revelar>
        <ul className="marcadores">
          <Cifra valor={2023} etiqueta="el año en que abrimos la silla" />
          <Cifra valor={10} etiqueta="visitas y el siguiente corte es gratis" />
          <Cifra valor={totalServicios ?? 0} etiqueta="servicios para elegir" />
          <Cifra valor={1} etiqueta="barbero, de principio a fin" />
        </ul>
      </div>
    </section>
  );
}

// Número que rueda hasta su valor la primera vez que se ve.
function Cifra({ valor, etiqueta }) {
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  return (
    <li ref={ref} className="marcador">
      <span className="marcador__valor num">
        <NumberFlow value={visible ? valor : 0} format={{ useGrouping: false }} />
      </span>
      <span className="marcador__etiqueta">{etiqueta}</span>
    </li>
  );
}

/* ---------- Cómo funciona ---------- */

const PASOS = [
  {
    foto: { src: '/imagenes/kit-naranja.jpg', ancho: 1800, alto: 1440 },
    titulo: 'Elige tu servicio',
    texto: 'Corte, barba o los dos. Ves cuánto dura y cuánto cuesta antes de reservar, sin sorpresas en la silla.',
  },
  {
    foto: { src: '/imagenes/kit-completo.jpg', ancho: 1800, alto: 867, posicion: '50% 50%' },
    titulo: 'Toma tu hora',
    texto:
      'Solo aparecen las horas que de verdad están libres. Si quieres, te enviamos un recordatorio por email un día antes y dos horas antes.',
  },
  {
    foto: { src: '/imagenes/silla-barbero.jpg', ancho: 1800, alto: 2250 },
    titulo: 'Llega y siéntate',
    texto: 'Tu cita ya está apartada a tu nombre. Cada visita suma un sello en tu tarjeta de fidelidad.',
  },
];

function ComoFunciona() {
  return (
    <section id="como-funciona" className="seccion pasos" aria-labelledby="como-titulo">
      <div className="cabeza-seccion">
        <div>
          <Revelar como="p" className="etiqueta">
            Cómo funciona
          </Revelar>
          <Revelar como="h2" id="como-titulo" className="titulo-seccion" retraso={0.06}>
            Así de simple
          </Revelar>
        </div>
        <Revelar como="p" className="cabeza-seccion__texto" retraso={0.12}>
          Tres pasos y tu silla queda apartada. Solo te pedimos tu nombre y tu teléfono.
        </Revelar>
      </div>
      <ol className="pasos__lista">
        {PASOS.map((p, i) => (
          <li key={p.titulo} className="paso-flota">
            <span className="aro paso-flota__aro">
              <FotoRevelada {...p.foto} retraso={i * 0.12} className="paso-flota__foto" />
            </span>
            <Revelar className="paso-flota__texto" retraso={0.2 + i * 0.12} distancia={16}>
              <span className="paso-flota__num num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </Revelar>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Fidelidad ---------- */

function Fidelidad() {
  const [visitas, setVisitas] = useState(7);
  const completa = visitas >= 10;

  return (
    <section id="fidelidad" className="claro dientes fidelidad" aria-labelledby="fidelidad-titulo">
      <div className="fidelidad__texto">
        <Revelar como="p" className="etiqueta">
          Tarjeta de fidelidad
        </Revelar>
        <Revelar como="h2" id="fidelidad-titulo" className="titulo-seccion" retraso={0.06}>
          La décima va por la casa
        </Revelar>
        <Revelar como="p" className="texto-seccion" retraso={0.12}>
          Cada corte suma un sello. Al completar diez, el siguiente corte es gratis. No hay tarjeta que cargar ni
          puntos que canjear: tu número de teléfono es tu tarjeta.
        </Revelar>
        <Revelar className="fidelidad__control" retraso={0.18}>
          <button
            type="button"
            className="btn btn--tinta"
            onClick={() => setVisitas((v) => (v >= 10 ? 0 : v + 1))}
          >
            {completa ? <RotateCcw /> : <Plus />}
            {completa ? 'Empezar otra tarjeta' : 'Sumar una visita'}
          </button>
          <span className="fidelidad__nota" aria-live="polite">
            {completa ? 'Listo: tu próximo corte no se cobra.' : 'Pruébalo: así se llena tu tarjeta.'}
          </span>
        </Revelar>
      </div>
      <Revelar className="fidelidad__tarjeta" distancia={40} retraso={0.1}>
        <div className="fidelidad__giro">
          <TarjetaFidelidad key={visitas === 0 ? 'nueva' : 'usada'} acumuladas={visitas} tamano="grande" titular="Tu tarjeta" />
        </div>
      </Revelar>
    </section>
  );
}

/* ---------- Horario ---------- */

const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

function Horario({ agenda }) {
  const horarios = agenda.datos?.horarios ?? [];
  const hoy = partesDia(fechaLocal()).diaSemana;
  const porDia = (d) =>
    horarios
      .filter((h) => h.dia_semana === d)
      .map((h) => `${h.hora_inicio}–${h.hora_fin}`)
      .join(' y ');

  return (
    <section id="horario" className="seccion horario-sec" aria-labelledby="horario-titulo">
      <div className="horario-sec__info">
        <Revelar como="p" className="etiqueta">
          Cuándo venir
        </Revelar>
        <Revelar como="h2" id="horario-titulo" className="titulo-seccion" retraso={0.06}>
          Horario
        </Revelar>
        {agenda.datos && horarios.length === 0 ? (
          <p className="texto-seccion">Muy pronto publicaremos el horario de atención.</p>
        ) : (
          <dl className="horario">
            {ORDEN_SEMANA.map((d, i) => {
              const texto = porDia(d);
              return (
                <Revelar
                  key={d}
                  className={`horario__fila ${d === hoy ? 'horario__fila--hoy' : ''}`}
                  retraso={i * 0.05}
                  distancia={12}
                >
                  <dt>
                    {DIAS[d]}
                    {d === hoy && <span className="solo-lector"> (hoy)</span>}
                  </dt>
                  <dd className="num">{agenda.datos ? texto || 'Cerrado' : '…'}</dd>
                </Revelar>
              );
            })}
          </dl>
        )}
        <Revelar className="practico__cita" retraso={0.1}>
          <h3>¿Ya tienes cita?</h3>
          <p>
            Al agendar te damos un enlace propio. Desde ahí puedes revisar tu cita, guardarla en tu calendario o
            cancelarla si no puedes venir.
          </p>
          <p>Atendemos solo con cita para que nadie espere de pie.</p>
        </Revelar>
      </div>
      <FotoRevelada
        src="/imagenes/barberia-interior.jpg"
        alt="Interior de la barbería con sillas de cuero y luz cálida"
        ancho={1800}
        alto={1196}
        className="horario-sec__foto"
      />
    </section>
  );
}

/* ---------- Cierre: la banda naranja ---------- */

function Cierre() {
  return (
    <section className="cierre dientes" aria-label="Agendar">
      <Revelar como="p" className="cierre__frase">
        Elige servicio, día y hora. La silla te espera.
      </Revelar>
      <Link to="/agendar" className="cierre__enlace">
        <span className="linea">
          <Revelar como="span" className="linea__texto" distancia={120}>
            Agenda
          </Revelar>
        </span>
        <span className="linea">
          <Revelar como="span" className="linea__texto" distancia={120} retraso={0.1}>
            tu cita <ArrowUpRight className="cierre__flecha" aria-hidden="true" />
          </Revelar>
        </span>
      </Link>
      <div className="cierre__esquinas">
        <span>Abierta desde el 8 de septiembre de 2023</span>
        <Link to="/admin">Acceso del barbero</Link>
      </div>
    </section>
  );
}

function PieSitio() {
  return (
    <footer className="pie-sitio">
      <p className="pie-sitio__marca" aria-hidden="true">
        Maligno's Barber
      </p>
      <div className="pie-sitio__fila">
        <p className="pie-sitio__legal">© {new Date().getFullYear()} Maligno's Barber</p>
        <nav className="pie-sitio__nav" aria-label="Pie de página">
          <a href="#servicios">Servicios</a>
          <a href="#horario">Horario</a>
          <Link to="/agendar">Agendar</Link>
        </nav>
      </div>
    </footer>
  );
}
