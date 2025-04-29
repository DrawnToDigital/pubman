import Link from "next/link";
import { Suspense } from "react";
import { DesignsChartSkeleton } from "@/src/app/components/dashboard/design-skeletons";
import DesignsChart from "@/src/app/components/dashboard/design-chart";
import { Button } from "../components/ui/button";
import { UserBanner } from "../components/dashboard/user-banner";
import { ThingiverseAuth } from "../components/dashboard/thingiverse-auth";

export default function Page({}) {
    return (
        <main>
            <div className="inline-flex">
                <UserBanner />
                <Link href="/design/create-design">
                    <Button className="m-4" variant="outline">
                        Create New Design
                    </Button>
                </Link>
                <Button className="m-4" variant="outline">
                    Import Design
                </Button>
                <ThingiverseAuth />
            </div>
            <Suspense fallback={<DesignsChartSkeleton />}>
                <DesignsChart></DesignsChart>
            </Suspense>
        </main>
    )
}