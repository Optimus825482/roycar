import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/utils";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function shareEmailHTML(data: { formTitle: string; formUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f8f9fc;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#1B2A4A;padding:24px;text-align:center;">
      <h1 style="color:#C5A55A;margin:0;font-size:24px;">Merit Royal Hotels</h1>
      <p style="color:#ffffff;margin:4px 0 0;font-size:13px;">Kariyer</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#1B2A4A;margin:0 0 16px;font-size:20px;">Kariyer Fırsatı</h2>
      <p style="color:#5a6b8a;line-height:1.6;">
        Merit Royal Hotels ekibine katılmak ister misiniz?<br><br>
        <strong>${data.formTitle}</strong> için başvuru sürecimiz başlamıştır.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${data.formUrl}" style="display:inline-block;padding:14px 32px;background:#C5A55A;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
          Başvur
        </a>
      </div>
      <p style="color:#8a95aa;font-size:13px;line-height:1.6;">
        Veya bu bağlantıyı tarayıcınıza yapıştırın:<br>
        <a href="${data.formUrl}" style="color:#C5A55A;">${data.formUrl}</a>
      </p>
    </div>
    <div style="background:#f5f3ef;padding:16px 24px;text-align:center;">
      <p style="color:#8a95aa;font-size:12px;margin:0;">
        © ${new Date().getFullYear()} Merit Royal Hotels — Kuzey Kıbrıs<br>
        Bu e-posta Merit Royal Kariyer tarafından gönderilmiştir.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// POST /api/admin/forms/share — Form linkini e-posta ile paylaş
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emails, formTitle, formUrl } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return apiError("En az bir e-posta adresi gerekli.");
    }
    if (!formTitle || !formUrl) {
      return apiError("Form başlığı ve URL gerekli.");
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return apiError(
        "SMTP yapılandırılmamış. Ayarlar sayfasından SMTP bilgilerini girin.",
        500,
      );
    }

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: `"Merit Royal Kariyer" <${process.env.SMTP_USER}>`,
          to: email.trim(),
          subject: `Merit Royal Kariyer — ${formTitle}`,
          html: shareEmailHTML({ formTitle, formUrl }),
        });
        results.push({ email, success: true });
      } catch (err) {
        results.push({ email, success: false, error: String(err) });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return Response.json(
      apiSuccess(
        { results, sent, failed },
        `${sent} e-posta gönderildi${failed > 0 ? `, ${failed} başarısız` : ""}.`,
      ),
    );
  } catch (err) {
    console.error("Form paylaşım hatası:", err);
    return apiError("E-posta gönderilemedi.", 500);
  }
}
