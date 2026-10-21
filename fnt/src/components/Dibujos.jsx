// Tijeras dibujadas en una sola línea gráfica (puntas redondas), tomadas de las del logo.

const trazo = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function Tijeras(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g {...trazo} strokeWidth={2}>
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M8.1 15.9 19 4M15.9 15.9 5 4" />
      </g>
    </svg>
  );
}
