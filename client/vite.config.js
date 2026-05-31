import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    host: true,   // يسمح بالوصول من أجهزة أخرى على نفس الشبكة (للاختبار من الجوال)
  },
  build: {
    target: "es2020",
  },
});
