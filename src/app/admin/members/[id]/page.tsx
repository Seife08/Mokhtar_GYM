import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { membershipStatus, daysRemaining, membershipProgress } from "@/lib/membership";
import { MemberDetailClient } from "@/components/admin/member-detail-client";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { id } = await params;
  const { tab } = await searchParams;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      memberships: { include: { plan: true }, orderBy: { startDate: "desc" } },
      payments: { orderBy: { paidAt: "desc" } },
      attendances: { orderBy: { checkInAt: "desc" }, take: 40 },
      clientWorkouts: {
        where: { status: "ACTIVE" },
        include: { program: { include: { days: { orderBy: { dayIndex: "asc" } } } } },
      },
      clientDiets: {
        where: { endDate: null },
        include: { dietPlan: { include: { meals: { orderBy: { orderIndex: "asc" } } } } },
        take: 1,
      },
      progressEntries: { orderBy: { date: "desc" }, take: 12 },
      bookings: {
        include: { fitnessClass: true },
        orderBy: { fitnessClass: { date: "desc" } },
        take: 15,
      },
    },
  });
  if (!user || user.role !== "CLIENT") notFound();

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const expDays = settings?.expiringSoonDays ?? 7;
  const current = user.memberships[0];
  const currentStatus = current ? membershipStatus(current, expDays, 0) : "NONE";

  return (
    <MemberDetailClient
      member={{
        id: user.id,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        gender: user.gender,
        dob: user.dob?.toISOString() ?? null,
        accountStatus: user.status,
        createdAt: user.createdAt.toISOString(),
        membershipStatus: currentStatus,
        plan: current
          ? {
              nameAr: current.plan.nameAr,
              nameFr: current.plan.nameFr,
              nameEn: current.plan.nameEn,
              startDate: current.startDate.toISOString(),
              endDate: current.endDate.toISOString(),
              pricePaid: current.pricePaid,
              remainingDays: daysRemaining(current),
              progress: membershipProgress(current),
              paused: current.status === "PAUSED",
            }
          : null,
        totalVisits: user.attendances.length,
        lastVisit: user.attendances[0]?.checkInAt?.toISOString() ?? null,
      }}
      memberships={user.memberships.map((m) => ({
        id: m.id,
        planNameAr: m.plan.nameAr,
        planNameFr: m.plan.nameFr,
        planNameEn: m.plan.nameEn,
        startDate: m.startDate.toISOString(),
        endDate: m.endDate.toISOString(),
        pricePaid: m.pricePaid,
        status: membershipStatus(m, expDays, 0),
        paused: m.status === "PAUSED",
      }))}
      payments={user.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        paidAt: p.paidAt.toISOString(),
        reference: p.reference,
      }))}
      attendances={user.attendances.map((a) => ({
        id: a.id,
        checkInAt: a.checkInAt.toISOString(),
        checkOutAt: a.checkOutAt?.toISOString() ?? null,
        method: a.method,
      }))}
      workouts={user.clientWorkouts.map((cw) => ({
        id: cw.id,
        programNameAr: cw.program.nameAr,
        programNameFr: cw.program.nameFr,
        programNameEn: cw.program.nameEn,
        startDate: cw.startDate.toISOString(),
        daysCount: cw.program.days.length,
        days: cw.program.days.map((d) => ({
          id: d.id,
          nameAr: d.nameAr,
          nameFr: d.nameFr,
          nameEn: d.nameEn,
        })),
      }))}
      diet={
        user.clientDiets[0]
          ? {
              nameAr: user.clientDiets[0].dietPlan.nameAr,
              nameFr: user.clientDiets[0].dietPlan.nameFr,
              nameEn: user.clientDiets[0].dietPlan.nameEn,
              totalCalories: user.clientDiets[0].dietPlan.totalCalories,
              meals: user.clientDiets[0].dietPlan.meals.map((m) => ({
                id: m.id,
                type: m.type,
                foods: m.foods,
                calories: m.calories,
              })),
            }
          : null
      }
      progress={user.progressEntries.map((e) => ({
        id: e.id,
        date: e.date.toISOString(),
        weight: e.weight,
        chest: e.chest,
        waist: e.waist,
        arms: e.arms,
        bodyFat: e.bodyFat,
      }))}
      bookings={user.bookings.map((b) => ({
        id: b.id,
        nameAr: b.fitnessClass.nameAr,
        nameFr: b.fitnessClass.nameFr,
        nameEn: b.fitnessClass.nameEn,
        date: b.fitnessClass.date.toISOString(),
        status: b.status,
      }))}
      plans={(await db.membershipPlan.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } })).map(
        (p) => ({ id: p.id, nameAr: p.nameAr, nameFr: p.nameFr, nameEn: p.nameEn, price: p.price, durationDays: p.durationDays })
      )}
      activeTab={tab ?? "overview"}
    />
  );
}
