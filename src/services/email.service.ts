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
