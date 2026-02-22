import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";

// GET /api/admin/applications/:id — Başvuru detayı
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const application = await prisma.application.findUnique({
      where: { id: BigInt(id) },
      include: {
        department: true,
        formConfig: { select: { id: true, title: true, mode: true } },
        responses: {
          include: {
            question: {
              select: { id: true, questionText: true, questionType: true },
            },
          },
          orderBy: { question: { sortOrder: "asc" } },
        },
        evaluation: true,
        fieldValues: {
          include: {
            fieldDefinition: {
              select: {
                id: true,
                fieldName: true,
                fieldCategory: true,
                dataType: true,
              },
            },
          },
          orderBy: { fieldDefinition: { fieldCategory: "asc" } },
        },
      },
    });

    if (!application) return apiError("Başvuru bulunamadı.", 404);

    // Aynı email'e ait diğer başvuruları bul (farklı formlar dahil)
    const otherApplications = await prisma.application.findMany({
      where: {
        email: application.email,
        id: { not: application.id },
      },
      select: {
        id: true,
        applicationNo: true,
        status: true,
        submittedAt: true,
        formConfig: { select: { id: true, title: true } },
        department: { select: { name: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    const serialized = JSON.parse(
      JSON.stringify({ ...application, otherApplications }, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json({ success: true, data: serialized });
  } catch (err) {
    console.error("Başvuru detay hatası:", err);
    return apiError("Başvuru detayı alınamadı.", 500);
  }
}
