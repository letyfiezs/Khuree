import { apiAdmin } from "@/lib/admin";
import { publicR2Url, putR2Object } from "@/lib/r2";
import { ensureCanonicalSeries } from "@/lib/series-admin";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const runtime="nodejs";
const uuid=/^[0-9a-f-]{36}$/i;
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await apiAdmin()))return Response.json({error:"Админ эрх шаардлагатай."},{status:401});
  const {id}=await params;if(!uuid.test(id))return Response.json({error:"Цувралын ID буруу."},{status:400});
  const form=await request.formData(),file=form.get("poster");
  if(!(file instanceof File))return Response.json({error:"Зураг сонгоно уу."},{status:400});
  if(file.size>8*1024*1024)return Response.json({error:"Зураг 8MB-аас бага байна."},{status:413});
  const extension=file.type==="image/png"?"png":file.type==="image/webp"?"webp":file.type==="image/jpeg"?"jpg":null;
  if(!extension)return Response.json({error:"JPG, PNG эсвэл WEBP зураг оруулна уу."},{status:400});
  try{await ensureCanonicalSeries(id);const key=`series-posters/${id}/${crypto.randomUUID()}.${extension}`;await putR2Object(key,Buffer.from(await file.arrayBuffer()),file.type);const posterUrl=publicR2Url(key);if(!posterUrl)throw new Error("R2 public URL тохируулаагүй байна.");const {error}=await createSupabaseAdminClient().from("series").update({poster_url:posterUrl,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;return Response.json({posterUrl});}catch(error){return Response.json({error:error instanceof Error?error.message:"Thumbnail хадгалж чадсангүй."},{status:500});}
}
