import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your Thrive account.",
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
