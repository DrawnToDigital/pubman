'use client'

import { logout } from "@/src/app/actions/auth";
import { redirect, usePathname } from "next/navigation";

export function SiteHeader() {
    const pathname = usePathname();
    const showLogout = ['/dashboard'].includes(pathname);
    const showLogin = ['/'].includes(pathname);

    return (
        <header className="border-grid sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-bold">Pubman</h1>
                </div>
                <nav className={`${!showLogout ? 'hidden' : ''}`} onClick={logout}>
                    <a className="text-sm font-bold text-gray-700 hover:text-gray-900">Logout</a>
                </nav>
                <nav className={`${!showLogin ? 'hidden' : ''}`} onClick={() => redirect('/auth')}>
                    <a className="text-sm font-bold text-gray-700 hover:text-gray-900">Login</a>
                </nav>
            </div>
        </header>
    )
}