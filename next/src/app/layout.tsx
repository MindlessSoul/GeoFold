import type { Metadata } from 'next'
import { Archivo, Space_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const archivo = Archivo({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const spaceMono = Space_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'GeoFold — Field GPS survey tool',
  description: 'Turn a phone into a field survey kit: geo-tagged photos, offline capture, and every point on a map you can export and report from.',
  openGraph: {
    title: 'GeoFold — Field GPS survey tool',
    description: 'Geo-tagged photos, offline capture, and every survey point on a map you can export.',
    type: 'website',
  },
}

// Set the initial theme before paint to avoid a flash: honour a saved choice, else the OS setting.
const themeScript = `(function(){try{var t=localStorage.getItem('geofold-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${spaceMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
