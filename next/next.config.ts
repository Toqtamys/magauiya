import type { NextConfig } from "next";

// Статический экспорт для GitHub Pages: сайт живёт по адресу /magauiya/bopasi/
export const BASE_PATH = "/magauiya/bopasi";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
};

export default nextConfig;
