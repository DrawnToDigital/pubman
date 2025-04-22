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
import { signupSchema, SignupSchema } from "@/src/app/components/auth/types"
import { submitSignup } from "@/src/app/actions/auth"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { PasswordField } from "@/src/app/components/ui/password-field"

const initialState = {
  message: "",
};

export function SignupForm({ setLogin }: { setLogin: (value: boolean) => void }) {
  const { pending } = useFormStatus();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [state, formAction] = useActionState(submitSignup, initialState);

  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  })

  const handleClick = () => {
    setLogin(true);
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
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Email" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <PasswordField control={form.control} />
          <Button type="submit" disabled={pending}>Submit</Button>
        </form>
      </Form>
      <div>Already have an account? <a onClick={handleClick}>Log in.</a></div>
    </>
  )
}
