// ─── E-posta Bildirimi Servisi ───

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

// ─── Başvuru Onay E-postası ───────────────────────────────────────────────────

function applicationConfirmationHTML(data: {
  fullName: string;
  applicationNo: string;
  departmentName: string;
  submittedAt: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f8f9fc;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <!-- Header -->
    <div style="background:#1B2A4A;padding:24px;text-align:center;">
      <h1 style="color:#C5A55A;margin:0;font-size:24px;">Merit Royal Hotels</h1>
      <p style="color:#ffffff;margin:4px 0 0;font-size:13px;">Kariyer</p>
    </div>
    <!-- Content -->
    <div style="padding:32px 24px;">
      <h2 style="color:#1B2A4A;margin:0 0 16px;font-size:20px;">Başvurunuz Alındı</h2>
      <p style="color:#5a6b8a;line-height:1.6;">
        Sayın <strong>${data.fullName}</strong>,<br><br>
        <strong>${data.departmentName}</strong> departmanına yaptığınız başvuru başarıyla alınmıştır.
        Ekibimiz tarafından değerlendirilecektir.
      </p>
      <div style="background:#f5f3ef;border-radius:8px;padding:16px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#5a6b8a;font-size:14px;">Başvuru No</td>
            <td style="padding:6px 0;color:#1B2A4A;font-weight:600;font-size:14px;text-align:right;">${data.applicationNo}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#5a6b8a;font-size:14px;">Departman</td>
            <td style="padding:6px 0;color:#1B2A4A;font-weight:600;font-size:14px;text-align:right;">${data.departmentName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#5a6b8a;font-size:14px;">Tarih</td>
            <td style="padding:6px 0;color:#1B2A4A;font-weight:600;font-size:14px;text-align:right;">${data.submittedAt}</td>
          </tr>
        </table>
      </div>
      <p style="color:#5a6b8a;font-size:13px;line-height:1.6;">
        Değerlendirme sürecinde sizinle iletişime geçilecektir.<br>
        İlginiz için teşekkür ederiz.
      </p>
    </div>
    <!-- Footer -->
    <div style="background:#f5f3ef;padding:16px 24px;text-align:center;">
      <p style="color:#8a95aa;font-size:12px;margin:0;">
        © ${new Date().getFullYear()} Merit Royal Hotels — Kuzey Kıbrıs<br>
        Bu e-posta otomatik olarak gönderilmiştir.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendApplicationConfirmation(data: {
  email: string;
  fullName: string;
  applicationNo: string;
  departmentName: string;
}): Promise<void> {
  // Skip if SMTP not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("SMTP yapılandırılmamış, e-posta gönderilmedi:", data.email);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Merit Royal Kariyer" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: `Başvurunuz Alındı — ${data.applicationNo}`,
      html: applicationConfirmationHTML({
        fullName: data.fullName,
        applicationNo: data.applicationNo,
        departmentName: data.departmentName,
        submittedAt: new Date().toLocaleDateString("tr-TR"),
      }),
    });
    console.log("Onay e-postası gönderildi:", data.email);
  } catch (err) {
    // E-posta gönderilemezse başvuru yine kaydedilir
    console.error("E-posta gönderme hatası:", err);
  }
}

// ─── Durum Değişikliği Bildirimi ──────────────────────────────────────────────

type NotifiableStatus = "shortlisted" | "rejected" | "hired" | "evaluated";

const STATUS_NOTIFICATION_CONFIG: Record<
  NotifiableStatus,
  { subject: string; heading: string; accentColor: string; message: string }
> = {
  shortlisted: {
    subject: "Başvurunuz Ön Elemeyi Geçti — Merit Royal Hotels",
    heading: "Ön Elemeyi Geçtiniz! 🎉",
    accentColor: "#22C55E",
    message:
      "Başvurunuz detaylı incelemeye alınmış ve ön eleme sürecini başarıyla geçmiştir. İnsan Kaynakları ekibimiz en kısa sürede sizinle iletişime geçerek sonraki adımlar hakkında bilgi verecektir.",
  },
  rejected: {
    subject: "Merit Royal Hotels — Başvurunuza İlişkin Bilgilendirme",
    heading: "Başvurunuza İlişkin Bilgilendirme",
    accentColor: "#6B7280",
    message:
      "Başvurunuzu titizlikle değerlendirmiş olmamıza karşın, şu an için bu pozisyon gereksinimlerimizi karşılamaya yönelik farklı bir profil tercih edilmiştir. İlginiz ve güveniniz için teşekkür eder, ilerleyen dönemde açılacak başka pozisyonlar için tekrar başvurmanızı bekleriz.",
  },
  hired: {
    subject: "Tebrikler — Merit Royal Hotels İşe Alım Bildirimi",
    heading: "Tebrikler, İşe Alındınız! 🌟",
    accentColor: "#C5A55A",
    message:
      "Başvurunuz değerlendirilmiş ve sizi Merit Royal Hotels ailesine katmaktan büyük mutluluk duyacağımıza karar verilmiştir. İşe başlama sürecinizle ilgili detaylar için en kısa sürede sizinle iletişime geçilecektir. Evrakları hazır bulundurunuz.",
  },
  evaluated: {
    subject: "Başvurunuz Değerlendirildi — Merit Royal Hotels",
    heading: "Başvurunuz İncelendi",
    accentColor: "#1B2A4A",
    message:
      "Başvurunuz İnsan Kaynakları ekibimiz tarafından değerlendirilmiştir. Değerlendirme süreci tamamlanmış olup sonuç hakkında en kısa sürede sizinle iletişime geçilecektir.",
  },
};

function statusNotificationHTML(data: {
  fullName: string;
  applicationNo: string;
  departmentName: string;
  status: NotifiableStatus;
}): string {
  const cfg = STATUS_NOTIFICATION_CONFIG[data.status];
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
      <div style="border-left:4px solid ${cfg.accentColor};padding-left:16px;margin-bottom:24px;">
        <h2 style="color:#1B2A4A;margin:0 0 8px;font-size:20px;">${cfg.heading}</h2>
      </div>
      <p style="color:#5a6b8a;line-height:1.7;margin:0 0 16px;">
        Sayın <strong>${data.fullName}</strong>,
      </p>
      <p style="color:#5a6b8a;line-height:1.7;margin:0 0 24px;">
        ${cfg.message}
      </p>
      <div style="background:#f5f3ef;border-radius:8px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#5a6b8a;font-size:14px;">Başvuru No</td>
            <td style="padding:6px 0;color:#1B2A4A;font-weight:600;font-size:14px;text-align:right;">${data.applicationNo}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#5a6b8a;font-size:14px;">Departman</td>
            <td style="padding:6px 0;color:#1B2A4A;font-weight:600;font-size:14px;text-align:right;">${data.departmentName}</td>
          </tr>
        </table>
      </div>
      <p style="color:#8a95aa;font-size:13px;line-height:1.6;">
        Sorularınız için <a href="mailto:${process.env.SMTP_USER || "kariyer@meritroyal.com"}" style="color:#C5A55A;">kariyer ekibimizle</a> iletişime geçebilirsiniz.
      </p>
    </div>
    <div style="background:#f5f3ef;padding:16px 24px;text-align:center;">
      <p style="color:#8a95aa;font-size:12px;margin:0;">
        © ${new Date().getFullYear()} Merit Royal Hotels — Kuzey Kıbrıs<br>
        Bu e-posta otomatik olarak gönderilmiştir.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendStatusChangeEmail(data: {
  email: string;
  fullName: string;
  applicationNo: string;
  departmentName: string;
  status: NotifiableStatus;
}): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("SMTP yapılandırılmamış, durum bildirimi gönderilmedi:", data.email);
    return;
  }

  const cfg = STATUS_NOTIFICATION_CONFIG[data.status];
  try {
    await transporter.sendMail({
      from: `"Merit Royal Kariyer" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: cfg.subject,
      html: statusNotificationHTML({
        fullName: data.fullName,
        applicationNo: data.applicationNo,
        departmentName: data.departmentName,
        status: data.status,
      }),
    });
    console.log(`Durum bildirimi [${data.status}] gönderildi:`, data.email);
  } catch (err) {
    console.error("Durum bildirimi gönderme hatası:", err);
    throw err; // Re-throw so caller can handle
  }
}
