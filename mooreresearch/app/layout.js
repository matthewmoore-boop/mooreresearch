import { Inter } from 'next/font/google'
import './globals.css'
import { Room } from "./Room"; // Import the new Room provider

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Apex Research Editor',
  description: 'Collaborative Research Platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Room> {/* Wrap the children with the Room provider */}
          {children}
        </Room>
      </body>
    </html>
  )
}