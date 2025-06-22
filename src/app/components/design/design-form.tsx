'use client';

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { designCreateSchema, DesignCreateSchema, thingiverseCategories } from "./types";
import { createDesign } from "@/src/app/actions/design";
import { FormControl, FormField, FormItem } from "@/src/app/components/ui/form";
import { Input } from "@/src/app/components/ui/input";
import log from 'electron-log/renderer';
import TextEditor from "@/src/app/components/text-editor/editor";
import {printablesCategories} from "@/src/app/api/printables/printables-lib";
import { makerWorldCategories } from "@/src/app/api/makerworld/makerworld-lib";

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
  const [description, setDescription] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [titleCount, setTitleCount] = useState(0);
  const [summaryCount, setSummaryCount] = useState(0);

  const form = useForm<DesignCreateSchema>({
    resolver: zodResolver(designCreateSchema),
    defaultValues: {
      main_name: "",
      summary: "",
      description: "",
      license_key: "SDFL",
      tags: "",
      thingiverse_category: null,
      printables_category: null,
      makerworld_category: null,
    },
  });

  useEffect(() => {
    // @ts-expect-error global var
    window.__pubman_isEditing = true;
    return () => {
      // @ts-expect-error global var
      window.__pubman_isEditing = false;
    };
  }, []);

  useEffect(() => {
    setTitleCount(form.getValues('main_name')?.length || 0);
    setSummaryCount(form.getValues('summary')?.length || 0);
  }, [form]);

  const onSubmit = async (data: DesignCreateSchema) => {
    setErrorMessage(null); // Clear previous errors
    try {
      data.description = description;
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
                  onChange={e => {
                    field.onChange(e);
                    setTitleCount(e.target.value.length);
                  }}
                />
              </FormControl>
              <div className="text-xs text-gray-500 text-right">{titleCount}</div>
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
                  onChange={e => {
                    field.onChange(e);
                    setSummaryCount(e.target.value.length);
                  }}
                />
              </FormControl>
              <div className="text-xs text-gray-500 text-right">{summaryCount}</div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={() => (
            <FormItem className="flex flex-col">
              <label htmlFor="description" className="text-sm font-medium mb-1">
                Description
              </label>
              <FormControl>
                <TextEditor onContentChange={setDescription} />
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
          name="thingiverse_category"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <label htmlFor="thingiverse_category" className="text-sm font-medium mb-1">
                Thingiverse Category
              </label>
              <FormControl>
                <select
                  id="thingiverse_category"
                  {...field} value={field.value || ""}
                  className="border border-gray-300 rounded-md p-2"
                >
                  <option value="">
                    Select a category
                  </option>
                  {thingiverseCategories.options.map((category) => (
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
          name="printables_category"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <label htmlFor="printables_category" className="text-sm font-medium mb-1">
                Printables Category
              </label>
              <FormControl>
                <select
                  id="printables_category"
                  {...field} value={field.value || ""}
                  className="border border-gray-300 rounded-md p-2"
                >
                  <option value="">
                    Select a category
                  </option>
                  {Object.entries(printablesCategories).map(([category, cat]) => {
                    if ('disabled' in cat && cat.disabled) {
                      return (
                        <option key={category} value={category} disabled>
                          {category}
                        </option>
                      );
                    } else {
                      return (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      );
                    }
                  })}
                </select>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="makerworld_category"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <label htmlFor="makerworld_category" className="text-sm font-medium mb-1">
                MakerWorld Category
              </label>
              <FormControl>
                <select
                  id="makerworld_category"
                  {...field} value={field.value || ""}
                  className="border border-gray-300 rounded-md p-2"
                >
                  <option value="">
                    Select a category
                  </option>
                  {Object.entries(makerWorldCategories).map(([category, cat]) => {
                    if ('disabled' in cat && cat.disabled) {
                      return (
                        <option key={category} value={category} disabled>
                          {category}
                        </option>
                      );
                    } else {
                      return (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      );
                    }
                  })}
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
                License
              </label>
              <FormControl>
                <select
                  id="license_key"
                  {...field}
                  required
                  className="border border-gray-300 rounded-md p-2"
                >
                  <option value="" disabled>
                    Select a license
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
