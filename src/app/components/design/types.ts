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

export const designSchema = z.object({
    design_key: z.string(),
    main_name: z.string(),
    summary: z.string(),
    description: z.string(),
    license_key: licenses,
    is_ready: z.boolean(),
    is_published: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    tags: z.array(z.object({ tag: z.string(), platform: platforms })),
    categories: z.array(z.object({ category: z.string(), platform: platforms })),
    assets: z.array(
        z.object({
            asset_key: z.string(),
            file_name: z.string(),
            mime_type: z.string(),
            url: z.string(),
            created_at: z.date(),
        }),
    ),
})

export type DesignSchema = z.infer<typeof designSchema>

export const designCreateSchema = z.object({
    main_name: z.string(),
    summary: z.string(),
    description: z.string(),
    license_key: licenses.default("SDFL"),
    tags: z.array(z.string()),
    category: z.string(),
})

export type DesignCreateSchema = z.infer<typeof designCreateSchema>