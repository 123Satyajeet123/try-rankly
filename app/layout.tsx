import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";

export const metadata: Metadata = {
  title: "Rankly - Get more traffic from LLMs",
  description: "AI-powered brand visibility and AEO optimization platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <OnboardingProvider>
              <AnalyticsProvider>
                {children}
              </AnalyticsProvider>
            </OnboardingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
