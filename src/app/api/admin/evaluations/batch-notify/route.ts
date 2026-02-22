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

  const bigIntIds = applicationIds.map((id) => BigInt(id));

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

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const app of applications) {
    if (!app.email) {
      results.push({
        id: app.id.toString(),
        success: false,
        error: "E-posta adresi yok",
      });
      continue;
    }

    try {
      await sendStatusChangeEmail({
        email: app.email,
        fullName: app.fullName,
        applicationNo: app.applicationNo,
        departmentName: app.department?.name ?? "Bilinmiyor",
        status: "evaluated",
      });
      results.push({ id: app.id.toString(), success: true });
    } catch (err) {
      console.error(`Batch-notify başarısız [${app.id}]:`, err);
      results.push({
        id: app.id.toString(),
        success: false,
        error: "Gönderme hatası",
      });
    }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: true,
    sent,
    failed,
    results,
  });
}
