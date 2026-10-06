import { apiAdmin } from "@/lib/admin";
import { deleteR2Object, deleteR2Prefixes } from "@/lib/r2";
import { updateSeriesShow } from "@/lib/series-admin";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";
const uuid=/^[0-9a-f-]{36}$/i;
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await apiAdmin()))return Response.json({error:"Админ эрх шаардлагатай."},{status:401});
  const {id}=await params;if(!uuid.test(id))return Response.json({error:"Цувралын ID буруу."},{status:400});
  const body=await request.json() as {title?:string;synopsis?:string;categories?:string[];ageRating?:string;isFree?:boolean;rentalPrice?:number};
  if(!body.title?.trim()||!body.synopsis?.trim()||!body.categories?.length)return Response.json({error:"Мэдээллээ бүрэн оруулна уу."},{status:400});
  try{return Response.json({show:await updateSeriesShow(id,{title:body.title.trim(),synopsis:body.synopsis.trim(),categories:body.categories,ageRating:body.ageRating??"13+",isFree:body.isFree,rentalPrice:body.rentalPrice})});}catch(error){return Response.json({error:error instanceof Error?error.message:"Цувралыг засаж чадсангүй."},{status:500});}
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await apiAdmin()))return Response.json({error:"Админ эрх шаардлагатай."},{status:401});
  const {id}=await params;if(!uuid.test(id))return Response.json({error:"Цувралын ID буруу."},{status:400});
  const db=createSupabaseAdminClient();
  const [{data:show,error:showError},{data:canonical,error:canonicalError},{data:episodes,error:episodesError}]=await Promise.all([
    db.from("series_shows").select("id").eq("id",id).maybeSingle(),
    db.from("series").select("id").eq("id",id).maybeSingle(),
    db.from("movies").select("id,video_key").eq("series_id",id),
  ]);
  if(showError||canonicalError||episodesError)return Response.json({error:showError?.message??canonicalError?.message??episodesError?.message},{status:500});
  if(!show&&!canonical)return Response.json({error:"Цуврал олдсонгүй."},{status:404});
  let r2ObjectsDeleted=0;
  try{
    const episodePrefixes=(episodes??[]).flatMap((episode)=>[
      `movies/${episode.id}/`,`posters/${episode.id}/`,`backdrops/${episode.id}/`,`subtitles/${episode.id}/`,
    ]);
    r2ObjectsDeleted=await deleteR2Prefixes([`series-posters/${id}/`,`series-backdrops/${id}/`,...episodePrefixes]);
    for(const episode of episodes??[]){
      if(episode.video_key&&!episode.video_key.startsWith(`movies/${episode.id}/`)&&/^movies\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|m3u8|ts)$/i.test(episode.video_key)){
        await deleteR2Object(episode.video_key);r2ObjectsDeleted+=1;
      }
    }
  }catch{
    return Response.json({error:"Цувралын R2 folder-уудыг бүрэн устгаж чадсангүй. Database дахь цуврал устгагдаагүй."},{status:502});
  }
  if(canonical){const {error}=await db.from("series").delete().eq("id",id);if(error)return Response.json({error:error.message},{status:500});}
  if(show){const {error}=await db.from("series_shows").delete().eq("id",id);if(error)return Response.json({error:error.message},{status:500});}
  revalidateTag("series","max");revalidateTag("catalog","max");
  return Response.json({deleted:true,id,episodesDeleted:episodes?.length??0,r2ObjectsDeleted});
}
