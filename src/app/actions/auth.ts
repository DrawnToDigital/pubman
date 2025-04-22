'use server'

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signupSchema, loginSchema, Tokens } from "@/src/app/components/auth/types";
import { z } from "zod";

const API_BASE = `${process.env.API_BASE}:${process.env.API_PORT}`;

export async function submitSignup(
    prevState: {
        message: string;
    },
    formData: FormData,
) {
  try {
    const validatedFields = signupSchema.parse({
        username: formData.get("username"),
        email: formData.get("email"),
        password: formData.get("password"),
    });
    
    const response = await fetch(`${API_BASE}/designer/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: validatedFields.username,
            email: validatedFields.email,
            password: validatedFields.password,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    await setCookies(response, validatedFields.username);
  } catch (error) {
    if (error instanceof z.ZodError) {
        const zErrs = error.issues.map((issue) => ({
            // path: issue.path.join("."), todo implement more intelligently
            message: issue.message,
          })).join()
        return {
            message: zErrs
        };
    }

    return {
        message: "something bad happened"
    };
  }
  redirect('/dashboard')
}

export async function submitLogin(
    prevState: {
        message: string;
    },
    formData: FormData,
) {
  try {
    const validatedFields = loginSchema.parse({
        username: formData.get("username"),
        password: formData.get("password"),
    });
    
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: validatedFields.username,
            password: validatedFields.password,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    await setCookies(response, validatedFields.username);
  } catch (error) {
    if (error instanceof z.ZodError) {
        const zErrs = error.issues.map((issue) => ({
            // path: issue.path.join("."), todo implement more intelligently
            message: issue.message,
          })).join()
        return {
            message: zErrs
        };
    }

    return {
        message: "something bad happened"
    };
  }
  redirect('/dashboard')
}

async function setCookies(response: Response, user: string) {
    const data: Tokens = await response.json();

    const cookieJar = await cookies();
    cookieJar.set('access-token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
    });
    cookieJar.set('refresh-token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
    });
    cookieJar.set('username', user, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
    });
}

export async function validateAccess() {
    const cookieJar = await cookies();

    const accessToken = cookieJar.get('access-token')?.value;
    if (!accessToken) {
        return false;
    }

    const response = await fetch(`${API_BASE}/designer/my`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
    });

    if (!response.ok) {
        return false;
    }
    return true;
}

export async function attemptRefresh() {
    const cookieJar = await cookies();

    const refreshToken = cookieJar.get('refresh-token')?.value;
    if (!refreshToken) {
        throw new Error("No refresh token found");
    }

    const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to refresh access-token: ${response.status}`);
    }

    const data: Tokens = await response.json()
    cookieJar.set('access-token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
    });
}

export async function logout() {
    const cookieJar = await cookies();
    cookieJar.delete('access-token')
    cookieJar.delete('refresh-token')

    redirect('/')
}