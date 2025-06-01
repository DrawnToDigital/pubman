import { Suspense } from "react";
import { DesignsChartSkeleton } from "@/src/app/components/dashboard/design-skeletons";
import DesignsChart from "@/src/app/components/dashboard/design-chart";

export default function Page({}) {
    return (
        <main>
            <Suspense fallback={<DesignsChartSkeleton />}>
                <DesignsChart></DesignsChart>
            </Suspense>
        </main>
    )
}