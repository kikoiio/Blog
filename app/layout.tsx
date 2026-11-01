import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aries's Blog",
  description: "计算机笔记、摄影作品与冰岛风景漫游。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
