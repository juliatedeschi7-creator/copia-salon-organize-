/**
 * Generates a short 6-character alphanumeric code for WhatsApp confirmation
 * using a cryptographically secure random number generator.
 */
export function generateWhatsAppCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const values = new Uint8Array(6);
  crypto.getRandomValues(values);
  return Array.from(values).map((v) => chars[v % chars.length]).join("");
}

/**
 * Normalizes a Brazilian phone number and builds a WhatsApp deep link
 * with a prefilled message containing the confirmation code and appointment details.
 */
export function buildWhatsAppLink(
  phone: string,
  code: string,
  serviceName: string,
  date: string,
  time: string
): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  const message = `Olá! Meu código de confirmação é *${code}*. Gostaria de confirmar meu agendamento de ${serviceName} para ${date} às ${time}.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
