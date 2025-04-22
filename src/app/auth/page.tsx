'use client'

import { Suspense, useEffect, useState } from "react";
import { SignupForm } from "@/src/app/components/auth/signup-form";
import { LoginForm } from "@/src/app/components/auth/login-form";
 
export default function AuthPage() {
  const [login, setLogin] = useState(true);
  const [form, setForm] = useState(<LoginForm setLogin={setLogin} />);
    
  useEffect(() => {
      if (login === true) {
        setForm(<LoginForm setLogin={setLogin} />);
        return
      }
      setForm(<SignupForm setLogin={setLogin} />);
    }, [login]);

  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-black p-3 md:h-36">
        </div>
        <Suspense>
          {form}
        </Suspense>
      </div>
    </main>
  );
}