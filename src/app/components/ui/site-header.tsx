'use client'

import { logout } from "@/src/app/actions/auth";
import { redirect, usePathname } from "next/navigation";

export function SiteHeader() {
    const pathname = usePathname();
    const showDashboard = pathname.startsWith('/design');
    const showLogout = ['/dashboard'].includes(pathname);
    const showLogin = ['/'].includes(pathname);

    return (
        <header className="border-grid sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-4">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold">Pubman</h1>
                    <nav className={`${!showDashboard ? 'hidden' : ''}`}>
                        <a className="text-sm font-bold text-gray-700 hover:text-gray-900" onClick={() => redirect('/dashboard')}>Return to Dashboard</a>
                    </nav>
                </div>
                <nav className={`${!showLogout ? 'hidden' : ''}`}>
                    <a className="text-sm font-bold text-gray-700 hover:text-gray-900" onClick={logout}>Logout</a>
                </nav>
                <nav className={`${!showLogin ? 'hidden' : ''}`}>
                    <a className="text-sm font-bold text-gray-700 hover:text-gray-900" onClick={() => redirect('/auth')}>Login</a>
                </nav>
            </div>
        </header>
    )
}