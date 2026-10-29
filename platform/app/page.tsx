import { asset } from '@/lib/i18n';

/** Корень перенаправляет на язык по умолчанию (ru). Статический редирект. */
export default function Index() {
  const to = asset('/ru/');
  return (
    <html lang="ru">
      <head>
        <meta httpEquiv="refresh" content={`0; url=${to}`} />
        <link rel="canonical" href={to} />
      </head>
      <body style={{ fontFamily: 'system-ui', padding: 40 }}>
        <a href={to}>BOPASI Platform →</a>
        <script dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(to)})` }} />
      </body>
    </html>
  );
}
