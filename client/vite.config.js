import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

// مصدر واحد لرقم الإصدار: client/package.json — يُحقَن في الواجهة كـ __APP_VERSION__
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5173,
    host: true,   // يسمح بالوصول من أجهزة أخرى على نفس الشبكة (للاختبار من الجوال)
  },
  build: {
    target: "es2020",
  },
});
