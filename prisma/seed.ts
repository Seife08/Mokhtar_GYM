/**
 * MOKHTAR GYM — realistic demo seed
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

function daysAgo(n: number, hour = 18, min = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, 0, 0);
  return d;
}
function daysFromNow(n: number, hour = 21): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 59, 59, 0);
  return d;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// realistic Algerian names (fake people)
const FIRST_M = ["Ahmed", "Mohamed", "Yacine", "Karim", "Sofiane", "Riad", "Bilal", "Islam", "Walid", "Zakaria", "Anis", "Redouane", "Hicham", "Mounir", "Tarek", "Adel", "Nabil", "Fouad", "Amine", "Salim", "Imad", "Nasr", "Chaker", "Othmane", "Farouk"];
const FIRST_F = ["Amina", "Fatima", "Sarah", "Lina", "Nour", "Imene", "Amel", "Rania", "Sofia", "Meriem", "Yasmine", "Kahina", "Chahinez", "Wafa", "Nesrine", "Hadjer"];
const LAST = ["Benali", "Boumediene", "Hamdi", "Khelifi", "Mansouri", "Belkacem", "Zerrouki", "Guerroudj", "Taleb", "Meziane", "Boudiaf", "Cherif", "Amrani", "Djebbar", "Ferhat", "Sahnoun", "Yahiaoui", "Rahmani", "Brahimi", "Lounis", "Sadouni", "Hammoudi", "Bouzid", "Touati", "Slimani", "Merabet", "Kaci", "Zidane", "Ouali", "Benyahia"];

async function main() {
  console.log("⏳ Seeding MOKHTAR GYM demo data...");

  // wipe
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.notification.deleteMany(),
    db.booking.deleteMany(),
    db.fitnessClass.deleteMany(),
    db.progressPhoto.deleteMany(),
    db.progressEntry.deleteMany(),
    db.clientDiet.deleteMany(),
    db.meal.deleteMany(),
    db.dietPlan.deleteMany(),
    db.workoutLog.deleteMany(),
    db.clientWorkout.deleteMany(),
    db.workoutExercise.deleteMany(),
    db.exercise.deleteMany(),
    db.workoutDay.deleteMany(),
    db.workoutProgram.deleteMany(),
    db.payment.deleteMany(),
    db.attendance.deleteMany(),
    db.membership.deleteMany(),
    db.offer.deleteMany(),
    db.announcement.deleteMany(),
    db.membershipPlan.deleteMany(),
    db.user.deleteMany(),
    db.gymSettings.deleteMany(),
  ]);

  // ===== GYM SETTINGS =====
  await db.gymSettings.create({
    data: {
      id: "main",
      gymName: "MOKHTAR GYM",
      phone: "+213 555 01 02 03",
      whatsapp: "+213 555 01 02 03",
      address: "12 Rue des Frères Bouadou, Bir Mourad Raïs, Alger",
      mapsUrl: "https://maps.google.com/?q=Alger",
      hours: "Dim–Jeu 07:00–22:00 · Ven 08:00–18:00 · Sam 09:00–20:00",
      facebook: "https://facebook.com/mokhtargym",
      instagram: "https://instagram.com/mokhtargym",
      tiktok: "https://tiktok.com/@mokhtargym",
      defaultLang: "ar",
      currency: "DZD",
      setupCompleted: true,
      expiringSoonDays: 7,
      gracePeriodDays: 0,
      doubleCheckinMins: 120,
      cancelWindowHours: 2,
      timezone: "Africa/Algiers",
    },
  });

  // ===== PLANS =====
  const plansData = [
    { nameEn: "1 MONTH", nameAr: "شهر واحد", nameFr: "1 MOIS", descriptionEn: "One month full access", descriptionAr: "شهر واحد وصول كامل", descriptionFr: "Un mois d'accès complet", durationDays: 30, price: 2500, sortOrder: 1, features: "Full gym access\nLocker room\nFree weights zone\nCardio zone" },
    { nameEn: "3 MONTHS", nameAr: "3 أشهر", nameFr: "3 MOIS", descriptionEn: "Three months full access", descriptionAr: "ثلاثة أشهر وصول كامل", descriptionFr: "Trois mois d'accès complet", durationDays: 90, price: 6500, sortOrder: 2, features: "Full gym access\nLocker room\n1 group class / week\nBody assessment" },
    { nameEn: "6 MONTHS", nameAr: "6 أشهر", nameFr: "6 MOIS", descriptionEn: "Six months full access", descriptionAr: "ستة أشهر وصول كامل", descriptionFr: "Six mois d'accès complet", durationDays: 180, price: 11000, sortOrder: 3, features: "Full gym access\nLocker + towel service\n3 group classes / week\nPersonalized program\nBody assessment" },
    { nameEn: "12 MONTHS", nameAr: "12 شهراً", nameFr: "12 MOIS", descriptionEn: "Full year, best value", descriptionAr: "سنة كاملة، أفضل قيمة", descriptionFr: "Année complète, meilleur tarif", durationDays: 365, price: 18000, sortOrder: 4, features: "Full gym access\nLocker + towel service\nUnlimited group classes\nPersonalized program\nQuarterly body assessment\nGuest pass × 4" },
    { nameEn: "DAY PASS", nameAr: "تذكرة يوم", nameFr: "JOURNALIER", descriptionEn: "Single day access", descriptionAr: "وصول ليوم واحد", descriptionFr: "Accès une journée", durationDays: 1, price: 400, sortOrder: 5, features: "Full gym access\nLocker room" },
  ];
  const plans: Record<string, { id: string; price: number; durationDays: number }> = {};
  for (const p of plansData) {
    const created = await db.membershipPlan.create({ data: p });
    plans[p.nameEn] = { id: created.id, price: created.price, durationDays: created.durationDays };
  }

  // ===== USERS =====
  const adminHash = hashPassword("Admin@2026");
  const clientHash = hashPassword("Client@2026");

  const admin = await db.user.create({
    data: {
      email: "admin@mokhtargym.dz",
      passwordHash: adminHash,
      role: "ADMIN",
      firstName: "Mokhtar",
      lastName: "Admin",
      phone: "+213 555 01 02 03",
      language: "ar",
      onboarding: true,
    },
  });

  // demo client — rich data
  const demoClient = await db.user.create({
    data: {
      email: "client@mokhtargym.dz",
      passwordHash: clientHash,
      role: "CLIENT",
      firstName: "Ahmed",
      lastName: "Benali",
      phone: "+213 661 23 45 67",
      dob: new Date("1998-04-14"),
      gender: "male",
      language: "ar",
      onboarding: true,
    },
  });

  // membership history for demo client: 1 month (paid), then 3 months active expiring in 23 days
  const m1Start = daysAgo(113);
  const m1 = await db.membership.create({
    data: {
      userId: demoClient.id,
      planId: plans["1 MONTH"].id,
      startDate: m1Start,
      endDate: addDays(m1Start, 30),
      pricePaid: 2500,
      status: "ACTIVE",
      createdById: admin.id,
    },
  });
  await db.payment.create({
    data: { userId: demoClient.id, membershipId: m1.id, amount: 2500, method: "CASH", status: "PAID", reference: "MG-0001", paidAt: m1Start, recordedById: admin.id },
  });
  const m2Start = daysAgo(67);
  const m2 = await db.membership.create({
    data: {
      userId: demoClient.id,
      planId: plans["3 MONTHS"].id,
      startDate: m2Start,
      endDate: daysFromNow(23),
      pricePaid: 6500,
      status: "ACTIVE",
      createdById: admin.id,
    },
  });
  await db.payment.create({
    data: { userId: demoClient.id, membershipId: m2.id, amount: 6500, method: "CCP", status: "PAID", reference: "MG-0002", paidAt: m2Start, recordedById: admin.id },
  });
  await db.membership.update({ where: { id: m1.id }, data: { status: "EXPIRED" } });

  // demo client attendance: visits ~4x/week over 60 days + recent streak
  const visitDays = new Set<number>();
  for (let i = 60; i >= 1; i--) {
    if (Math.random() < 0.55) visitDays.add(i);
  }
  for (let i = 6; i >= 1; i--) visitDays.add(i); // current streak
  for (const d of visitDays) {
    const checkIn = daysAgo(d, rand(8, 20), rand(0, 59));
    const out = new Date(checkIn);
    out.setMinutes(out.getMinutes() + rand(50, 110));
    await db.attendance.create({
      data: { userId: demoClient.id, checkInAt: checkIn, checkOutAt: out, method: pick(["QR", "QR", "QR", "MANUAL"]) },
    });
  }

  // demo client progress entries
  const weights = [82.4, 81.6, 81.0, 80.2, 79.7, 79.1, 78.3, 77.6, 77.0, 76.5];
  for (let i = 0; i < weights.length; i++) {
    await db.progressEntry.create({
      data: {
        userId: demoClient.id,
        date: daysAgo(270 - i * 30),
        weight: weights[i],
        height: 178,
        chest: 104 - i * 0.4,
        waist: 92 - i * 0.7,
        arms: 36 + i * 0.15,
        thighs: 60 - i * 0.2,
        bodyFat: 24 - i * 0.7,
        notes: i === weights.length - 1 ? "Feeling stronger, energy is up" : null,
      },
    });
  }

  // ===== 28 more clients =====
  const methods = ["CASH", "CASH", "CASH", "CCP", "CCP", "BARIDIMOB", "BANK", "ONLINE"];
  const created: { id: string; firstName: string; membershipId?: string }[] = [];
  for (let i = 0; i < 28; i++) {
    const isF = Math.random() < 0.4;
    const first = isF ? pick(FIRST_F) : pick(FIRST_M);
    const last = pick(LAST);
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@gmail.com`;
    const phone = `+213 6${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
    const lang = pick(["ar", "ar", "ar", "fr", "fr", "en"]);

    const u = await db.user.create({
      data: {
        email,
        passwordHash: clientHash,
        role: "CLIENT",
        firstName: first,
        lastName: last,
        phone,
        dob: new Date(rand(1990, 2007), rand(0, 11), rand(1, 28)),
        gender: isF ? "female" : "male",
        language: lang,
        onboarding: true,
        status: "ACTIVE",
      },
    });
    created.push({ id: u.id, firstName: first, membershipId: undefined });

    // membership variety
    const roll = Math.random();
    if (roll < 0.62) {
      // active
      const planKey = pick(["1 MONTH", "1 MONTH", "3 MONTHS", "3 MONTHS", "6 MONTHS", "12 MONTHS"]);
      const plan = plans[planKey];
      const start = daysAgo(rand(3, plan.durationDays - 5));
      const m = await db.membership.create({
        data: {
          userId: u.id, planId: plan.id, startDate: start,
          endDate: addDays(start, plan.durationDays),
          pricePaid: plan.price, status: "ACTIVE", createdById: admin.id,
        },
      });
      created[i].membershipId = m.id;
      await db.payment.create({
        data: { userId: u.id, membershipId: m.id, amount: plan.price, method: pick(methods), status: "PAID", reference: `MG-${1000 + i}`, paidAt: start, recordedById: admin.id },
      });
    } else if (roll < 0.75) {
      // expiring soon
      const plan = plans["1 MONTH"];
      const start = daysAgo(26);
      const m = await db.membership.create({
        data: { userId: u.id, planId: plan.id, startDate: start, endDate: daysFromNow(rand(1, 6)), pricePaid: plan.price, status: "ACTIVE", createdById: admin.id },
      });
      created[i].membershipId = m.id;
      await db.payment.create({
        data: { userId: u.id, membershipId: m.id, amount: plan.price, method: pick(methods), status: "PAID", reference: `MG-${1000 + i}`, paidAt: start, recordedById: admin.id },
      });
    } else if (roll < 0.88) {
      // expired
      const planKey = pick(["1 MONTH", "3 MONTHS"]);
      const plan = plans[planKey];
      const start = daysAgo(plan.durationDays + rand(5, 60));
      const m = await db.membership.create({
        data: { userId: u.id, planId: plan.id, startDate: start, endDate: addDays(start, plan.durationDays), pricePaid: plan.price, status: "EXPIRED", createdById: admin.id },
      });
      await db.payment.create({
        data: { userId: u.id, membershipId: m.id, amount: plan.price, method: pick(methods), status: "PAID", reference: `MG-${1000 + i}`, paidAt: start, recordedById: admin.id },
      });
    } else if (roll < 0.93) {
      // paused
      const plan = plans["3 MONTHS"];
      const start = daysAgo(40);
      const m = await db.membership.create({
        data: { userId: u.id, planId: plan.id, startDate: start, endDate: addDays(start, 90), pricePaid: plan.price, status: "PAUSED", pausedAt: daysAgo(10), createdById: admin.id },
      });
      created[i].membershipId = m.id;
    } else {
      // inactive account, no membership
      await db.user.update({ where: { id: u.id }, data: { status: "INACTIVE" } });
    }

    // attendance for this client
    const visitsCount = rand(0, 30);
    for (let v = 0; v < visitsCount; v++) {
      const checkIn = daysAgo(rand(0, 55), rand(8, 21), rand(0, 59));
      const out = new Date(checkIn);
      out.setMinutes(out.getMinutes() + rand(45, 120));
      await db.attendance.create({
        data: { userId: u.id, checkInAt: checkIn, checkOutAt: out, method: pick(["QR", "QR", "MANUAL"]) },
      });
    }
  }

  // ===== some payments today (revenue today > 0) =====
  for (let i = 0; i < 4; i++) {
    const c = pick(created);
    const planKey = pick(["DAY PASS", "1 MONTH", "1 MONTH"]);
    await db.payment.create({
      data: {
        userId: c.id, amount: plans[planKey].price, method: pick(methods),
        status: "PAID", reference: `MG-TD-${i}`, paidAt: daysAgo(0, rand(9, 17), rand(0, 59)), recordedById: admin.id,
      },
    });
  }

  // ===== EXERCISES =====
  const exDefs: { en: string; ar: string; fr: string; mg: string; eq: string; diff: string }[] = [
    { en: "Bench Press", ar: "بنش برس", fr: "Développé couché", mg: "chest", eq: "Barbell", diff: "INTERMEDIATE" },
    { en: "Incline Dumbbell Press", ar: "بنش مائل بالدمبل", fr: "Développé incliné haltères", mg: "chest", eq: "Dumbbells", diff: "INTERMEDIATE" },
    { en: "Cable Fly", ar: "تفتيح كيبل", fr: "Écarté à la poulie", mg: "chest", eq: "Cable", diff: "BEGINNER" },
    { en: "Push-ups", ar: "تمرين الضغط", fr: "Pompes", mg: "chest", eq: "Bodyweight", diff: "BEGINNER" },
    { en: "Pull-up", ar: "عقلة", fr: "Traction", mg: "back", eq: "Bar", diff: "ADVANCED" },
    { en: "Lat Pulldown", ar: "سحب أمامي", fr: "Tirage vertical", mg: "back", eq: "Cable", diff: "BEGINNER" },
    { en: "Barbell Row", ar: "تجديف بالبار", fr: "Rowing barre", mg: "back", eq: "Barbell", diff: "INTERMEDIATE" },
    { en: "Deadlift", ar: "رفعة ميتة", fr: "Soulevé de terre", mg: "back", eq: "Barbell", diff: "ADVANCED" },
    { en: "Overhead Press", ar: "ضغط فوق الرأس", fr: "Développé militaire", mg: "shoulders", eq: "Barbell", diff: "INTERMEDIATE" },
    { en: "Lateral Raise", ar: "رفرفة جانبية", fr: "Élévations latérales", mg: "shoulders", eq: "Dumbbells", diff: "BEGINNER" },
    { en: "Barbell Curl", ar: "بايسبس بالبار", fr: "Curl barre", mg: "biceps", eq: "Barbell", diff: "BEGINNER" },
    { en: "Hammer Curl", ar: "مطرقة بالدمبل", fr: "Curl marteau", mg: "biceps", eq: "Dumbbells", diff: "BEGINNER" },
    { en: "Triceps Pushdown", ar: "دفع ترايسبس", fr: "Extension triceps poulie", mg: "triceps", eq: "Cable", diff: "BEGINNER" },
    { en: "Skull Crusher", ar: "سحق الجمجمة", fr: "Extension au front", mg: "triceps", eq: "Barbell", diff: "INTERMEDIATE" },
    { en: "Squat", ar: "سكوات", fr: "Squat", mg: "legs", eq: "Barbell", diff: "INTERMEDIATE" },
    { en: "Leg Press", ar: "دفع الرجلين", fr: "Presse à cuisses", mg: "legs", eq: "Machine", diff: "BEGINNER" },
    { en: "Romanian Deadlift", ar: "رفعة رومانية", fr: "Soulevé roumain", mg: "legs", eq: "Barbell", diff: "INTERMEDIATE" },
    { en: "Leg Curl", ar: "تجعيد الرجلين", fr: "Leg curl", mg: "legs", eq: "Machine", diff: "BEGINNER" },
    { en: "Hip Thrust", ar: "دفع الورك", fr: "Hip thrust", mg: "glutes", eq: "Barbell", diff: "INTERMEDIATE" },
    { en: "Plank", ar: "بلانك", fr: "Gainage", mg: "abs", eq: "Bodyweight", diff: "BEGINNER" },
    { en: "Cable Crunch", ar: "كرنش كيبل", fr: "Crunch à la poulie", mg: "abs", eq: "Cable", diff: "INTERMEDIATE" },
    { en: "Calf Raise", ar: "رفع السمانة", fr: "Extensions mollets", mg: "calves", eq: "Machine", diff: "BEGINNER" },
    { en: "Treadmill Run", ar: "جري على السير", fr: "Course tapis", mg: "cardio", eq: "Treadmill", diff: "BEGINNER" },
    { en: "Rowing Machine", ar: "آلة التجديف", fr: "Rameur", mg: "cardio", eq: "Machine", diff: "BEGINNER" },
  ];
  const exercises: Record<string, string> = {};
  for (const e of exDefs) {
    const ex = await db.exercise.create({
      data: {
        nameEn: e.en, nameAr: e.ar, nameFr: e.fr,
        muscleGroup: e.mg, equipment: e.eq, difficulty: e.diff,
        instructionsEn: `Keep core engaged, controlled tempo, full range of motion.`,
        instructionsAr: `حافظ على شد البطن، إيقاع متحكم به، مدى حركي كامل.`,
        instructionsFr: `Gainage serré, tempo contrôlé, amplitude complète.`,
      },
    });
    exercises[e.en] = ex.id;
  }

  // ===== WORKOUT PROGRAMS =====
  async function addProgram(nameEn: string, nameAr: string, nameFr: string, goal: string, diff: string, days: { nameEn: string; nameAr: string; nameFr: string; focus: string; est: number; exs: { id: string; sets: number; reps: number; rest: number; weight?: number }[] }[]) {
    const prog = await db.workoutProgram.create({
      data: { nameEn, nameAr, nameFr, description: "", goal, difficulty: diff, status: "ACTIVE" },
    });
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const day = await db.workoutDay.create({
        data: { programId: prog.id, dayIndex: i, nameEn: d.nameEn, nameAr: d.nameAr, nameFr: d.nameFr, focus: d.focus, estMinutes: d.est },
      });
      for (let j = 0; j < d.exs.length; j++) {
        const e = d.exs[j];
        await db.workoutExercise.create({
          data: {
            workoutDayId: day.id, exerciseId: e.id, orderIndex: j,
            sets: e.sets, reps: e.reps, restSeconds: e.rest, weight: e.weight,
          },
        });
      }
    }
    return prog.id;
  }

  const p1 = await addProgram(
    "Classic Split — 4 Days", "التقسيم الكلاسيكي — 4 أيام", "Split Classique — 4 Jours", "muscle", "INTERMEDIATE",
    [
      { nameEn: "Chest & Triceps", nameAr: "الصدر والترايسبس", nameFr: "Pectoraux & Triceps", focus: "chest,triceps", est: 55, exs: [
        { id: exercises["Bench Press"], sets: 4, reps: 10, rest: 90, weight: 60 },
        { id: exercises["Incline Dumbbell Press"], sets: 3, reps: 12, rest: 75, weight: 22 },
        { id: exercises["Cable Fly"], sets: 3, reps: 15, rest: 60, weight: 15 },
        { id: exercises["Triceps Pushdown"], sets: 3, reps: 12, rest: 60, weight: 25 },
        { id: exercises["Skull Crusher"], sets: 3, reps: 10, rest: 75, weight: 20 },
      ]},
      { nameEn: "Back & Biceps", nameAr: "الظهر والبايسبس", nameFr: "Dos & Biceps", focus: "back,biceps", est: 55, exs: [
        { id: exercises["Deadlift"], sets: 4, reps: 6, rest: 150, weight: 100 },
        { id: exercises["Lat Pulldown"], sets: 4, reps: 12, rest: 75, weight: 50 },
        { id: exercises["Barbell Row"], sets: 3, reps: 10, rest: 90, weight: 60 },
        { id: exercises["Barbell Curl"], sets: 3, reps: 12, rest: 60, weight: 30 },
        { id: exercises["Hammer Curl"], sets: 3, reps: 12, rest: 60, weight: 14 },
      ]},
      { nameEn: "Leg Day", nameAr: "يوم الرجلين", nameFr: "Jambes", focus: "legs,glutes,calves", est: 60, exs: [
        { id: exercises["Squat"], sets: 5, reps: 8, rest: 120, weight: 80 },
        { id: exercises["Leg Press"], sets: 4, reps: 12, rest: 90, weight: 120 },
        { id: exercises["Romanian Deadlift"], sets: 3, reps: 10, rest: 90, weight: 70 },
        { id: exercises["Leg Curl"], sets: 3, reps: 12, rest: 60, weight: 40 },
        { id: exercises["Calf Raise"], sets: 4, reps: 15, rest: 45, weight: 50 },
      ]},
      { nameEn: "Shoulders & Core", nameAr: "الكتفين والبطن", nameFr: "Épaules & Abdos", focus: "shoulders,abs", est: 45, exs: [
        { id: exercises["Overhead Press"], sets: 4, reps: 8, rest: 90, weight: 40 },
        { id: exercises["Lateral Raise"], sets: 4, reps: 15, rest: 45, weight: 10 },
        { id: exercises["Hip Thrust"], sets: 3, reps: 12, rest: 75, weight: 60 },
        { id: exercises["Cable Crunch"], sets: 3, reps: 15, rest: 45, weight: 25 },
        { id: exercises["Plank"], sets: 3, reps: 60, rest: 45 },
      ]},
    ]
  );

  const p2 = await addProgram(
    "Full Body Foundation", "تأسيس الجسم الكامل", "Full Body Fondation", "fitness", "BEGINNER",
    [
      { nameEn: "Full Body A", nameAr: "جسم كامل أ", nameFr: "Corps entier A", focus: "fullbody", est: 50, exs: [
        { id: exercises["Squat"], sets: 3, reps: 10, rest: 90, weight: 40 },
        { id: exercises["Bench Press"], sets: 3, reps: 10, rest: 90, weight: 40 },
        { id: exercises["Lat Pulldown"], sets: 3, reps: 12, rest: 75, weight: 35 },
        { id: exercises["Plank"], sets: 3, reps: 45, rest: 45 },
      ]},
      { nameEn: "Full Body B", nameAr: "جسم كامل ب", nameFr: "Corps entier B", focus: "fullbody", est: 50, exs: [
        { id: exercises["Deadlift"], sets: 3, reps: 8, rest: 120, weight: 60 },
        { id: exercises["Overhead Press"], sets: 3, reps: 10, rest: 90, weight: 25 },
        { id: exercises["Barbell Row"], sets: 3, reps: 10, rest: 90, weight: 40 },
        { id: exercises["Push-ups"], sets: 3, reps: 15, rest: 60 },
      ]},
    ]
  );

  // assign programs
  const cw = await db.clientWorkout.create({
    data: { userId: demoClient.id, programId: p1, startDate: daysAgo(20), status: "ACTIVE", assignedById: admin.id },
  });
  for (const cid of [created[0].id, created[2].id, created[5].id]) {
    await db.clientWorkout.create({
      data: { userId: cid, programId: p2, startDate: daysAgo(rand(2, 15)), status: "ACTIVE", assignedById: admin.id },
    });
  }

  // workout logs for demo client (history)
  const days = await db.workoutDay.findMany({ where: { programId: p1 }, orderBy: { dayIndex: "asc" } });
  const wex = await db.workoutExercise.findMany({
    where: { workoutDayId: { in: days.map((d) => d.id) } },
  });
  for (let i = 8; i >= 1; i--) {
    const day = days[i % days.length];
    const dayExs = wex.filter((w) => w.workoutDayId === day.id);
    const doneCount = dayExs.length <= 2 ? dayExs.length : dayExs.length - 1;
    const date = daysAgo(i * 2, 18, 15);
    await db.workoutLog.create({
      data: {
        clientWorkoutId: cw.id, workoutDayId: day.id, date,
        completedExercises: dayExs.slice(0, doneCount).map((w) => w.id).join(","),
        durationMin: rand(42, 65), completedAt: date,
      },
    });
  }

  // ===== DIET PLANS =====
  const diet1 = await db.dietPlan.create({
    data: {
      nameEn: "Lean Bulk Plan", nameAr: "خطة التضخيم النظيف", nameFr: "Prise de masse sèche",
      description: "", goal: "mass", totalCalories: 2800, status: "ACTIVE",
    },
  });
  const meals1: { type: string; time: string; foods: string; calories: number; protein: number; carbs: number; fats: number }[] = [
    { type: "breakfast", time: "07:30", foods: "3 whole eggs|100g oatmeal|1 banana|250ml milk", calories: 620, protein: 32, carbs: 72, fats: 20 },
    { type: "snack1", time: "10:30", foods: "30g almonds|1 apple", calories: 280, protein: 8, carbs: 30, fats: 16 },
    { type: "lunch", time: "13:00", foods: "200g grilled chicken|150g rice|salad with olive oil", calories: 780, protein: 55, carbs: 75, fats: 18 },
    { type: "snack2", time: "16:30", foods: "Whey protein shake|1 rice cake", calories: 260, protein: 27, carbs: 22, fats: 4 },
    { type: "dinner", time: "20:00", foods: "180g salmon|200g sweet potato|steamed vegetables", calories: 660, protein: 42, carbs: 48, fats: 26 },
  ];
  for (let i = 0; i < meals1.length; i++) {
    await db.meal.create({ data: { dietPlanId: diet1.id, ...meals1[i], orderIndex: i } });
  }
  await db.clientDiet.create({
    data: { userId: demoClient.id, dietPlanId: diet1.id, startDate: daysAgo(20) },
  });

  const diet2 = await db.dietPlan.create({
    data: {
      nameEn: "Fat Loss Plan", nameAr: "خطة حرق الدهون", nameFr: "Plan perte de gras",
      description: "", goal: "cut", totalCalories: 1900, status: "ACTIVE",
    },
  });
  const meals2 = [
    { type: "breakfast", time: "07:00", foods: "2 eggs|1 slice whole bread|black coffee", calories: 320, protein: 18, carbs: 22, fats: 16 },
    { type: "lunch", time: "12:30", foods: "180g chicken breast|100g rice|green salad", calories: 520, protein: 45, carbs: 50, fats: 8 },
    { type: "snack1", time: "16:00", foods: "Greek yogurt 0%|handful berries", calories: 180, protein: 15, carbs: 15, fats: 2 },
    { type: "dinner", time: "19:30", foods: "200g white fish|vegetables soup", calories: 380, protein: 40, carbs: 20, fats: 8 },
  ];
  for (let i = 0; i < meals2.length; i++) {
    await db.meal.create({ data: { dietPlanId: diet2.id, ...meals2[i], orderIndex: i } });
  }
  await db.clientDiet.create({ data: { userId: created[1].id, dietPlanId: diet2.id, startDate: daysAgo(10) } });

  // ===== CLASSES =====
  const classDefs: { en: string; ar: string; fr: string; inDays: number; hour: number; dur: number; cap: number; inst: string }[] = [
    { en: "HIIT Express", ar: "هيت إكسبرس", fr: "HIIT Express", inDays: 1, hour: 18, dur: 45, cap: 18, inst: "Coach Yacine" },
    { en: "Boxing Fundamentals", ar: "أساسيات الملاكمة", fr: "Boxe fondamentale", inDays: 2, hour: 19, dur: 60, cap: 16, inst: "Coach Nabil" },
    { en: "Morning Yoga", ar: "يوغا الصباح", fr: "Yoga du matin", inDays: 3, hour: 9, dur: 60, cap: 14, inst: "Coach Lina" },
    { en: "CrossFit WOD", ar: "كروس فيت", fr: "CrossFit WOD", inDays: 4, hour: 18, dur: 60, cap: 20, inst: "Coach Karim" },
    { en: "Cardio Burn", ar: "كارديو بيرن", fr: "Cardio Burn", inDays: 5, hour: 17, dur: 45, cap: 22, inst: "Coach Sofia" },
    { en: "Stretch & Mobility", ar: "إطالة ومرونة", fr: "Stretch & Mobilité", inDays: 0, hour: 20, dur: 40, cap: 15, inst: "Coach Lina" },
  ];
  const classesIds: string[] = [];
  for (const c of classDefs) {
    const date = daysFromNow(c.inDays, c.hour);
    date.setMinutes(0, 0, 0);
    const fc = await db.fitnessClass.create({
      data: {
        nameEn: c.en, nameAr: c.ar, nameFr: c.fr,
        description: "",
        date, durationMin: c.dur, capacity: c.cap, instructor: c.inst, status: "SCHEDULED",
      },
    });
    classesIds.push(fc.id);
  }

  // bookings: demo client booked HIIT + others
  await db.booking.create({ data: { classId: classesIds[0], userId: demoClient.id, status: "BOOKED" } });
  for (let i = 0; i < 12; i++) {
    const c = pick(created);
    try {
      await db.booking.create({ data: { classId: pick(classesIds), userId: c.id, status: "BOOKED" } });
    } catch {}
  }

  // ===== OFFERS =====
  await db.offer.create({
    data: {
      title: "OFFRE RENTRÉE — 3 MOIS",
      description: "3 months full access with a personalized starter program",
      planId: plans["3 MONTHS"].id,
      originalPrice: 6500, offerPrice: 5000,
      startDate: daysAgo(5), endDate: daysFromNow(25), status: "ACTIVE",
    },
  });
  await db.offer.create({
    data: {
      title: "6 MOIS + 1 MOIS OFFERT",
      description: "Subscribe to 6 months and get 1 extra month free",
      planId: plans["6 MONTHS"].id,
      originalPrice: 11000, offerPrice: 11000,
      startDate: daysAgo(10), endDate: daysFromNow(12), status: "ACTIVE",
    },
  });

  // ===== ANNOUNCEMENTS =====
  await db.announcement.create({
    data: {
      title: "Maintenance du club — Vendredi",
      body: "La salle sera fermée vendredi de 08h00 à 12h00 pour maintenance des équipements cardio. Merci de votre compréhension.",
      priority: "HIGH", startDate: daysAgo(1), endDate: daysFromNow(4), status: "PUBLISHED",
    },
  });
  await db.announcement.create({
    data: {
      title: "Nouvel équipement: Smith Machine",
      body: "Une nouvelle machine Smith est désormais disponible en zone poids libres.",
      priority: "NORMAL", startDate: daysAgo(6), endDate: null, status: "PUBLISHED",
    },
  });

  // ===== NOTIFICATIONS for demo client =====
  const notifs = [
    { type: "membership", title: "Your membership expires in 23 days", body: "Renew at the reception to keep your access.", link: "/client/membership" },
    { type: "workout", title: "New workout assigned", body: "Your coach assigned 'Classic Split — 4 Days'.", link: "/client/workouts" },
    { type: "diet", title: "New diet plan assigned", body: "'Lean Bulk Plan' is now available in your nutrition section.", link: "/client/diet" },
    { type: "class", title: "Booking confirmed: HIIT Express", body: "See you tomorrow at 18:00.", link: "/client/classes" },
    { type: "offer", title: "OFFRE RENTRÉE — 3 MOIS", body: "3 months at 5000 DA instead of 6500 DA.", link: "/client/offers" },
    { type: "payment", title: "Payment received", body: "6500 DA — CCP — ref MG-0002. Thank you!", link: "/client/payments" },
  ];
  for (let i = 0; i < notifs.length; i++) {
    await db.notification.create({
      data: {
        userId: demoClient.id, type: notifs[i].type, title: notifs[i].title,
        body: notifs[i].body, link: notifs[i].link, isRead: i > 3, createdAt: daysAgo(notifs.length - i, 12, 30),
      },
    });
  }

  // ===== AUDIT =====
  await db.auditLog.create({
    data: { adminId: admin.id, action: "SEED", target: "database", entity: "system", metadata: "Demo data seeded" },
  });

  console.log("✅ Seed complete.");
  console.log("   Admin:    admin@mokhtargym.dz / Admin@2026");
  console.log("   Client:   client@mokhtargym.dz / Client@2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
