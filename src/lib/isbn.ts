// ISBN validation and normalization (spec §6.2). We store ISBN-13 digits only.

function isbn13CheckDigit(first12: string): number {
  const sum = [...first12].reduce((acc, digit, i) => acc + Number(digit) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

function isValidIsbn13(code: string): boolean {
  return /^97[89]\d{10}$/.test(code) && isbn13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

function isValidIsbn10(code: string): boolean {
  if (!/^\d{9}[\dX]$/.test(code)) return false;
  const sum = [...code].reduce((acc, char, i) => acc + (char === "X" ? 10 : Number(char)) * (10 - i), 0);
  return sum % 11 === 0;
}

// Returns the ISBN-13 for a valid ISBN-10 or ISBN-13 (hyphens and spaces allowed), or null.
export function normalizeIsbn(raw: string): string | null {
  const code = raw.replace(/[\s-]/g, "").toUpperCase();
  if (isValidIsbn13(code)) return code;
  if (isValidIsbn10(code)) {
    const first12 = `978${code.slice(0, 9)}`;
    return `${first12}${isbn13CheckDigit(first12)}`;
  }
  return null;
}

// True for EAN-13 barcodes that are books (978/979 prefix, valid checksum).
export function isBookBarcode(data: string): boolean {
  return isValidIsbn13(data);
}
