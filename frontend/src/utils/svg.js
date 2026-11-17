import DOMPurify from 'dompurify';

// Segunda capa de defensa: el servidor ya sanea cada plano al subirlo
// (backend/src/utils/svgPlano.js), pero el navegador lo vuelve a sanear con
// la misma lista blanca antes de inyectarlo en la página, por si en la base
// de datos quedó un plano cargado por otra vía.
const CONFIG={
 USE_PROFILES:{svg:true,svgFilters:true},
 ADD_TAGS:['style'],
 FORBID_TAGS:['image','a','use','animate','animateMotion','animateTransform','set','foreignObject','script','iframe','audio','video','canvas'],
 FORBID_ATTR:['href','xlink:href'],
};
export const sanitizeSvg=svg=>DOMPurify.sanitize(svg||'',CONFIG);

export const MAX_SVG_KB=1024;

// Plantilla mínima que puede descargar el administrador como punto de partida.
export const PLANTILLA_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 64">
  <!-- Elementos SIN data-codigo: fondo, vías, rótulos (solo decorativos). -->
  <rect x="0" y="0" width="120" height="64" fill="none" stroke="#9e9e9e" stroke-width=".4"/>
  <rect x="0" y="28" width="120" height="8" fill="#e0e0e0"/>
  <text x="60" y="33.5" font-size="3.5" text-anchor="middle" fill="#757575">VÍA DE ACCESO</text>

  <!-- Cupos: cada uno con data-codigo ÚNICO y data-tipo carro | moto | discapacitado. -->
  <rect data-codigo="C-01" data-tipo="carro" x="4" y="4" width="10" height="20"/>
  <rect data-codigo="C-02" data-tipo="carro" x="16" y="4" width="10" height="20"/>
  <rect data-codigo="C-03" data-tipo="discapacitado" x="28" y="4" width="14" height="20"/>
  <polygon data-codigo="C-04" data-tipo="carro" points="46,24 50,4 60,4 56,24"/>
  <rect data-codigo="M-01" data-tipo="moto" x="4" y="40" width="5" height="12"/>
  <rect data-codigo="M-02" data-tipo="moto" x="11" y="40" width="5" height="12"/>
  <rect data-codigo="M-03" data-tipo="moto" x="18" y="40" width="5" height="12"/>
</svg>
`;
