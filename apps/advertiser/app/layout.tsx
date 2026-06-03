import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TAD Advertiser Platform',
  description: 'Manage your advertising campaigns',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
