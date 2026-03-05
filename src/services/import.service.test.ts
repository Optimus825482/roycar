import { describe, it, expect } from "vitest";
import {
  autoMapColumns,
  parseCSVRaw,
  parseCSV,
} from "./import.service";

describe("import.service", () => {
  describe("autoMapColumns", () => {
    it("maps known Turkish headers to system fields", () => {
      const headers = ["Ad Soyad", "E-posta", "Telefon"];
      const mapping = autoMapColumns(headers);
      expect(mapping["Ad Soyad"]).toBe("fullName");
      expect(mapping["E-posta"]).toBe("email");
      expect(mapping["Telefon"]).toBe("phone");
    });

    it("maps English headers", () => {
      const headers = ["Full Name", "Email", "Phone"];
      const mapping = autoMapColumns(headers);
      expect(mapping["Full Name"]).toBe("fullName");
      expect(mapping["Email"]).toBe("email");
      expect(mapping["Phone"]).toBe("phone");
    });

    it("returns empty object for unknown headers", () => {
      const headers = ["Column1", "Column2", "Foo Bar"];
      const mapping = autoMapColumns(headers);
      expect(Object.keys(mapping)).toHaveLength(0);
    });

    it("normalizes separators (dash, underscore) for matching", () => {
      const headers = ["ad_soyad", "e-posta"];
      const mapping = autoMapColumns(headers);
      expect(mapping["ad_soyad"]).toBe("fullName");
      expect(mapping["e-posta"]).toBe("email");
    });
  });

  describe("parseCSVRaw", () => {
    it("returns 2D array of strings", () => {
      const csv = "a,b,c\n1,2,3\nx,y,z";
      const rows = parseCSVRaw(csv);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBe(3);
      expect(rows[0]).toEqual(["a", "b", "c"]);
      expect(rows[1]).toEqual(["1", "2", "3"]);
      expect(rows[2]).toEqual(["x", "y", "z"]);
    });

    it("handles empty content", () => {
      const rows = parseCSVRaw("");
      expect(rows).toEqual([]);
    });
  });

  describe("parseCSV", () => {
    it("detects header row and returns keyed rows", () => {
      const csv = "Ad Soyad,E-posta\nAli,ali@test.com\nVeli,veli@test.com";
      const result = parseCSV(csv);
      expect(result.headers).toContain("Ad Soyad");
      expect(result.headers).toContain("E-posta");
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]["Ad Soyad"]).toBe("Ali");
      expect(result.rows[0]["E-posta"]).toBe("ali@test.com");
    });
  });
});
