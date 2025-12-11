import { scenesData } from "@/data/scenes";
import DetailPageClient from "./DetailPageClient";

// 정적 내보내기를 위한 params 생성
export function generateStaticParams() {
  return scenesData.map((scene) => ({
    id: scene.id,
  }));
}

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DetailPage({ params }: DetailPageProps) {
  return <DetailPageClient params={params} />;
}
