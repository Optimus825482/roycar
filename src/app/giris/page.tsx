"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LogIn, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Geçersiz kullanıcı adı veya parola.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sol Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-mr-navy relative overflow-hidden items-center justify-center">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(197,165,90,0.3) 0%, transparent 50%),
                              radial-gradient(circle at 75% 75%, rgba(197,165,90,0.2) 0%, transparent 50%)`,
          }} />
        </div>

        {/* Decorative line accents */}
        <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-mr-gold/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-mr-gold/30 to-transparent" />

        <div className="relative z-10 text-center px-12 max-w-lg">
          <Image
            src="/images/logo_NOBG.PNG"
            alt="Merit Royal Hotels"
            width={280}
            height={93}
            className="mx-auto mb-8"
            priority
          />
          <div className="w-16 h-px bg-mr-gold mx-auto mb-6" />
          <p className="text-white/80 text-lg leading-relaxed font-light">
            En İyilerle Birlikte, Daha İyisi İçin.
          </p>
          <p className="font-(family-name:--font-handwriting) text-mr-gold text-3xl mt-4">
            Kariyer Portalı
          </p>
        </div>
      </div>

      {/* Sağ Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-mr-cream px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image
              src="/images/logo_NOBG.PNG"
              alt="Merit Royal Hotels"
              width={200}
              height={66}
              className="brightness-0"
              priority
            />
          </div>

          <Card className="border-mr-gold/15 shadow-3d">
            <CardHeader className="text-center pb-2 pt-8">
              <h1 className="text-2xl font-bold text-mr-navy tracking-tight">
                Yönetim Paneli
              </h1>
              <p className="text-mr-text-secondary text-sm mt-1">
                Hesabınıza giriş yapın
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 bg-mr-error/10 text-mr-error text-sm p-3 rounded-lg border border-mr-error/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-mr-navy">
                    Kullanıcı Adı
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Kullanıcı adınızı giriniz"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="h-11 border-mr-navy/15 focus:border-mr-gold focus:ring-mr-gold/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-mr-navy">
                    Parola
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-11 pr-10 border-mr-navy/15 focus:border-mr-gold focus:ring-mr-gold/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-mr-text-secondary hover:text-mr-navy cursor-pointer transition-colors"
                      aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4.5 h-4.5" />
                      ) : (
                        <Eye className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-mr-navy hover:bg-mr-navy-light text-white cursor-pointer font-medium transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Giriş yapılıyor...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Giriş Yap
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <footer className="mt-6 text-center text-mr-text-muted/50 text-xs">
            <p>© {new Date().getFullYear()} Merit Royal Hotels — Tüm hakları saklıdır.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
