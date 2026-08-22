import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AiKnowledgeAssistant } from "@/components/AiKnowledgeAssistant";

export const metadata: Metadata = {
  title: "Unicom University — Enterprise Learning Management System",
  description: "Internal enterprise training, monitoring, and AI exam platform for Unicom University.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full bg-white">
      <body className="h-full antialiased text-slate-900 bg-white selection:bg-blue-100 selection:text-blue-900">
        <AuthProvider>
          <AuthGuard>
            {children}
            <AiKnowledgeAssistant />
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
