import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendStatusChangeEmail } from "@/services/email.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { id } = await params;
  const numId = BigInt(id);

  // Find application with required fields
  const application = await prisma.application.findUnique({
    where: { id: numId },
    select: {
      id: true,
      applicationNo: true,
      fullName: true,
      email: true,
      status: true,
      department: { select: { name: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });
  }

  if (!application.email) {
    return NextResponse.json(
      { error: "Bu başvuruda e-posta adresi mevcut değil" },
      { status: 422 },
    );
  }

  const notifiableStatuses = ["shortlisted", "rejected", "hired", "evaluated"];
  if (!notifiableStatuses.includes(application.status)) {
    return NextResponse.json(
      { error: `Bu durum için bildirim desteklenmiyor: ${application.status}` },
      { status: 422 },
    );
  }

  try {
    await sendStatusChangeEmail({
      email: application.email,
      fullName: application.fullName,
      applicationNo: application.applicationNo,
      departmentName: application.department?.name ?? "Bilinmiyor",
      status: application.status as
        | "shortlisted"
        | "rejected"
        | "hired"
        | "evaluated",
    });

    return NextResponse.json({ success: true, message: "E-posta gönderildi" });
  } catch (err) {
    console.error("Notify API hatası:", err);
    return NextResponse.json(
      { error: "E-posta gönderilemedi. SMTP ayarlarını kontrol edin." },
      { status: 500 },
    );
  }
}
