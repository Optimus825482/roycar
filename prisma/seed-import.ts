/**
 * Seed script: Import basvurular.csv into the database
 * Creates a default form config matching Google Forms structure
 * and imports all applications with department matching
 *
 * Usage: npx tsx prisma/seed-import.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as fs from "fs";
import * as path from "path";

// Load env
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// Department matching map (CSV values → department names in DB)
const DEPT_MAP: Record<string, string> = {
  "f&b": "F&B",
  fb: "F&B",
  "f/b": "F&B",
  "f-b": "F&B",
  "f and b": "F&B",
  "food and beverage": "F&B",
  "f&b manager": "F&B",
  barista: "F&B",
  garson: "Servis",
  garsonluk: "Servis",
  servis: "Servis",
  "servis bar": "Servis",
  "servis personeli": "Servis",
  "servis elemanı": "Servis",
  bar: "Bar",
  "bar-": "Bar",
  mutfak: "Mutfak",
  "mutfak pastane": "Mutfak",
  "soğuk mutfak": "Mutfak",
  "sıcak mutfak": "Mutfak",
  komi: "Mutfak",
  "mutfak stajyer": "Mutfak",
  "a la carte": "Mutfak",
  gastronomi: "Mutfak",
  "ön büro": "Ön Büro",
  önbüro: "Ön Büro",
  resepsiyon: "Ön Büro",
  resepsiyonist: "Ön Büro",
  "rezervasyon memuru": "Ön Büro",
  rezervasyon: "Ön Büro",
  bellboy: "Bellboy",
  "bell boy": "Bellboy",
  animasyon: "Animasyon",
  "mini club": "Animasyon",
  "kat hizmetleri": "Kat Hizmetleri",
  finans: "Finans",
  "finans departmanı": "Finans",
  "finans ve bankacılık": "Finans",
  spa: "Spa",
  "teknik servis": "Teknik Servis",
  "insan kaynakları": "F&B", // fallback
  "satış pazarlama": "F&B",
};

function matchDepartment(
  deptText: string,
  departments: { id: bigint; name: string }[],
): bigint {
  const lower = deptText.toLowerCase().trim();

  // Direct match from map
  for (const [key, deptName] of Object.entries(DEPT_MAP)) {
    if (lower.includes(key)) {
      const dept = departments.find(
        (d) => d.name.toLowerCase() === deptName.toLowerCase(),
      );
      if (dept) return dept.id;
    }
  }

  // Try partial match against DB department names
  for (const dept of departments) {
    if (
      lower.includes(dept.name.toLowerCase()) ||
      dept.name.toLowerCase().includes(lower)
    ) {
      return dept.id;
    }
  }

  // Default to F&B (most common)
  const fb = departments.find((d) => d.name === "F&B");
  return fb?.id || departments[0].id;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ";" && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function main() {
  console.log("🚀 Starting import...");

  // 1. Get departments
  const departments = await prisma.department.findMany();
  console.log(`📋 Found ${departments.length} departments`);

  // 2. Create or get import form config
  let formConfig = await prisma.formConfig.findFirst({
    where: { title: "Google Forms Import" },
  });
  if (!formConfig) {
    formConfig = await prisma.formConfig.create({
      data: {
        title: "Google Forms Import",
        mode: "static",
        isPublished: false,
        isActive: false,
      },
    });
    console.log("📝 Created 'Google Forms Import' form config");
  }

  // 3. Create questions for the form (matching Google Forms columns)
  const questionDefs = [
    { text: "Bulunduğunuz Şehir", type: "text" },
    { text: "Telefon Numaranız", type: "text" },
    { text: "Başvurduğunuz Departman/Pozisyon", type: "text" },
    { text: "Lojman Talebiniz Var mı?", type: "radio" },
    { text: "Doğum Yeriniz", type: "text" },
    { text: "Doğum Tarihiniz", type: "date" },
    { text: "Cinsiyetiniz", type: "radio" },
    { text: "Baba Adı", type: "text" },
    { text: "Anne Adı", type: "text" },
    { text: "Okuduğunuz Bölüm", type: "text" },
    { text: "Okuduğunuz Üniversite", type: "text" },
    { text: "Staj Deneyimi", type: "textarea" },
    { text: "Acil Durumlarda Başvurulacak Kişi", type: "text" },
    { text: "Soruşturma Durumu", type: "radio" },
    { text: "Sabıka Kaydı", type: "radio" },
  ];

  const existingQs = await prisma.question.findMany({
    where: { formConfigId: formConfig.id },
  });
  let questions: { id: bigint; questionText: string; sortOrder: number }[] = [];

  if (existingQs.length === 0) {
    for (let i = 0; i < questionDefs.length; i++) {
      const q = await prisma.question.create({
        data: {
          formConfigId: formConfig.id,
          questionText: questionDefs[i].text,
          questionType: questionDefs[i].type,
          isRequired: false,
          sortOrder: i + 1,
        },
      });
      questions.push({
        id: q.id,
        questionText: q.questionText,
        sortOrder: q.sortOrder,
      });
    }
    console.log(`📝 Created ${questions.length} questions`);
  } else {
    questions = existingQs.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      sortOrder: q.sortOrder,
    }));
    console.log(`📝 Using existing ${questions.length} questions`);
  }

  // 4. Read and parse CSV
  const csvPath = path.resolve(__dirname, "../../basvurular.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").filter((l) => l.trim());

  // First two lines: Column1;Column2;... and actual headers
  // Line 0: Column1;Column2;... (generic headers)
  // Line 1: Zaman damgası;ADINIZ SOYADINIZ;... (actual headers)
  // Line 2+: data rows
  const headerLine = lines[1]; // actual Turkish headers
  const headers = parseCSVLine(headerLine);
  console.log(`📊 CSV headers: ${headers.length} columns`);

  // Column indices (0-based):
  // 0: Zaman damgası
  // 1: ADINIZ SOYADINIZ
  // 2: BULUNDUĞUNUZ ŞEHİR
  // 3: TELEFON NUMARANIZ
  // 4: BAŞVURDUĞUNUZ DEPARTMAN/ POZİSYON
  // 5: LOJMAN TALEBİNİZ VAR MI?
  // 6: DOĞUM YERİNİZ
  // 7: DOĞUM TARİHİNİZ
  // 8: CİNSİYETİNİZ
  // 9: E-POSTA
  // 10: BABA ADI
  // 11: ANNE ADI
  // 12: OKUDUĞUNUZ BÖLÜM
  // 13: OKUDUĞUNUZ ÜNİVERSİTE
  // 14: STAJ
  // 15: ACİL DURUM KİŞİSİ
  // 16: SORUŞTURMA
  // 17: SABIKA
  // 18: RESİM URL

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const seenEmails = new Set<string>();

  // Create import log
  const importLog = await prisma.importLog.create({
    data: {
      fileName: "basvurular.csv",
      totalRows: lines.length - 2,
      importedCount: 0,
      skippedCount: 0,
      status: "processing",
    },
  });

  for (let i = 2; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 10) {
      errors.push(`Row ${i + 1}: Not enough columns (${fields.length})`);
      skipped++;
      continue;
    }

    const fullName = fields[1]?.trim();
    const email = fields[9]?.trim().toLowerCase();
    const phone = fields[3]?.trim() || "";
    const deptText = fields[4]?.trim() || "";
    const city = fields[2]?.trim() || "";
    const lojman = fields[5]?.trim() || "";
    const birthPlace = fields[6]?.trim() || "";
    const birthDate = fields[7]?.trim() || "";
    const gender = fields[8]?.trim() || "";
    const fatherName = fields[10]?.trim() || "";
    const motherName = fields[11]?.trim() || "";
    const education = fields[12]?.trim() || "";
    const university = fields[13]?.trim() || "";
    const internship = fields[14]?.trim() || "";
    const emergencyContact = fields[15]?.trim() || "";
    const investigation = fields[16]?.trim() || "";
    const criminalRecord = fields[17]?.trim() || "";
    const photoUrl = fields[18]?.trim() || "";

    if (!fullName || !email) {
      errors.push(`Row ${i + 1}: Missing name or email`);
      skipped++;
      continue;
    }

    // Skip duplicates within CSV
    if (seenEmails.has(email)) {
      errors.push(`Row ${i + 1}: Duplicate email in CSV: ${email}`);
      skipped++;
      continue;
    }
    seenEmails.add(email);

    // Check DB duplicate
    const existing = await prisma.application.findFirst({
      where: { email },
    });
    if (existing) {
      errors.push(`Row ${i + 1}: Already in DB: ${email}`);
      skipped++;
      continue;
    }

    const departmentId = matchDepartment(deptText, departments);
    const appNo = `MR-IMP-${Date.now()}-${i}`;

    const responseSummary: Record<string, string> = {
      fullName,
      email,
      phone,
      city,
      department: deptText,
      lojman,
      birthPlace,
      birthDate,
      gender,
      fatherName,
      motherName,
      education,
      university,
      internship,
      emergencyContact,
      investigation,
      criminalRecord,
      photoUrl,
    };

    try {
      const app = await prisma.application.create({
        data: {
          applicationNo: appNo,
          formConfigId: formConfig.id,
          departmentId,
          fullName,
          email,
          phone,
          photoPath: photoUrl || null,
          status: "new",
          responseSummary: JSON.parse(JSON.stringify(responseSummary)),
          importLogId: importLog.id,
        },
      });

      // Create application responses for each question
      const answerMap: Record<number, string> = {
        0: city,
        1: phone,
        2: deptText,
        3: lojman,
        4: birthPlace,
        5: birthDate,
        6: gender,
        7: fatherName,
        8: motherName,
        9: education,
        10: university,
        11: internship,
        12: emergencyContact,
        13: investigation,
        14: criminalRecord,
      };

      for (let qi = 0; qi < questions.length; qi++) {
        const answerText = answerMap[qi] || "";
        if (answerText) {
          await prisma.applicationResponse.create({
            data: {
              applicationId: app.id,
              questionId: questions[qi].id,
              answerText,
            },
          });
        }
      }

      imported++;
    } catch (err) {
      errors.push(`Row ${i + 1}: ${String(err)}`);
      skipped++;
    }
  }

  // Update import log
  await prisma.importLog.update({
    where: { id: importLog.id },
    data: {
      importedCount: imported,
      skippedCount: skipped,
      errorDetails:
        errors.length > 0
          ? JSON.parse(JSON.stringify(errors.slice(0, 50)))
          : undefined,
      status: "completed",
      completedAt: new Date(),
    },
  });

  console.log(`\n✅ Import completed!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  if (errors.length > 0) {
    console.log(`   Errors (first 10):`);
    errors.slice(0, 10).forEach((e) => console.log(`     - ${e}`));
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
