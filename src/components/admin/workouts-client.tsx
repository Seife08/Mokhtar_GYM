"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Dumbbell, Archive, UserPlus, ChevronRight, Search } from "lucide-react";
import { useI18n } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { EmptyState } from "@/components/client/ui";
import { StatusBadge } from "@/components/brand/status-badge";
import { saveProgramAction, archiveProgramAction, assignWorkoutAction } from "@/server-actions/admin-workouts";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandTabs, BrandTabContent } from "@/components/brand/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Program {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  difficulty: string;
  goal: string | null;
  status: string;
  daysCount: number;
  totalExercises: number;
  days: {
    id: string;
    nameEn: string;
    nameAr: string;
    nameFr: string;
    dayIndex: number;
    exerciseCount: number;
    estMinutes: number;
  }[];
  assignedCount: number;
}

interface Assignment {
  id: string;
  memberId: string;
  memberName: string;
  programNameAr: string;
  programNameFr: string;
  programNameEn: string;
  startDate: string;
}

export function WorkoutsAdminClient({
  programs,
  assignments,
  clients,
  openAssign,
}: {
  programs: Program[];
  assignments: Assignment[];
  clients: { id: string; name: string }[];
  openAssign: boolean;
}) {
  const { t, pick, fmtDate } = useI18n();
  const router = useRouter();
  const [programOpen, setProgramOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(openAssign);
  const [programState, programFormAction, programPending] = useMgAction(saveProgramAction, {
    onSuccess: () => {
      setProgramOpen(false);
      toast.success(t("admin.programSaved"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const [assignState, assignFormAction, assignPending] = useMgAction(assignWorkoutAction, {
    onSuccess: () => {
      setAssignOpen(false);
      toast.success(t("admin.programAssigned"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const [memberQuery, setMemberQuery] = useState("");

  const toggleArchive = async (p: Program) => {
    const res = await archiveProgramAction(p.id, p.status === "ACTIVE");
    if (res.ok) {
      toast.success(t("admin.programArchived"));
      router.refresh();
    }
  };

  const filteredClients = memberQuery
    ? clients.filter((c) => c.name.toLowerCase().includes(memberQuery.toLowerCase())).slice(0, 8)
    : clients.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
          {t("admin.workouts")}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setAssignOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg border border-neutral-700 px-4 text-[12.5px] font-bold text-neutral-200 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <UserPlus className="h-4.5 w-4.5" />
            {t("admin.assignWorkout")}
          </button>
          <button
            onClick={() => setProgramOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95"
          >
            <Plus className="h-4.5 w-4.5" />
            {t("admin.createProgram")}
          </button>
        </div>
      </div>

      <p className="text-[12px] text-neutral-600">{t("admin.programDaysHint")}</p>

      <BrandTabs
        defaultValue="programs"
        className="w-full"
        items={[
          { value: "programs", label: t("admin.workoutPrograms"), badge: programs.length },
          { value: "assignments", label: t("admin.clientWorkouts"), badge: assignments.length },
        ]}
      >

        {/* programs */}
        <BrandTabContent value="programs" className="mt-4">
          {programs.length === 0 ? (
            <EmptyState icon={Dumbbell} title={t("admin.noPrograms")} desc={t("admin.noProgramsDesc")} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {programs.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "surface-card card-sheen rounded-2xl p-4",
                    p.status === "ARCHIVED" && "opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/admin/workouts/${p.id}`} className="min-w-0 group">
                      <h3 className="font-display truncate text-[15px] font-black text-neutral-50 group-hover:text-primary">
                        {pick({ nameAr: p.nameAr, nameFr: p.nameFr, nameEn: p.nameEn })}
                      </h3>
                    </Link>
                    <StatusBadge tone={p.status === "ACTIVE" ? "active" : "inactive"} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-md bg-[#151515] px-2 py-0.5 text-[10px] font-bold text-neutral-400">
                      {p.difficulty}
                    </span>
                    <span className="text-[11px] text-neutral-600">
                      {p.daysCount} {t("workout.days")} · {p.totalExercises} {t("admin.exercisesCount", { n: "" })}
                    </span>
                  </div>

                  {/* day chips */}
                  <div className="mt-3 space-y-1.5">
                    {p.days.slice(0, 4).map((d) => (
                      <Link
                        key={d.id}
                        href={`/admin/workouts/${p.id}#day-${d.id}`}
                        className="flex items-center justify-between rounded-lg bg-[#121212] px-3 py-2 text-[12px] text-neutral-300 transition-colors hover:bg-[#181818] hover:text-primary"
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#1a1a1a] text-[9px] font-black text-primary">
                            {d.dayIndex + 1}
                          </span>
                          <span className="truncate">
                            {pick({ nameAr: d.nameAr, nameFr: d.nameFr, nameEn: d.nameEn })}
                          </span>
                        </span>
                        <span className="text-[10px] text-neutral-600">{d.exerciseCount}</span>
                      </Link>
                    ))}
                    {p.days.length > 4 && (
                      <Link href={`/admin/workouts/${p.id}`} className="block text-[11px] font-bold text-primary hover:underline">
                        +{p.days.length - 4} {t("workout.days")}
                      </Link>
                    )}
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-[#1c1c1c] pt-3">
                    <span className="text-[10.5px] text-neutral-600">
                      {t("admin.planInUse", { n: p.assignedCount })}
                    </span>
                    <button
                      onClick={() => toggleArchive(p)}
                      className="flex items-center gap-1 rounded-lg border border-neutral-700 px-2.5 py-1 text-[10px] font-bold text-neutral-400 transition-colors hover:border-danger/40 hover:text-danger"
                    >
                      <Archive className="h-3 w-3" />
                      {t("admin.archive")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BrandTabContent>

        {/* assignments */}
        <BrandTabContent value="assignments" className="mt-4">
          <div className="surface-card divide-y divide-[#161616] rounded-2xl">
            {assignments.length === 0 && (
              <p className="py-12 text-center text-[13px] text-neutral-600">{t("admin.noPrograms")}</p>
            )}
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Link
                    href={`/admin/members/${a.memberId}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-[12px] font-black text-primary"
                  >
                    {a.memberName.charAt(0)}
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/admin/members/${a.memberId}`} className="text-[13.5px] font-bold text-neutral-100 hover:text-primary">
                      {a.memberName}
                    </Link>
                    <p className="truncate text-[11.5px] text-neutral-500">
                      {pick({ nameAr: a.programNameAr, nameFr: a.programNameFr, nameEn: a.programNameEn })} ·{" "}
                      {fmtDate(a.startDate)}
                    </p>
                  </div>
                </div>
                <StatusBadge tone="active" />
              </div>
            ))}
          </div>
        </BrandTabContent>
      </BrandTabs>

      {/* ===== new program dialog ===== */}
      <Dialog open={programOpen} onOpenChange={setProgramOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.createProgram")}
            </DialogTitle>
          </DialogHeader>
          <form action={programFormAction} className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <Field id="wp-en" name="nameEn" label={t("admin.nameEn")} required />
              <Field id="wp-ar" name="nameAr" label={t("admin.nameAr")} required dir="rtl" />
              <Field id="wp-fr" name="nameFr" label={t("admin.nameFr")} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="wp-goal" name="goal" label={t("admin.goal")}>
                <select id="wp-goal" name="goal" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                  <option value="muscle">{t("enum.muscle")}</option>
                  <option value="strength">{t("enum.strength")}</option>
                  <option value="fatloss">{t("enum.fatloss")}</option>
                  <option value="fitness">{t("enum.fitness")}</option>
                </select>
              </Field>
              <Field id="wp-diff" name="difficulty" label={t("admin.difficulty")}>
                <select id="wp-diff" name="difficulty" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                  <option value="BEGINNER">{t("enum.beginner")}</option>
                  <option value="INTERMEDIATE">{t("enum.intermediate")}</option>
                  <option value="ADVANCED">{t("enum.advanced")}</option>
                </select>
              </Field>
            </div>
            <Field id="wp-desc" name="description" label={t("common.description")} />
            <SubmitButton pending={programPending}>{t("common.create")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== assign dialog ===== */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.assignWorkout")}
            </DialogTitle>
          </DialogHeader>
          <form action={assignFormAction} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-neutral-300">{t("admin.selectMember")}</label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder={t("common.search")}
                  className="input-premium h-11 w-full rounded-lg ps-10 pe-4 text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                />
              </div>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-[#262626]">
                {filteredClients.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2.5 border-b border-[#1a1a1a] p-2.5 text-[13px] last:border-0 hover:bg-primary/5">
                    <input type="radio" name="userId" value={c.id} required className="accent-[#F5C400]" />
                    <span className="flex-1 truncate font-semibold text-neutral-200">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Field id="wa-program" name="programId" label={t("workout.program")}>
              <select id="wa-program" name="programId" required className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                <option value="">—</option>
                {programs
                  .filter((p) => p.status === "ACTIVE")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn} · {p.daysCount}d
                    </option>
                  ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="wa-start" name="startDate" type="date" label={t("membership.startDate")} required />
              <Field id="wa-end" name="endDate" type="date" label={`${t("membership.expirationDate")} (${t("common.optional")})`} />
            </div>
            {assignState && !assignState.ok && (
              <p className="text-xs text-danger">{t(assignState.error as never)}</p>
            )}
            <SubmitButton pending={assignPending}>{t("common.confirm")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
