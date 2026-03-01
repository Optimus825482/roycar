import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendStatusChangeEmail } from "@/services/email.service";

export async function POST(req: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const body = await req.json();
  const applicationIds: string[] = body.applicationIds ?? [];

  if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
    return NextResponse.json(
      { error: "applicationIds boş veya geçersiz" },
      { status: 400 },
    );
  }

  const bigIntIds = applicationIds.map((id) => {
    if (!/^\d+$/.test(id)) throw new Error(`Geçersiz ID: ${id}`);
    return BigInt(id);
  });

  const applications = await prisma.application.findMany({
    where: { id: { in: bigIntIds } },
    select: {
      id: true,
      applicationNo: true,
      fullName: true,
      email: true,
      status: true,
      department: { select: { name: true } },
    },
  });

  // Send emails in parallel instead of sequential
  const emailPromises = applications.map(async (app) => {
    if (!app.email) {
      return {
        id: app.id.toString(),
        success: false,
        error: "E-posta adresi yok",
      };
    }
    try {
      await sendStatusChangeEmail({
        email: app.email,
        fullName: app.fullName,
        applicationNo: app.applicationNo,
        departmentName: app.department?.name ?? "Bilinmiyor",
        status: "evaluated",
      });
      return { id: app.id.toString(), success: true };
    } catch (err) {
      console.error(`Batch-notify başarısız [${app.id}]:`, err);
      return {
        id: app.id.toString(),
        success: false,
        error: "Gönderme hatası",
      };
    }
  });

  const results = await Promise.allSettled(emailPromises).then((settled) =>
    settled.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { id: "?", success: false, error: "Beklenmeyen hata" },
    ),
  );

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: true,
    sent,
    failed,
    results,
  });
}
