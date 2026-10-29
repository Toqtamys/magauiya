/** BOPASI Platform — статический экспорт для GitHub Pages.
 *  BASE_PATH по умолчанию = /magauiya/bopasi (toqtamys.github.io/magauiya/bopasi/).
 *  Для своего домена: BASE_PATH="" npm run export */
const base = process.env.BASE_PATH ?? '/magauiya/bopasi';

export default {
  output: 'export',
  basePath: base,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE: base },
  reactStrictMode: true,
  transpilePackages: ['three'],
};
