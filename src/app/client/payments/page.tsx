import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { PaymentsClientPage } from "@/components/client/payments-client";

export const dynamic = "force-dynamic";

export default async function ClientPaymentsPage() {
  const me = await requireClient();
  if (!me) return null;

  const payments = await db.payment.findMany({
    where: { userId: me.id },
    orderBy: { paidAt: "desc" },
  });

  return (
    <PaymentsClientPage
      payments={payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        paidAt: p.paidAt.toISOString(),
        reference: p.reference,
      }))}
    />
  );
}
