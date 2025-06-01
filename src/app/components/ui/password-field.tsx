import { FormField, FormItem, FormControl } from './form';
import { Input } from './input';
import { useState } from 'react';
import { Button } from './button';
import { EyeIcon, EyeOffIcon } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PasswordField({ control }: { control: any }) {
    const [reveal, setReveal] = useState(false);

    return (
        <FormField
        control={control}
        name="password"
        render={({ field }) => (
            <FormItem>
                <FormControl>
                    <div className="relative">
                        <Input type={reveal ? 'text' : 'password'} placeholder="Password" {...field} />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setReveal((prev) => !prev)}
                        >
                            {reveal ? (
                                <EyeIcon
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                            ) : (
                                <EyeOffIcon
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                            )}
                            <span className="sr-only">
                                {reveal ? "Hide password" : "Show password"}
                            </span>
                        </Button>
                    </div>
                </FormControl>
            </FormItem>
        )}
        />
    )
}