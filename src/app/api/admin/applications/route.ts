import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";

// GET /api/admin/applications — Başvuru listesi (filtre + sıralama + sayfalama)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("pageSize") || "20")),
    );
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const departmentId = url.searchParams.get("departmentId") || "";
    const sortBy = url.searchParams.get("sortBy") || "submittedAt";
    const sortOrder =
      url.searchParams.get("sortOrder") === "asc"
        ? ("asc" as const)
        : ("desc" as const);
    const minScore = url.searchParams.get("minScore");
    const maxScore = url.searchParams.get("maxScore");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { applicationNo: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (departmentId) where.departmentId = BigInt(departmentId);

    if (minScore || maxScore) {
      const evalFilter: Record<string, unknown> = {};
      if (minScore) evalFilter.gte = parseInt(minScore);
      if (maxScore) evalFilter.lte = parseInt(maxScore);
      where.evaluation = { overallScore: evalFilter };
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.submittedAt = dateFilter;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          department: { select: { name: true } },
          evaluation: {
            select: { overallScore: true, status: true, report: true },
          },
        },
        orderBy:
          sortBy === "score"
            ? { evaluation: { overallScore: sortOrder } }
            : { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.application.count({ where }),
    ]);

    const serialized = JSON.parse(
      JSON.stringify(applications, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json({
      success: true,
      data: serialized,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("Başvuru listesi hatası:", err);
    return apiError("Başvurular alınamadı.", 500);
  }
}
