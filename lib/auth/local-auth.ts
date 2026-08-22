import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

export type LocalUser={id:string;name:string;email:string;role:'user'|'admin';emailVerified:boolean};
const storageRoot=path.resolve(process.cwd(),process.env.LOCAL_STORAGE_DIR??'storage');
const databasePath=path.join(storageRoot,'khuree.db');
const sessionCookie='khuree_session';

function db(){mkdirSync(storageRoot,{recursive:true});const database=new DatabaseSync(databasePath);database.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',email_verified INTEGER NOT NULL DEFAULT 0,verification_token_hash TEXT,verification_expires_at TEXT,created_at TEXT NOT NULL)`);database.exec(`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);database.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id,expires_at)`);database.exec('PRAGMA optimize');return database}
const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
const passwordHash=(password:string)=>{const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`};
const passwordMatches=(password:string,stored:string)=>{const [salt,hash]=stored.split(':');if(!salt||!hash)return false;const actual=scryptSync(password,salt,64);const expected=Buffer.from(hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected)};
const toUser=(row:Record<string,unknown>):LocalUser=>({id:String(row.id),name:String(row.name),email:String(row.email),role:String(row.role) as LocalUser['role'],emailVerified:Boolean(row.email_verified)});

export function createUser(name:string,email:string,password:string){const database=db();try{const normalized=email.trim().toLowerCase();if(database.prepare('SELECT id FROM users WHERE email=?').get(normalized))throw new Error('Энэ имэйлээр бүртгэл үүссэн байна.');const id=crypto.randomUUID();const verificationToken=randomBytes(32).toString('hex');const role=normalized===(process.env.ADMIN_EMAIL??'admin@khuree.local').toLowerCase()?'admin':'user';database.prepare(`INSERT INTO users (id,name,email,password_hash,role,email_verified,verification_token_hash,verification_expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)`).run(id,name.trim(),normalized,passwordHash(password),role,0,tokenHash(verificationToken),new Date(Date.now()+24*60*60*1000).toISOString(),new Date().toISOString());return{user:{id,name:name.trim(),email:normalized,role,emailVerified:false} as LocalUser,verificationToken}}finally{database.close()}}
export function verifyEmail(token:string){const database=db();try{const row=database.prepare(`SELECT id FROM users WHERE verification_token_hash=? AND verification_expires_at>?`).get(tokenHash(token),new Date().toISOString()) as {id:string}|undefined;if(!row)return false;database.prepare(`UPDATE users SET email_verified=1,verification_token_hash=NULL,verification_expires_at=NULL WHERE id=?`).run(row.id);return true}finally{database.close()}}
export function authenticate(email:string,password:string){const database=db();try{const row=database.prepare(`SELECT id,name,email,password_hash,role,email_verified FROM users WHERE email=?`).get(email.trim().toLowerCase()) as Record<string,unknown>|undefined;if(!row||!passwordMatches(password,String(row.password_hash)))return null;return toUser(row)}finally{database.close()}}
export function createSession(userId:string){const database=db();try{const token=randomBytes(32).toString('hex');database.prepare(`INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)`).run(tokenHash(token),userId,new Date(Date.now()+30*24*60*60*1000).toISOString(),new Date().toISOString());return token}finally{database.close()}}
export function userFromSession(token:string|undefined){if(!token)return null;const database=db();try{const row=database.prepare(`SELECT u.id,u.name,u.email,u.role,u.email_verified FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).get(tokenHash(token),new Date().toISOString()) as Record<string,unknown>|undefined;return row?toUser(row):null}finally{database.close()}}
export function deleteSession(token:string|undefined){if(!token)return;const database=db();try{database.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token))}finally{database.close()}}
export async function getCurrentUser(){const cookieStore=await cookies();return userFromSession(cookieStore.get(sessionCookie)?.value)}
export async function requireUser(returnTo='/movies'){const user=await getCurrentUser();if(!user)redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);if(!user.emailVerified)redirect('/verify-email?pending=1');return user}
export async function requireAdmin(){const user=await requireUser('/admin');if(user.role!=='admin')redirect('/movies');return user}
export const sessionCookieName=sessionCookie;
