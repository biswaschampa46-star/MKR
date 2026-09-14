import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminIndex() {
  redirect((await isAdmin()) ? "/admin/dashboard" : "/admin/login");
}
