import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "./supabase";
export type Category = { id: string; name: string };
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"");
export const listCategories = cache(async function listCategories(): Promise<Category[]> { const { data, error } = await createSupabaseAdminClient().from("genres").select("id,name").order("name"); if (error) throw error; return data; });
const listPublicCategoriesCached = unstable_cache(listCategories, ["khuree-public-categories-v1"], { revalidate: 60, tags: ["categories"] });
export const listPublicCategories = cache(listPublicCategoriesCached);
export async function createCategory(name: string) { const { data, error } = await createSupabaseAdminClient().from("genres").insert({ name: name.trim(), slug: slugify(name) }).select("id,name").single(); if (error) throw error; return data; }
export async function renameCategory(id: string, name: string) { const { data, error } = await createSupabaseAdminClient().from("genres").update({ name: name.trim(), slug: slugify(name) }).eq("id", id).select("id,name").maybeSingle(); if (error) throw error; return data ?? undefined; }
export async function deleteCategory(id: string) { const { error } = await createSupabaseAdminClient().from("genres").delete().eq("id", id); if (error) throw error; return true; }
