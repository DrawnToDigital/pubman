"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/src/app/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/src/app/components/ui/form"
import { Input } from "@/src/app/components/ui/input"
import { loginSchema, LoginSchema } from "@/src/app/components/auth/types"
import { submitLogin } from "@/src/app/actions/auth"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { PasswordField } from "@/src/app/components/ui/password-field"

const initialState = {
  message: "",
};

export function LoginForm({ setLogin }: { setLogin: (value: boolean) => void }) {
  const { pending } = useFormStatus();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [state, formAction] = useActionState(submitLogin, initialState);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const handleClick = () => {
    setLogin(false);
  }

  return (
    <>
      <Form {...form}>
        <form action={formAction} className="space-y-8">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Username" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <PasswordField control={form.control} />
          <Button type="submit" disabled={pending}>Log In</Button>
        </form>
      </Form>
      <div>Don&apos;t have an account? <a onClick={handleClick}>Sign up!</a></div>
    </>
  )
}