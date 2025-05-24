'use client'

import { redirect, usePathname } from "next/navigation";
import {ThingiverseAuth} from "@/src/app/components/dashboard/thingiverse-auth";
import {PrintablesAuth} from "@/src/app/components/dashboard/printables-auth";
import {useEffect, useState} from "react";

export function SiteHeader() {
    const pathname = usePathname();
    const [showProfiles, setShowProfiles] = useState(false);
    const showDashboard = pathname.startsWith('/design');
    useEffect(() => {
        setShowProfiles(window.name === '') // Hide in (named) popup windows
    }, []);

    return (
        <header className="border-grid sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-4">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold">Pubman</h1>
                    <nav className={`${!showDashboard ? 'hidden' : ''}`}>
                        <a className="text-sm font-bold text-gray-700 hover:text-gray-900" onClick={() => redirect('/dashboard')}>Return to Dashboard</a>
                    </nav>
                </div>
                <div className="flex-1"></div>
                {showProfiles && (
                  <div className="auth-profiles inline-flex">
                    <ThingiverseAuth />
                    <PrintablesAuth />
                  </div>
                )}
            </div>
        </header>
    )
}