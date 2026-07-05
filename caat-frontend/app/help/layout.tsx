import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Centre",
  description: "Answers to common questions about using CAAT to manage university applications, essays, scholarships, and documents.",
};

export default function HelpLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
