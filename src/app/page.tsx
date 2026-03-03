import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LandingPage from "@/components/landing/LandingPage";
import LandingPageV2 from "@/components/landing/v2/LandingPageV2";

interface Props {
  searchParams: Promise<{ v?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/documents");
  }

  const params = await searchParams;

  if (params.v === "1") {
    return <LandingPage />;
  }

  return <LandingPageV2 />;
}
