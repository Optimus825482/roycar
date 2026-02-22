import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";

// GET /api/admin/applications/stats — Dashboard istatistikleri
export async function GET() {
  try {
    const [
      totalApplications,
      statusCounts,
      departmentCounts,
      avgScore,
      recentApplications,
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.application.groupBy({
        by: ["departmentId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.evaluation.aggregate({
        _avg: { overallScore: true },
        where: { status: "completed" },
      }),
      prisma.application.findMany({
        take: 5,
        orderBy: { submittedAt: "desc" },
        include: {
          department: { select: { name: true } },
          evaluation: { select: { overallScore: true, status: true } },
        },
      }),
    ]);

    // Departman isimlerini çek
    const deptIds = departmentCounts.map((d) => d.departmentId);
    const departments = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
    });
    const deptMap = new Map(departments.map((d) => [d.id.toString(), d.name]));

    const statusDistribution = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.id]),
    );

    const departmentDistribution = departmentCounts.map((d) => ({
      departmentId: d.departmentId.toString(),
      departmentName: deptMap.get(d.departmentId.toString()) || "Bilinmiyor",
      count: d._count.id,
    }));

    const recent = JSON.parse(
      JSON.stringify(recentApplications, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json({
      success: true,
      data: {
        totalApplications,
        averageScore: Math.round(avgScore._avg.overallScore || 0),
        statusDistribution,
        departmentDistribution,
        recentApplications: recent,
      },
    });
  } catch (err) {
    console.error("İstatistik hatası:", err);
    return apiError("İstatistikler alınamadı.", 500);
  }
}
