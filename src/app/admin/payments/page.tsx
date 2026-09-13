import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PaymentsClient } from "@/components/admin/payments-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; member?: string; new?: string; range?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { page, member, new: isNew, range } = await searchParams;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysAgo30 = new Date(todayStart.getTime() - 29 * 86400000);

  const where: Record<string, unknown> = {};
  if (range === "today") where.paidAt = { gte: todayStart };
  else if (range === "month") where.paidAt = { gte: monthStart };
  else if (range === "30") where.paidAt = { gte: daysAgo30 };
  if (member) where.userId = member;

  const all = await db.payment.findMany({
    where,
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { paidAt: "desc" },
  });

  const pageNum = Math.max(1, Number(page) || 1);
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const pageItems = all.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

  // method breakdown (all time this filter)
  const methodTotals: Record<string, number> = {};
  for (const p of all) {
    methodTotals[p.method] = (methodTotals[p.method] ?? 0) + p.amount;
  }

  const [todayRevenue, monthRevenue, clients] = await Promise.all([
    db.payment.aggregate({ where: { status: "PAID", paidAt: { gte: todayStart } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.user.findMany({
      where: { role: "CLIENT", status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, memberships: { where: { status: "ACTIVE" }, select: { id: true, plan: { select: { nameEn: true } } } } },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <PaymentsClient
      payments={pageItems.map((p) => ({
        id: p.id,
        memberId: p.user.id,
        memberName: `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim(),
        amount: p.amount,
        method: p.method,
        status: p.status,
        paidAt: p.paidAt.toISOString(),
        reference: p.reference,
      }))}
      pageCount={pageCount}
      pageNum={pageNum}
      totalCount={all.length}
      stats={{
        todayRevenue: todayRevenue._sum.amount ?? 0,
        monthRevenue: monthRevenue._sum.amount ?? 0,
        avg: all.length > 0 ? Math.round(all.reduce((s, p) => s + p.amount, 0) / all.length) : 0,
      }}
      methodTotals={methodTotals}
      clients={clients.map((c) => ({
        id: c.id,
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
        membershipId: c.memberships[0]?.id ?? null,
        planName: c.memberships[0]?.plan.nameEn ?? null,
      }))}
      openNew={isNew === "1"}
      presetMember={member ?? null}
      range={range ?? "all"}
    />
  );
}
