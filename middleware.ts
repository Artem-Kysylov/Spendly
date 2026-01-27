import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Игнорируем:
  // - api (все запросы к /api/...)
  // - _next (внутренние файлы Next.js)
  // - любые файлы с точкой (картинки, фавиконки, css)
  matcher: ["/((?!api|_next|.*\\..*|[a-zA-Z-]+/api).*)"],
};

