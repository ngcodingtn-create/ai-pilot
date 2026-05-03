const TUNISIA_COUNTRY_CODE = "216";
const TUNISIA_LOCAL_LENGTH = 8;

export type NormalizedWhatsappNumber = {
  waId: string;
  e164: string;
  display: string;
  nationalNumber: string;
};

function formatTunisiaNationalNumber(nationalNumber: string) {
  return `${nationalNumber.slice(0, 2)} ${nationalNumber.slice(2, 5)} ${nationalNumber.slice(5)}`;
}

export function normalizeTunisiaWhatsappNumber(
  value: string,
): NormalizedWhatsappNumber | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  let digits = raw.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === TUNISIA_LOCAL_LENGTH + 1 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  let nationalNumber = "";

  if (digits.length === TUNISIA_LOCAL_LENGTH) {
    nationalNumber = digits;
  } else if (
    digits.length === TUNISIA_COUNTRY_CODE.length + TUNISIA_LOCAL_LENGTH &&
    digits.startsWith(TUNISIA_COUNTRY_CODE)
  ) {
    nationalNumber = digits.slice(TUNISIA_COUNTRY_CODE.length);
  } else {
    return null;
  }

  if (!/^\d{8}$/.test(nationalNumber)) {
    return null;
  }

  const waId = `${TUNISIA_COUNTRY_CODE}${nationalNumber}`;

  return {
    waId,
    e164: `+${waId}`,
    display: `+${TUNISIA_COUNTRY_CODE} ${formatTunisiaNationalNumber(nationalNumber)}`,
    nationalNumber,
  };
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const normalized = normalizeTunisiaWhatsappNumber(phone);
  if (!normalized) {
    return null;
  }

  return `https://wa.me/${normalized.waId}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppAppUrl(phone: string, message: string) {
  const normalized = normalizeTunisiaWhatsappNumber(phone);
  if (!normalized) {
    return null;
  }

  return `whatsapp://send?phone=${normalized.waId}&text=${encodeURIComponent(message)}`;
}
