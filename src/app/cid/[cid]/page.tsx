import { CIDDetailsPage } from "@/components/cid/cid-details-page";

interface PageProps {
  params: Promise<{
    cid: string;
  }>;
}

export default async function CIDDetailPage({ params }: PageProps) {
  const { cid } = await params;
  return <CIDDetailsPage cid={decodeURIComponent(cid)} />;
}
