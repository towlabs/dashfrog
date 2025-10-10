import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import LayoutClient from './components/LayoutClient'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DashFrog - Dashboard',
  description: 'Modern dashboard built with Next.js and shadcn/ui',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  )
}