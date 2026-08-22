import { verifyEmail } from '@/lib/auth/local-auth';
export async function GET(request:Request){const token=new URL(request.url).searchParams.get('token')??'';const success=token.length>20&&verifyEmail(token);return Response.redirect(new URL(success?'/login?verified=1':'/verify-email?error=1',request.url))}
