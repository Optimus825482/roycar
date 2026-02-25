import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// Statik form şablonu — genel kişisel bilgiler
const STATIC_TEMPLATE_QUESTIONS = [
  // Kişisel Bilgiler
  { group: "Kişisel Bilgiler", text: "Adınız", type: "text", required: true },
  {
    group: "Kişisel Bilgiler",
    text: "Soyadınız",
    type: "text",
    required: true,
  },
  {
    group: "Kişisel Bilgiler",
    text: "Doğum Tarihi",
    type: "date",
    required: true,
  },
  {
    group: "Kişisel Bilgiler",
    text: "Doğum Yeri",
    type: "text",
    required: true,
  },
  {
    group: "Kişisel Bilgiler",
    text: "Cinsiyet",
    type: "radio",
    required: true,
    options: ["Erkek", "Kadın"],
  },
  {
    group: "Kişisel Bilgiler",
    text: "Medeni Durum",
    type: "select",
    required: false,
    options: ["Bekâr", "Evli", "Boşanmış"],
  },
  {
    group: "Kişisel Bilgiler",
    text: "T.C. Kimlik No / Pasaport No",
    type: "text",
    required: true,
  },
  {
    group: "Kişisel Bilgiler",
    text: "Uyruk",
    type: "select",
    required: true,
    options: ["T.C.", "K.K.T.C.", "Diğer"],
  },

  // İletişim Bilgileri
  {
    group: "İletişim Bilgileri",
    text: "Telefon Numarası",
    type: "text",
    required: true,
  },
  {
    group: "İletişim Bilgileri",
    text: "E-posta Adresi",
    type: "text",
    required: true,
  },
  {
    group: "İletişim Bilgileri",
    text: "Adres",
    type: "textarea",
    required: true,
  },

  // Eğitim Bilgileri
  {
    group: "Eğitim Bilgileri",
    text: "Eğitim Durumu",
    type: "select",
    required: true,
    options: [
      "İlkokul",
      "Ortaokul",
      "Lise",
      "Ön Lisans",
      "Lisans",
      "Yüksek Lisans",
      "Doktora",
    ],
  },
  {
    group: "Eğitim Bilgileri",
    text: "Mezun Olduğu Okul",
    type: "text",
    required: true,
  },
  {
    group: "Eğitim Bilgileri",
    text: "Bölüm / Program",
    type: "text",
    required: false,
  },
  {
    group: "Eğitim Bilgileri",
    text: "Mezuniyet Yılı",
    type: "text",
    required: false,
  },

  // İş Deneyimi
  {
    group: "İş Deneyimi",
    text: "Daha önce otelcilik/turizm sektöründe çalıştınız mı?",
    type: "radio",
    required: true,
    options: ["Evet", "Hayır"],
  },
  {
    group: "İş Deneyimi",
    text: "Staj Yaptığınız Yerler",
    type: "textarea",
    required: false,
  },
  {
    group: "İş Deneyimi",
    text: "Önceki İş Deneyimleriniz (Firma, Pozisyon, Süre)",
    type: "textarea",
    required: false,
  },

  // Yetkinlikler
  {
    group: "Yetkinlikler",
    text: "Yabancı Dil Bilgisi",
    type: "checkbox",
    required: false,
    options: ["İngilizce", "Almanca", "Fransızca", "Rusça", "Arapça", "Diğer"],
  },
  {
    group: "Yetkinlikler",
    text: "Bilgisayar Bilgisi",
    type: "checkbox",
    required: false,
    options: [
      "MS Office",
      "POS Sistemleri",
      "Opera PMS",
      "Fidelio",
      "SAP",
      "Diğer",
    ],
  },
  {
    group: "Yetkinlikler",
    text: "Ehliyet Durumu",
    type: "radio",
    required: false,
    options: ["Var", "Yok"],
  },
  {
    group: "Yetkinlikler",
    text: "Sigara Kullanıyor musunuz?",
    type: "radio",
    required: false,
    options: ["Evet", "Hayır"],
  },

  // Referanslar
  {
    group: "Referanslar",
    text: "Referans 1 (Ad Soyad, Firma, Telefon)",
    type: "textarea",
    required: false,
  },
  {
    group: "Referanslar",
    text: "Referans 2 (Ad Soyad, Firma, Telefon)",
    type: "textarea",
    required: false,
  },

  // Ek Bilgiler
  {
    group: "Ek Bilgiler",
    text: "Başvurmak İstediğiniz Departman",
    type: "select",
    required: true,
    options: [], // Will be populated from departments
  },
  {
    group: "Ek Bilgiler",
    text: "Ne Zaman İşe Başlayabilirsiniz?",
    type: "date",
    required: false,
  },
  { group: "Ek Bilgiler", text: "Fotoğraf", type: "file", required: false },
  {
    group: "Ek Bilgiler",
    text: "CV / Özgeçmiş",
    type: "file",
    required: false,
  },
  {
    group: "Ek Bilgiler",
    text: "Eklemek istediğiniz başka bir bilgi var mı?",
    type: "textarea",
    required: false,
  },
];

// POST /api/admin/forms/seed-static — Statik form şablonu oluştur
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = body.title || "Genel Başvuru Formu";

    // Get departments for the department question
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true },
    });
    const deptNames = departments.map((d) => d.name);

    // Create form
    const form = await prisma.formConfig.create({
      data: {
        title,
        mode: "static",
        isPublished: false,
      },
    });

    // Create questions
    const questionsData = STATIC_TEMPLATE_QUESTIONS.map((q, idx) => ({
      formConfigId: form.id,
      groupLabel: q.group,
      questionText: q.text,
      questionType: q.type,
      isRequired: q.required,
      sortOrder: idx,
      options:
        q.text === "Başvurmak İstediğiniz Departman" && deptNames.length > 0
          ? deptNames
          : q.options && q.options.length > 0
            ? q.options
            : undefined,
    }));

    await prisma.question.createMany({ data: questionsData });

    const created = await prisma.formConfig.findUnique({
      where: { id: form.id },
      include: {
        _count: { select: { questions: true, applications: true } },
      },
    });

    return Response.json(
      apiSuccess(created, "Statik form şablonu oluşturuldu."),
      { status: 201 },
    );
  } catch (err) {
    console.error("Seed static form error:", err);
    return apiError("Statik form şablonu oluşturulamadı.", 500);
  }
}
