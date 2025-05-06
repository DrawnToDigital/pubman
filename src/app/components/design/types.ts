import { z } from "zod";

export const platforms = z.enum([
    "PUBMAN",
    "DUMMY",
    "THINGIVERSE",
])

export const licenses = z.enum([
    "CC",
    "CC0",
    "CC-BY",
    "CC-BY-SA",
    "CC-BY-ND",
    "CC-BY-NC",
    "CC-BY-NC-SA",
    "CC-BY-NC-ND",
    "GPL-2.0",
    "GPL-3.0",
    "LGPL",
    "BSD",
    "SDFL"
])

export const pubmanCategories = z.enum([
  "3D Printing",
  "Art",
  "Fashion",
  "Gadgets",
  "Hobby",
  "Household",
  "Learning",
  "Models",
  "Tools",
  "Toys & Games",
  "Other"
])

export const designSchema = z.object({
    id: z.string(),
    main_name: z.string(),
    summary: z.string(),
    description: z.string(),
    license_key: licenses,
    is_ready: z.boolean(),
    is_published: z.boolean(),
    created_at: z.string().datetime({ offset: false }),
    updated_at: z.string().datetime({ offset: false }),
    tags: z.array(z.object({ tag: z.string(), platform: platforms })),
    categories: z.array(z.object({ category: pubmanCategories, platform: platforms })),
    assets: z.array(
        z.object({
            id: z.string(),
            file_name: z.string(),
            file_ext: z.string(),
            url: z.string(),
            created_at: z.string().datetime({ offset: false }),
        }),
    ),
    platforms: z.array(
        z.object({
            platform: platforms,
            platform_design_id: z.string().nullable(),
            published_status: z.number(),
            created_at: z.string().datetime({ offset: false }),
            updated_at: z.string().datetime({ offset: false }),
            published_at: z.string().datetime({ offset: false }).nullable(),
        }),
    ),
})

export type DesignSchema = z.infer<typeof designSchema>

export const designCreateSchema = z.object({
    main_name: z.string(),
    summary: z.string(),
    description: z.string(),
    license_key: licenses.default("SDFL").optional(),
    tags: z.string(),
    category: pubmanCategories,
})

export type DesignCreateSchema = z.infer<typeof designCreateSchema>

export const designUpdateSchema = z.object({
    main_name: z.string().nullish(),
    summary: z.string().nullish(),
    description: z.string().nullish(),
    license_key: licenses.nullish(),
    tags: z.string().nullish(),
    category: pubmanCategories.nullish(),
})

export type DesignUpdateSchema = z.infer<typeof designUpdateSchema>