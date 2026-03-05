import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  exportToPDF,
  printEvaluation,
  exportListToPDF,
  exportToExcel,
  exportListToExcel,
  type EvalExportData,
  type ListExportItem,
} from "./export-utils";

const { writeFileMock } = vi.hoisted(() => ({ writeFileMock: vi.fn() }));
vi.mock("xlsx", () => {
  const utils = {
    book_new: vi.fn(() => ({ _sheets: [] })),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  };
  const mod = {
    utils,
    writeFile: (...args: unknown[]) => writeFileMock(...args),
  };
  return { __esModule: true, default: mod, ...mod };
});

const minimalEvalData: EvalExportData = {
  candidateName: "Test Aday",
  email: "test@example.com",
  phone: "+90 555 123 4567",
  department: "İnsan Kaynakları",
  applicationNo: "MR-2025-ABC123",
  submittedAt: "2025-03-01T10:00:00Z",
  status: "new",
  overallScore: 75,
  evaluatedAt: null,
  report: {
    overallScore: 75,
    summary: "Özet metni",
    strengths: ["Güç 1"],
    weaknesses: ["Zayıf 1"],
    fitAnalysis: "Uyum analizi",
    recommendation: "shortlist",
    recommendationReason: "Gerekçe",
  },
};

describe("exportToPDF", () => {
  let documentWrite: ReturnType<typeof vi.fn>;
  let documentClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    documentWrite = vi.fn();
    documentClose = vi.fn();
    vi.stubGlobal(
      "open",
      vi.fn(() => ({
        document: { write: documentWrite, close: documentClose },
        onload: null,
      }))
    );
  });

  it("writes HTML containing candidate name and escaped content", async () => {
    await exportToPDF(minimalEvalData);
    expect(documentWrite).toHaveBeenCalledTimes(1);
    const html = documentWrite.mock.calls[0][0] as string;
    expect(html).toContain("Test Aday");
    expect(html).toContain("test@example.com");
    expect(html).toContain("F&B Kariyer Değerlendirme Sistemi");
    expect(html).toContain("75");
    expect(html).toContain("Kısa Liste");
    // XSS: angle brackets should be escaped
    expect(html).not.toMatch(/<script>/i);
  });

  it("escapes HTML in candidate name", async () => {
    await exportToPDF({
      ...minimalEvalData,
      candidateName: "Test <script>alert(1)</script>",
    });
    const html = documentWrite.mock.calls[0][0] as string;
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

describe("printEvaluation", () => {
  let documentWrite: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    documentWrite = vi.fn();
    vi.stubGlobal(
      "open",
      vi.fn(() => ({
        document: { write: documentWrite, close: vi.fn() },
        onload: null,
      }))
    );
  });

  it("writes HTML with candidate data", () => {
    printEvaluation(minimalEvalData);
    expect(documentWrite).toHaveBeenCalledWith(
      expect.stringContaining(minimalEvalData.candidateName)
    );
  });
});

describe("exportListToPDF", () => {
  let documentWrite: ReturnType<typeof vi.fn>;

  const listItems: ListExportItem[] = [
    {
      fullName: "Aday 1",
      email: "a1@test.com",
      phone: "555111",
      department: "IK",
      positionTitle: "Pozisyon",
      overallScore: 80,
      recommendation: "shortlist",
      finalDecision: null,
      manualNote: null,
    },
  ];

  beforeEach(() => {
    documentWrite = vi.fn();
    vi.stubGlobal(
      "open",
      vi.fn(() => ({
        document: { write: documentWrite, close: vi.fn() },
        onload: null,
      }))
    );
  });

  it("writes list HTML with header and row count", () => {
    exportListToPDF(listItems);
    const html = documentWrite.mock.calls[0][0] as string;
    expect(html).toContain("Aday 1");
    expect(html).toContain("1 aday");
    expect(html).toContain("80");
  });
});

describe("exportToExcel", () => {
  beforeEach(() => {
    writeFileMock.mockClear();
  });

  it("calls xlsx writeFile with expected filename pattern", async () => {
    await exportToExcel({
      candidateName: "Ali Veli",
      email: "a@b.com",
      phone: "555",
      department: "IT",
      applicationNo: "MR-2025-001",
      submittedAt: "2025-01-01",
      status: "new",
      overallScore: 70,
      evaluatedAt: null,
      report: null,
    });
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [, fileName] = writeFileMock.mock.calls[0];
    expect(fileName).toMatch(/Degerlendirme_Ali_Veli_MR-2025-001\.xlsx/);
  });
});

describe("exportListToExcel", () => {
  beforeEach(() => {
    writeFileMock.mockClear();
  });

  it("calls xlsx writeFile with Aday_Listesi date filename", async () => {
    await exportListToExcel([
      {
        fullName: "Test",
        email: "t@t.com",
        phone: "1",
        department: "HR",
        positionTitle: "Poz",
        overallScore: 60,
        recommendation: null,
        finalDecision: null,
        manualNote: null,
      },
    ]);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [, fileName] = writeFileMock.mock.calls[0];
    expect(fileName).toMatch(/Aday_Listesi_\d{4}-\d{2}-\d{2}\.xlsx/);
  });
});
