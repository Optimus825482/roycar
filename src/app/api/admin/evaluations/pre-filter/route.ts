import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/admin/evaluations/pre-filter — Dinamik alan tanımlarını getir
export async function GET() {
  try {
    const fields = await prisma.importFieldDefinition.findMany({
      where: { isActive: true },
      orderBy: { usageCount: "desc" },
      select: {
        id: true,
        fieldName: true,
        normalizedName: true,
        fieldCategory: true,
        dataType: true,
      },
    });

    const serialized = JSON.parse(
      JSON.stringify(fields, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json(apiSuccess(serialized));
  } catch (err) {
    console.error("Pre-filter fields error:", err);
    return apiError("Alan tanımları alınamadı.", 500);
  }
}

// POST /api/admin/evaluations/pre-filter — Ön kriterlere göre başvuruları filtrele
export async function POST(req: NextRequest) {
  try {
    const { criteria, positionId } = await req.json();

    // criteria: Array<{ fieldDefinitionId: string, operator: string, value: string }>
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return apiError("En az bir kriter belirtilmelidir.");
    }

    // Build raw SQL for field_values filtering
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    // Position filter
    if (positionId) {
      conditions.push(`a.position_id = $${paramIdx}`);
      params.push(BigInt(positionId));
      paramIdx++;
    }

    // For each criterion, build a subquery
    const fieldConditions: string[] = [];
    for (const c of criteria) {
      const fdId = BigInt(c.fieldDefinitionId);
      const op = c.operator as string;
      const val = c.value as string;

      let sqlCondition = "";
      switch (op) {
        case "equals":
          sqlCondition = `EXISTS (
            SELECT 1 FROM application_field_values fv
            WHERE fv.application_id = a.id
            AND fv.field_definition_id = $${paramIdx}
            AND LOWER(fv.value) = LOWER($${paramIdx + 1})
          )`;
          params.push(fdId, val);
          paramIdx += 2;
          break;
        case "not_equals":
          sqlCondition = `NOT EXISTS (
            SELECT 1 FROM application_field_values fv
            WHERE fv.application_id = a.id
            AND fv.field_definition_id = $${paramIdx}
            AND LOWER(fv.value) = LOWER($${paramIdx + 1})
          )`;
          params.push(fdId, val);
          paramIdx += 2;
          break;
        case "contains":
          sqlCondition = `EXISTS (
            SELECT 1 FROM application_field_values fv
            WHERE fv.application_id = a.id
            AND fv.field_definition_id = $${paramIdx}
            AND fv.value ILIKE $${paramIdx + 1}
          )`;
          params.push(fdId, `%${val}%`);
          paramIdx += 2;
          break;
        case "greater_than":
          sqlCondition = `EXISTS (
            SELECT 1 FROM application_field_values fv
            WHERE fv.application_id = a.id
            AND fv.field_definition_id = $${paramIdx}
            AND fv.value ~ '^[0-9]+(\\.[0-9]+)?$'
            AND CAST(fv.value AS NUMERIC) > $${paramIdx + 1}
          )`;
          params.push(fdId, parseFloat(val));
          paramIdx += 2;
          break;
        case "less_than":
          sqlCondition = `EXISTS (
            SELECT 1 FROM application_field_values fv
            WHERE fv.application_id = a.id
            AND fv.field_definition_id = $${paramIdx}
            AND fv.value ~ '^[0-9]+(\\.[0-9]+)?$'
            AND CAST(fv.value AS NUMERIC) < $${paramIdx + 1}
          )`;
          params.push(fdId, parseFloat(val));
          paramIdx += 2;
          break;
        case "greater_than_equal":
          sqlCondition = `EXISTS (
            SELECT 1 FROM application_field_values fv
            WHERE fv.application_id = a.id
            AND fv.field_definition_id = $${paramIdx}
            AND fv.value ~ '^[0-9]+(\\.[0-9]+)?$'
            AND CAST(fv.value AS NUMERIC) >= $${paramIdx + 1}
          )`;
          params.push(fdId, parseFloat(val));
          paramIdx += 2;
          break;
        case "less_than_equal":
          sqlCondition = `EXISTS (
            SELECT 1 FROM application_field_values fv
            WHERE fv.application_id = a.id
            AND fv.field_definition_id = $${paramIdx}
            AND fv.value ~ '^[0-9]+(\\.[0-9]+)?$'
            AND CAST(fv.value AS NUMERIC) <= $${paramIdx + 1}
          )`;
          params.push(fdId, parseFloat(val));
          paramIdx += 2;
          break;
        case "is_not_empty":
          sqlCondition = `EXISTS (
            SELECT 1 FROM application_field_values fv
            WHERE fv.application_id = a.id
            AND fv.field_definition_id = $${paramIdx}
            AND fv.value IS NOT NULL AND fv.value != ''
          )`;
          params.push(fdId);
          paramIdx += 1;
          break;
        default:
          continue;
      }
      if (sqlCondition) fieldConditions.push(sqlCondition);
    }

    if (fieldConditions.length > 0) {
      conditions.push(fieldConditions.join(" AND "));
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        a.id,
        a.application_no,
        a.full_name,
        a.email,
        a.phone,
        a.status,
        a.submitted_at,
        a.position_title,
        d.id as department_id,
        d.name as department_name,
        e.id as eval_id,
        e.overall_score,
        e.status as eval_status,
        e.report,
        e.evaluated_at,
        e.retry_count
      FROM applications a
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN LATERAL (
        SELECT e2.id, e2.overall_score, e2.status, e2.report, e2.evaluated_at, e2.retry_count
        FROM evaluations e2
        WHERE e2.application_id = a.id
        ORDER BY e2.created_at DESC
        LIMIT 1
      ) e ON true
      ${whereClause}
      ORDER BY a.submitted_at DESC
      LIMIT 500
    `;

    const results = (await prisma.$queryRawUnsafe(sql, ...params)) as Array<
      Record<string, unknown>
    >;

    const serialized = results.map((r) => ({
      id: String(r.id),
      applicationNo: r.application_no,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      status: r.status,
      submittedAt: r.submitted_at,
      positionTitle: r.position_title,
      department: r.department_id
        ? { id: String(r.department_id), name: r.department_name }
        : null,
      evaluation: r.eval_id
        ? {
            id: String(r.eval_id),
            overallScore: r.overall_score,
            status: r.eval_status,
            report:
              typeof r.report === "string" ? JSON.parse(r.report) : r.report,
            evaluatedAt: r.evaluated_at,
            retryCount: r.retry_count,
          }
        : null,
    }));

    return Response.json(
      apiSuccess({
        applications: serialized,
        total: serialized.length,
      }),
    );
  } catch (err) {
    console.error("Pre-filter error:", err);
    return apiError("Ön filtreleme yapılamadı.", 500);
  }
}
