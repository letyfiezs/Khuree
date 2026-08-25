import { apiAdmin } from "@/lib/admin";
import { updateSeriesShow } from "@/lib/series-admin";

export const runtime = "nodejs";
const uuid=/^[0-9a-f-]{36}$/i;
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await apiAdmin()))return Response.json({error:"Админ эрх шаардлагатай."},{status:401});
  const {id}=await params;if(!uuid.test(id))return Response.json({error:"Цувралын ID буруу."},{status:400});
  const body=await request.json() as {title?:string;synopsis?:string;categories?:string[];ageRating?:string};
  if(!body.title?.trim()||!body.synopsis?.trim()||!body.categories?.length)return Response.json({error:"Мэдээллээ бүрэн оруулна уу."},{status:400});
  try{return Response.json({show:await updateSeriesShow(id,{title:body.title.trim(),synopsis:body.synopsis.trim(),categories:body.categories,ageRating:body.ageRating??"13+"})});}catch(error){return Response.json({error:error instanceof Error?error.message:"Цувралыг засаж чадсангүй."},{status:500});}
}
