import type { Metadata } from "next";
import { FlowMapperLoader } from "@/components/map/flow-mapper-loader";

export const metadata: Metadata = {
  title: "Reality map · Aligner",
};

export default function MapPage() {
  return <FlowMapperLoader />;
}
