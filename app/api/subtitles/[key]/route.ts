import { getCurrentUser } from "@/lib/auth/local-auth";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getR2ObjectText } from "@/lib/r2";
export const runtime="nodejs";
export async function GET(_:Request,{params}:{params:Promise<{key:string}>}){const user=await getCurrentUser();if(!user?.emailVerified)return new Response("Unauthorized",{status:401});const id=(await params).key;if(!/^[0-9a-f-]{36}$/i.test(id))return new Response("Not found",{status:404});const {data}=await createSupabaseAdminClient().from("subtitles").select("object_key").eq("id",id).maybeSingle();if(!data)return new Response("Not found",{status:404});try{return new Response(await getR2ObjectText(data.object_key),{headers:{"Content-Type":"text/vtt; charset=utf-8","Cache-Control":"private, max-age=60"}});}catch{return new Response("Not found",{status:404});}}
