import QRCode from "qrcode";
import { NextRequest } from "next/server";

// GET /api/apply/qrcode — Başvuru formu QR kodu (PNG)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const baseUrl = url.searchParams.get("baseUrl") || `${url.origin}/basvuru`;

  const buffer = await QRCode.toBuffer(baseUrl, {
    type: "png",
    width: 400,
    margin: 2,
    color: { dark: "#1B2A4A", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
