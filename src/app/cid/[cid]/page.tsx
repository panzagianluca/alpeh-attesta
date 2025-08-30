import { CIDDetailsPage } from "@/components/cid/cid-details-page";

interface PageProps {
  params: {
    cid: string;
  };
}

export default function CIDDetailPage({ params }: PageProps) {
  return <CIDDetailsPage cid={decodeURIComponent(params.cid)} />;
}
