export function sanitizeName(value) {
 const cleaned = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿÑñ\s]/g, '');
 return cleaned.toLowerCase().replace(/(^|\s)\p{L}/gu, c => c.toUpperCase());
}

export function sanitizeDigits(value) {
 return value.replace(/[^0-9]/g, '');
}

// Placa colombiana: se fuerza a mayúsculas, se descartan tildes, Ñ, espacios
// y caracteres especiales, y se limita a 6 caracteres. Debe coincidir con
// plateError() de backend/src/utils/text.js.
export function sanitizePlate(value) {
 return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

const PLATE_FORMAT = { CARRO: /^[A-Z]{3}[0-9]{3}$/, MOTO: /^[A-Z]{3}[0-9]{2}[A-Z]$/ };
export function plateError(placa, tipoVehiculo) {
 if (!placa) return 'La placa es obligatoria (escríbala o use la cámara).';
 if (placa.length !== 6) return 'La placa debe tener exactamente 6 caracteres.';
 if (PLATE_FORMAT[tipoVehiculo] && !PLATE_FORMAT[tipoVehiculo].test(placa))
  return tipoVehiculo === 'MOTO' ? 'Placa de moto: 3 letras, 2 números y 1 letra (ej. ABC12D).' : 'Placa de carro: 3 letras y 3 números (ej. ABC123).';
 return null;
}
