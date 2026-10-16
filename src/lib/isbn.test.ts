import { isBookBarcode, normalizeIsbn } from "@/lib/isbn";

describe("normalizeIsbn", () => {
  it("accepts a valid ISBN-13 with hyphens and spaces", () => {
    expect(normalizeIsbn("978-1-63557-563-7")).toBe("9781635575637");
    expect(normalizeIsbn(" 978 1635575637 ")).toBe("9781635575637");
  });

  it("converts a valid ISBN-10 to ISBN-13", () => {
    expect(normalizeIsbn("0-441-47812-3")).toBe("9780441478125");
  });

  it("accepts an ISBN-10 whose check digit is X", () => {
    expect(normalizeIsbn("0-8044-2957-X")).toBe("9780804429573");
    expect(normalizeIsbn("080442957x")).toBe("9780804429573");
  });

  it("rejects a bad checksum", () => {
    expect(normalizeIsbn("9781635575638")).toBeNull();
    expect(normalizeIsbn("0441478124")).toBeNull();
  });

  it("rejects the wrong length or stray characters", () => {
    expect(normalizeIsbn("")).toBeNull();
    expect(normalizeIsbn("12345")).toBeNull();
    expect(normalizeIsbn("97816355756370")).toBeNull();
    expect(normalizeIsbn("X441478123")).toBeNull();
  });

  it("rejects a valid EAN-13 that is not a book", () => {
    expect(normalizeIsbn("4006381333931")).toBeNull();
  });
});

describe("isBookBarcode", () => {
  it("accepts EAN-13 codes starting with 978 or 979", () => {
    expect(isBookBarcode("9781635575637")).toBe(true);
    expect(isBookBarcode("9791032305690")).toBe(true);
  });

  it("rejects other products and malformed codes", () => {
    expect(isBookBarcode("4006381333931")).toBe(false);
    expect(isBookBarcode("9781635575638")).toBe(false);
    expect(isBookBarcode("978163557563")).toBe(false);
  });
});
