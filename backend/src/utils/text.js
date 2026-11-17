const ONLY_LETTERS = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ\s]+$/;
const ONLY_DIGITS = /^[0-9]+$/;

export function isAlphabeticName(value) {
  return ONLY_LETTERS.test(value);
}

export function isNumericCode(value) {
  return ONLY_DIGITS.test(value);
}

export function toTitleCase(value) {
  return value.toLowerCase().replace(/(^|\s)\p{L}/gu, c => c.toUpperCase());
}

// Placas colombianas: 6 caracteres, solo letras A-Z (sin tildes ni Ñ) y
// dígitos. Carro: 3 letras + 3 números (ABC123). Moto: 3 letras + 2 números
// + 1 letra (ABC12D).
const PLATE_FORMAT = { CARRO: /^[A-Z]{3}[0-9]{3}$/, MOTO: /^[A-Z]{3}[0-9]{2}[A-Z]$/ };

export function plateError(placa, tipoVehiculo) {
  if (!/^[A-Z0-9]{6}$/.test(placa)) return 'La placa debe tener exactamente 6 caracteres, solo letras (sin tildes) y números';
  if (PLATE_FORMAT[tipoVehiculo] && !PLATE_FORMAT[tipoVehiculo].test(placa))
    return tipoVehiculo === 'MOTO' ? 'Placa de moto inválida: debe ser 3 letras, 2 números y 1 letra (ej. ABC12D)' : 'Placa de carro inválida: debe ser 3 letras y 3 números (ej. ABC123)';
  return null;
}
