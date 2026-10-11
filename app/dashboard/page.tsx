import { DashboardView } from "@/components/dashboard/DashboardView";
import { getBuyerContext, getDashboardData, getReadiness } from "@/lib/dashboard/queries";

export default async function DashboardPage() {
  const { db, buyer } = await getBuyerContext();
  if (!buyer) return null; // layout renders the no-profile message
  const [data, readiness] = await Promise.all([getDashboardData(db, buyer.id), getReadiness(db, buyer)]);
  return <DashboardView buyer={buyer} kycDone={readiness.kycDone} data={data} />;
}
