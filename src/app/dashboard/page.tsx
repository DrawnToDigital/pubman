import { Suspense } from "react";
import { DesignsChartSkeleton } from "@/src/app/components/dashboard/design-skeletons";
import DesignsChart from "@/src/app/components/dashboard/design-chart";
import { Button } from "../components/ui/button";
import { UserBanner } from "../components/dashboard/user-banner";

export default function Page({}) {
    return (
        <main>
            <div className="inline-flex">
            <UserBanner />
            <Button className="m-4" variant="outline">
                Create New Design
            </Button>
            <Button className="m-4" variant="outline">
                Import Design
            </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-1">
                <Suspense fallback={<DesignsChartSkeleton />}>
                    <DesignsChart></DesignsChart>
                </Suspense>
            </div>
        </main>
    )
}