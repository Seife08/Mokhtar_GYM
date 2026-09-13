# MOKHTAR GYM — Fitness Club Management Platform

منصة إدارة نوادي اللياقة — Next.js 16 · TypeScript · Prisma · Tailwind 4 · shadcn/ui

## الحسابات التجريبية | Comptes démo | Demo accounts

| Role  | Email                  | Password    |
|-------|------------------------|-------------|
| ADMIN | admin@mokhtargym.dz    | Admin@2026  |
| CLIENT| client@mokhtargym.dz   | Client@2026 |

## المتطلبات

- Bun (runtime + package manager)
- Node.js 18+ (لبعض الأدوات)

## التثبيت والتشغيل

```bash
bun install               # تثبيت الحزم
bun run db:push           # إنشاء قاعدة البيانات (SQLite)
bun run db:generate       # توليد Prisma Client
bun prisma/seed.ts        # تعبئة البيانات التجريبية
bun run dev               # الخادم على المنفذ 3000
```

## الفحص

```bash
bun run lint              # ESLint
bun run db:reset          # إعادة تعيين قاعدة البيانات
```

## البنية

```
prisma/schema.prisma      # 25+ نموذجاً (مستخدمون، عضويات، مدفوعات، حضور...)
prisma/seed.ts            # بيانات تجريبية واقعية
src/app/(auth)/           # دخول، تسجيل، استعادة كلمة المرور
src/app/onboarding/       # إكمال الملف الشخصي (خطوتان)
src/app/client/           # تطبيق العميل (16 صفحة، mobile-first)
src/app/admin/            # لوحة الأدمن (17 صفحة، desktop-first)
src/server-actions/       # Server Actions (auth, client, admin×3)
src/i18n/                 # عربي/فرنسي/إنجليزي + RTL
src/lib/                  # المصادقة، الجلسات (JWT)، قواعد العمل
src/components/           # brand / client / admin / ui (shadcn)
src/middleware.ts         # حماية المسارات حسب الدور (server-side)
```

## متغيرات البيئة

انسخ `.env.example` إلى `.env`. الإلزامي للإنتاج: `AUTH_SECRET` (توليد: `openssl rand -hex 32`).
اختياري: مفاتيح OAuth (Google/Facebook)، SMTP لإرسال روابط الاستعادة بريدياً.
بدون SMTP يعمل استرداد كلمة المرور عبر رابط يُعرض في شاشة التأكيد (وضع التطوير).

## الأمان

- كلمات المرور: scrypt + salt (Node crypto)
- الجلسات: JWT (jose) في httpOnly cookie لمدة 7 أيام
- الحماية: middleware يفرض الدور على المسارات /admin و /client
- الصلاحيات: التحقق من الدور والملكية في كل Server Action
- QR: رمز عشوائي مستقل بلا بيانات شخصية، قابل لإعادة التوليد
- سجل تدقيق (AuditLog) لكل إجراءات الأدمن الحساسة

## النشر

يعمل كتطبيق Next.js قياسي:

```bash
bun run build
bun run start
```

- قاعدة بيانات SQLite للملف الواحد — يمكن ترقية `provider` في `schema.prisma` إلى PostgreSQL/MySQL للإنتاج دون تغيير الكود.
- عيّن `AUTH_SECRET` وأسرار OAuth وSMTP في بيئة الإنتاج.
