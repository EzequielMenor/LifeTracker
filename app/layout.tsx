import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Life Tracker',
	description: 'Tu sistema de disciplina personal',
	manifest: '/manifest.json',
	appleWebApp: {
		capable: true,
		statusBarStyle: 'black-translucent',
		title: 'Life Tracker',
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					{children}
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
