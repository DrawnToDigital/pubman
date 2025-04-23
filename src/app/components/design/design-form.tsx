'use client';

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { designCreateSchema, DesignCreateSchema, pubmanCategories } from "./types";
import { createDesign } from "@/src/app/actions/design";
import { FormControl, FormField, FormItem } from "@/src/app/components/ui/form";
import { Input } from "@/src/app/components/ui/input";

const DesignForm = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<DesignCreateSchema>({
    resolver: zodResolver(designCreateSchema),
    defaultValues: {
      main_name: "",
      summary: "",
      description: "",
      license_key: "SDFL",
      tags: "",
      category: "Other",
    },
  });

  const onSubmit = async (data: DesignCreateSchema) => {
    setErrorMessage(null); // Clear previous errors
    try {
      const response = await createDesign(data);
      if (response && response.design_key) {
        router.push(`/design/${response.design_key}`);
      } else {
        console.error("Unexpected response:", response);
        setErrorMessage("Failed to create design. Please try again.");
      }
    } catch (error) {
      console.error("Failed to create design:", error);
      setErrorMessage("Failed to create design. Please try again.");
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {errorMessage && (
          <div className="text-red-500 text-sm">{errorMessage}</div>
        )}

        <FormField
          control={form.control}
          name="main_name"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <label htmlFor="main_name" className="text-sm font-medium mb-1">
                Name
              </label>
              <FormControl>
                <Input
                  id="main_name"
                  placeholder="Enter name"
                  {...field}
                  required
                  className="border border-gray-300 rounded-md p-2"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <label htmlFor="summary" className="text-sm font-medium mb-1">
                Summary
              </label>
              <FormControl>
                <textarea
                  id="summary"
                  placeholder="Enter summary"
                  {...field}
                  required
                  className="border border-gray-300 rounded-md p-2"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <label htmlFor="description" className="text-sm font-medium mb-1">
                Description
              </label>
              <FormControl>
                <textarea
                  id="description"
                  placeholder="Enter description"
                  {...field}
                  required
                  className="border border-gray-300 rounded-md p-2"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <label htmlFor="tags" className="text-sm font-medium mb-1">
                Tags
              </label>
              <FormControl>
                <Input
                  id="tags"
                  placeholder="Enter tags (comma-separated)"
                  {...field}
                  required
                  className="border border-gray-300 rounded-md p-2"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <label htmlFor="category" className="text-sm font-medium mb-1">
                Category
              </label>
              <FormControl>
                <select
                  id="category"
                  {...field}
                  required
                  className="border border-gray-300 rounded-md p-2"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {pubmanCategories.options.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </FormControl>
            </FormItem>
          )}
        />

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
        >
          {form.formState.isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </FormProvider>
  );
};

export default DesignForm;