import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your CoachK account password.",
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
