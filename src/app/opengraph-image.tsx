import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "Merit Royal Kariyer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
    const logoData = readFileSync(
        join(process.cwd(), "public", "images", "logo.png")
    );
    const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#1a1a2e",
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={logoSrc}
                    width={160}
                    height={160}
                    alt="Merit Royal Logo"
                    style={{ borderRadius: 20, marginBottom: 32 }}
                />
                <div
                    style={{
                        color: "#c9a74e",
                        fontSize: 52,
                        fontWeight: 700,
                        letterSpacing: 2,
                    }}
                >
                    Merit Royal Kariyer
                </div>
                <div
                    style={{
                        color: "#a0a0b8",
                        fontSize: 26,
                        marginTop: 14,
                        letterSpacing: 1,
                    }}
                >
                    Kariyer ve Başvuru Platformu
                </div>
                <div
                    style={{
                        color: "#c9a74e",
                        fontSize: 18,
                        marginTop: 24,
                        fontStyle: "italic",
                        opacity: 0.8,
                    }}
                >
                    En İyilerle Birlikte, Daha İyisi İçin.
                </div>
            </div>
        ),
        { ...size }
    );
}
