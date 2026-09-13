import { RouteTemplate } from "@/components/brand/route-template";

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTemplate>{children}</RouteTemplate>;
}
