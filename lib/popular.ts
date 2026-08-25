import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase";
export async function popularMovieIds(){const {data,error}=await createSupabaseAdminClient().from("analytics_events").select("movie_id,viewer_id").eq("event_type","play").limit(50000);if(error)return [];const counts=new Map<string,Set<string>>();for(const row of data??[]){const viewers=counts.get(row.movie_id)??new Set<string>();viewers.add(row.viewer_id);counts.set(row.movie_id,viewers);}return [...counts.entries()].sort((a,b)=>b[1].size-a[1].size).map(([id])=>id);}
