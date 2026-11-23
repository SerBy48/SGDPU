// Votación por posición entre las lecturas de varios fotogramas de la misma
// placa. Corrige errores aislados por reflejo o desenfoque.
//
// lecturas: resultados de decodificarOcr (uno por fotograma).
// Devuelve { placa, formatoValido, confianza, confianzaPorCaracter, votos, lecturaCruda }.
export function votar(lecturas) {
 const validas = lecturas.filter(l => l.formatoValido && l.placa.length === 6);
 if (!validas.length) {
  // Sin ninguna lectura con formato: se devuelve la más confiable, marcada inválida.
  const mejor = [...lecturas].sort((a, b) => b.confianza - a.confianza)[0];
  return mejor
   ? { ...mejor, formatoValido: false, votos: 0 }
   : { placa: '', formatoValido: false, confianza: 0, confianzaPorCaracter: [], lecturaCruda: '', votos: 0 };
 }
 let placa = '';
 const confianzaPorCaracter = [];
 for (let i = 0; i < 6; i++) {
  // Por carácter: más votos; en empate, mayor confianza sumada; luego el primero.
  const conteo = new Map();
  validas.forEach((l, k) => {
   const c = l.placa[i], p = l.confianzaPorCaracter[i] ?? l.confianza;
   const e = conteo.get(c) || { votos: 0, suma: 0, primero: k };
   e.votos++; e.suma += p;
   conteo.set(c, e);
  });
  const [c, e] = [...conteo].sort(([, a], [, b]) => b.votos - a.votos || b.suma - a.suma || a.primero - b.primero)[0];
  placa += c;
  confianzaPorCaracter.push(e.suma / e.votos);
 }
 const votos = validas.filter(l => l.placa === placa).length;
 const base = validas.find(l => l.placa === placa) || validas[0];
 return {
  placa,
  formatoValido: true,
  confianza: Math.min(...confianzaPorCaracter),
  confianzaPorCaracter,
  votos,
  lecturaCruda: base.lecturaCruda,
 };
}
