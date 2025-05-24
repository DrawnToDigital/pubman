import { z } from "zod";

export const platforms = z.enum([
    "PUBMAN",
    "DUMMY",
    "THINGIVERSE",
    "PRINTABLES",
    "MAKERWORLD",
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

export const thingiverseCategories = z.enum([
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
]);

export const printablesCategories = z.enum([
  "Prusa Parts & Upgrades", // 3D Printers > Prusa Parts & Upgrades
  "Accessories", // 3D Printers > Accessories
  "Anycubic Parts & Upgrades", // 3D Printers > Anycubic Parts & Upgrades
  "Bambu Lab Parts & Upgrades", // 3D Printers > Bambu Lab Parts & Upgrades
  "Creality Parts & Upgrades", // 3D Printers > Creality Parts & Upgrades
  "Other Printer Parts & Upgrades", // 3D Printers > Other Printer Parts & Upgrades
  "Voron Parts & Upgrades", // 3D Printers > Voron Parts & Upgrades
  "Test Models", // 3D Printers > Test Models
  "2D Plates & Logos", // Art & Design > 2D Plates & Logos
  "Sculptures", // Art & Design > Sculptures
  "Wall-mounted", // Art & Design > Wall-mounted
  "Other Art & Designs", // Art & Design > Other Art & Designs
  "Cosplay & Costumes in general", // Costumes & Accessories > Cosplay & Costumes in general
  "Masks", // Costumes & Accessories > Masks
  "Props", // Costumes & Accessories > Props
  "Other Costume Accessories", // Costumes & Accessories > Other Costume Accessories
  "Men", // Fashion > Men
  "Women", // Fashion > Women
  "Other Fashion Accessories", // Fashion > Other Fashion Accessories
  "Audio", // Gadgets > Audio
  "Computers", // Gadgets > Computers
  "Photo & Video", // Gadgets > Photo & Video
  "Portable Devices", // Gadgets > Portable Devices
  "Video Games", // Gadgets > Video Games
  "Virtual Reality", // Gadgets > Virtual Reality
  "Other Gadgets", // Gadgets > Other Gadgets
  "Home Medical Tools", // Healthcare > Home Medical Tools
  "Medical Tools", // Healthcare > Medical Tools
  "Automotive", // Hobby & Makers > Automotive
  "Electronics", // Hobby & Makers > Electronics
  "Mechanical Parts", // Hobby & Makers > Mechanical Parts
  "Music", // Hobby & Makers > Music
  "Organizers", // Hobby & Makers > Organizers
  "RC & Robotics", // Hobby & Makers > RC & Robotics
  "Tools", // Hobby & Makers > Tools
  "Other Ideas", // Hobby & Makers > Other Ideas
  "Bathroom", // Household > Bathroom
  "Bedroom", // Household > Bedroom
  "Garage", // Household > Garage
  "Home Decor", // Household > Home Decor
  "Kitchen", // Household > Kitchen
  "Living Room", // Household > Living Room
  "Office", // Household > Office
  "Outdoor & Garden", // Household > Outdoor & Garden
  "Other House Equipment", // Household > Other House Equipment
  "Pets", // Household > Pets
  "Chemistry & Biology", // Learning > Chemistry & Biology
  "Engineering", // Learning > Engineering
  "Haptic Models", // Learning > Haptic Models
  "Math", // Learning > Math
  "Other 3D Objects for Learning", // Learning > Other 3D Objects for Learning
  "Physics & Astronomy", // Learning > Physics & Astronomy
  "Autumn & Halloween", // Seasonal designs > Autumn & Halloween
  "Spring & Easter", // Seasonal designs > Spring & Easter
  "Summer", // Seasonal designs > Summer
  "Winter & Christmas & New Year's", // Seasonal designs > Winter & Christmas & New Year's
  "Indoor Sports", // Sports & Outdoor > Indoor Sports
  "Other Sports", // Sports & Outdoor > Other Sports
  "Outdoor Sports", // Sports & Outdoor > Outdoor Sports
  "Winter Sports", // Sports & Outdoor > Winter Sports
  "Characters & Monsters", // Tabletop Miniatures > Characters & Monsters
  "Miniature Gaming Accessories", // Tabletop Miniatures > Miniature Gaming Accessories
  "Props & Terrains", // Tabletop Miniatures > Props & Terrains
  "Vehicles & Machines", // Tabletop Miniatures > Vehicles & Machines
  "Action Figures & Statues", // Toys & Games > Action Figures & Statues
  "Board Games", // Toys & Games > Board Games
  "Building Toys", // Toys & Games > Building Toys
  "Outdoor Toys", // Toys & Games > Outdoor Toys
  "Puzzles & Brain-teasers", // Toys & Games > Puzzles & Brain-teasers
  "Vehicles", // Toys & Games > Vehicles
  "Other Toys & Games", // Toys & Games > Other Toys & Games
  "Animals", // World & Scans > Animals
  "Architecture & Urbanism", // World & Scans > Architecture & Urbanism
  "Historical Context", // World & Scans > Historical Context
  "People", // World & Scans > People
]);

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
    thingiverse_category: thingiverseCategories.nullable(),
    printables_category: printablesCategories.nullable(),
    thumbnail: z.string().nullish(),
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
    thingiverse_category: thingiverseCategories.nullable(),
    printables_category: printablesCategories.nullable(),
})

export type DesignCreateSchema = z.infer<typeof designCreateSchema>

export const designUpdateSchema = z.object({
    main_name: z.string().nullish(),
    summary: z.string().nullish(),
    description: z.string().nullish(),
    license_key: licenses.nullish(),
    tags: z.string().nullish(),
    thingiverse_category: thingiverseCategories.nullish(),
    printables_category: printablesCategories.nullish(),
})

export type DesignUpdateSchema = z.infer<typeof designUpdateSchema>
