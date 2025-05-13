'use client';

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { designCreateSchema, DesignCreateSchema, pubmanCategories } from "./types";
import { createDesign } from "@/src/app/actions/design";
import { FormControl, FormField, FormItem } from "@/src/app/components/ui/form";
import { Input } from "@/src/app/components/ui/input";
import log from 'electron-log/renderer';

const licenseMap: Record<string, string> = {
  'CC': 'Creative Commons',
  'CC0': 'Creative Commons — Public Domain',
  'CC-BY': 'Creative Commons — Attribution',
  'CC-BY-SA': 'Creative Commons — Attribution — Share Alike',
  'CC-BY-ND': 'Creative Commons — Attribution — NoDerivatives',
  'CC-BY-NC': 'Creative Commons — Attribution — Noncommercial',
  'CC-BY-NC-SA': 'Creative Commons — Attribution — Noncommercial — Share Alike',
  'CC-BY-NC-ND': 'Creative Commons — Attribution — Noncommercial — NoDerivatives',
  'GPL-2.0': 'GNU General Public License v2.0',
  'GPL-3.0': 'GNU General Public License v3.0',
  'LGPL': 'GNU Lesser General Public License',
  'BSD': 'BSD License',
  'SDFL': 'Standard Digital File License'
};

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
      if (response && response.id) {
        router.push(`/design/${response.id}`);
      } else {
        log.error("Unexpected response:", response);
        setErrorMessage("Failed to create design. Please try again.");
      }
    } catch (error) {
      log.error("Failed to create design:", error);
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

        <FormField
          control={form.control}
          name="license_key"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <label htmlFor="license_key" className="text-sm font-medium mb-1">
                License Key
              </label>
              <FormControl>
                <select
                  id="license_key"
                  {...field}
                  required
                  className="border border-gray-300 rounded-md p-2"
                >
                  <option value="" disabled>
                    Select a license key
                  </option>
                  {Object.entries(licenseMap).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
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