import { ProfileOverview } from "@/components/profile/profile-overview";
import { requireUser } from "@/server/auth";
import { listMyRegistrations, listMyResults } from "@/server/queries/profile";
import { today } from "@/lib/today";

export default async function PerfilPage() {
  const user = await requireUser("/perfil");
  const [registrations, results] = await Promise.all([listMyRegistrations(user.id), listMyResults(user.id)]);
  return <ProfileOverview registrations={registrations} results={results} today={today()} />;
}
