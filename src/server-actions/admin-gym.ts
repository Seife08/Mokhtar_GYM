"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import type { ActionResult } from "@/server-actions/auth";

/* ================= GYM OPENING HOURS =================
   Structured weekly schedule per section (men/women).
   Slots are minutes-from-midnight; the schema guarantees
   unique (gender, dayOfWeek) so saves are clean upserts. */

const slotSchema = z
  .object({
    startMin: z.number().int().min(0).max(1439),
    endMin: z.number().int().min(1).max(1440),
    label: z.string().trim().max(60).optional().nullable(),
  })
  .refine((s) => s.endMin > s.startMin, {
    message: "hours.slotOrder",
  });

const saveSchema = z.object({
  gender: z.enum(["MALE", "FEMALE"]),
  dayOfWeek: z.number().int().min(1).max(7),
  isOpen: z.boolean(),
  note: z.string().trim().max(160).optional().nullable(),
  slots: z.array(slotSchema).max(4),
});

/** Reject overlapping slots — sorted sweep over intervals. */
function assertNoOverlap(slots: { startMin: number; endMin: number }[]) {
  const sorted = [...slots].sort((a, b) => a.startMin - b.startMin);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMin < sorted[i - 1].endMin) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["slots", i],
          message: "hours.overlap",
        },
      ]);
    }
  }
}

export async function saveScheduleAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    let slots: { startMin: number; endMin: number; label?: string | null }[] = [];
    const rawSlots = String(formData.get("slots") ?? "[]");
    if (rawSlots && rawSlots !== "[]") {
      const parsed = z.array(z.any()).parse(JSON.parse(rawSlots));
      slots = parsed.map((s: { startMin?: unknown; endMin?: unknown; label?: unknown }) => ({
        startMin: Math.round(Number(s.startMin)),
        endMin: Math.round(Number(s.endMin)),
        label: typeof s.label === "string" && s.label.trim() ? s.label.trim().slice(0, 60) : null,
      }));
    }

    const data = saveSchema.parse({
      gender: String(formData.get("gender")),
      dayOfWeek: Number(formData.get("dayOfWeek")),
      isOpen: String(formData.get("isOpen")) === "true",
      note: (formData.get("note") as string) || null,
      slots,
    });

    if (data.isOpen && data.slots.length === 0) {
      return { ok: false, error: "hours.needSlot" };
    }
    if (data.isOpen) assertNoOverlap(data.slots);

    await db.$transaction(async (tx) => {
      const existing = await tx.gymSchedule.findUnique({
        where: { gender_dayOfWeek: { gender: data.gender, dayOfWeek: data.dayOfWeek } },
      });
      if (existing) {
        await tx.gymSlot.deleteMany({ where: { scheduleId: existing.id } });
        await tx.gymSchedule.update({
          where: { id: existing.id },
          data: {
            isOpen: data.isOpen,
            note: data.note,
            slots: {
              create: data.slots.map((s, i) => ({
                startMin: s.startMin,
                endMin: s.endMin,
                label: s.label ?? null,
                order: i,
              })),
            },
          },
        });
      } else {
        await tx.gymSchedule.create({
          data: {
            gender: data.gender,
            dayOfWeek: data.dayOfWeek,
            isOpen: data.isOpen,
            note: data.note,
            slots: {
              create: data.slots.map((s, i) => ({
                startMin: s.startMin,
                endMin: s.endMin,
                label: s.label ?? null,
                order: i,
              })),
            },
          },
        });
      }
    });

    revalidatePath("/admin/gym-hours");
    revalidatePath("/client/gym-info");
    revalidatePath("/client");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    console.error("saveSchedule error", e);
    return { ok: false, error: "validation.serverError" };
  }
}

/** Copy one day's slots+note to other days of the same section. */
export async function copyDayAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const gender = z.enum(["MALE", "FEMALE"]).parse(String(formData.get("gender")));
    const fromDay = z.number().int().min(1).max(7).parse(Number(formData.get("fromDay")));
    const toDays = z
      .array(z.number().int().min(1).max(7))
      .min(1)
      .parse(JSON.parse(String(formData.get("toDays") ?? "[]")));

    const source = await db.gymSchedule.findUnique({
      where: { gender_dayOfWeek: { gender, dayOfWeek: fromDay } },
      include: { slots: true },
    });
    if (!source) return { ok: false, error: "hours.noSourceDay" };

    await db.$transaction(async (tx) => {
      for (const day of toDays) {
        if (day === fromDay) continue;
        const existing = await tx.gymSchedule.findUnique({
          where: { gender_dayOfWeek: { gender, dayOfWeek: day } },
        });
        if (existing) {
          await tx.gymSlot.deleteMany({ where: { scheduleId: existing.id } });
          await tx.gymSchedule.update({
            where: { id: existing.id },
            data: {
              isOpen: source.isOpen,
              note: source.note,
              slots: {
                create: source.slots.map((s, i) => ({
                  startMin: s.startMin,
                  endMin: s.endMin,
                  label: s.label,
                  order: i,
                })),
              },
            },
          });
        } else {
          await tx.gymSchedule.create({
            data: {
              gender,
              dayOfWeek: day,
              isOpen: source.isOpen,
              note: source.note,
              slots: {
                create: source.slots.map((s, i) => ({
                  startMin: s.startMin,
                  endMin: s.endMin,
                  label: s.label,
                  order: i,
                })),
              },
            },
          });
        }
      }
    });

    revalidatePath("/admin/gym-hours");
    revalidatePath("/client/gym-info");
    revalidatePath("/client");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    console.error("copyDay error", e);
    return { ok: false, error: "validation.serverError" };
  }
}
