import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { OnboardingProvider } from "@/contexts/OnboardingContext"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <OnboardingProvider>
          {children}
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
