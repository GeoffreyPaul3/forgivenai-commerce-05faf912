export const ALLOWED_CITIES = [
  "Lilongwe",
  "Blantyre",
  "Mzuzu",
  "Zomba"
];

export interface DeliveryValidationResult {
  available: boolean;
  message?: string;
}

export function validateCity(city: string): DeliveryValidationResult {
  if (!city) {
    return { available: false, message: "City is required." };
  }
  
  const isSupported = ALLOWED_CITIES.some(
    c => c.toLowerCase() === city.trim().toLowerCase()
  );

  if (!isSupported) {
    return {
      available: false,
      message: "Smart Deliveries is currently available only in Lilongwe, Blantyre, Mzuzu and Zomba."
    };
  }

  return { available: true };
}

export function validateReceiverName(name: string): boolean {
  if (!name) return false;
  return name.trim().length >= 2;
}

export function validateReceiverPhone(phone: string): boolean {
  if (!phone) return false;
  // Must match +265XXXXXXXXX
  const regex = /^\+265\d{9}$/;
  return regex.test(phone.trim());
}

export function validateReceiverLocation(city: string): boolean {
  return validateCity(city).available;
}
