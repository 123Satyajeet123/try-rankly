import { Dashboard } from '@/components/Dashboard'

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  return <Dashboard initialTab={params.tab as string} />
}
