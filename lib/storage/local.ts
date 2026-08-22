import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { MovieStorage, NewMovieRecord, StoredMovieRecord } from './types';

const projectRoot=process.cwd();
export const storageRoot=path.resolve(projectRoot,process.env.LOCAL_STORAGE_DIR??'storage');
export const videosRoot=path.join(storageRoot,'videos');
export const uploadsRoot=path.join(storageRoot,'.uploads');
const databasePath=path.join(storageRoot,'khuree.db');

function openDatabase(){mkdirSync(videosRoot,{recursive:true});mkdirSync(uploadsRoot,{recursive:true});const database=new DatabaseSync(databasePath);database.exec(`CREATE TABLE IF NOT EXISTS movies (id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,title TEXT NOT NULL,synopsis TEXT NOT NULL,categories TEXT NOT NULL,video_key TEXT NOT NULL,original_filename TEXT NOT NULL,content_type TEXT,bytes INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'published',created_by TEXT NOT NULL,created_at TEXT NOT NULL)`);database.exec(`CREATE INDEX IF NOT EXISTS idx_movies_status_created_at ON movies(status,created_at DESC)`);database.exec(`UPDATE movies SET status='published' WHERE status='processing'`);database.exec('PRAGMA optimize');return database}

export const localMovieStorage:MovieStorage={
 createMovie(input:NewMovieRecord){const database=openDatabase();try{const id=crypto.randomUUID();const slug=`movie-${id.slice(0,8)}`;const createdAt=new Date().toISOString();database.prepare(`INSERT INTO movies (id,slug,title,synopsis,categories,video_key,original_filename,content_type,bytes,status,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,slug,input.title,input.synopsis,JSON.stringify(input.categories),input.videoKey,input.originalFilename,input.contentType,input.bytes,'published',input.createdBy,createdAt);return{...input,id,slug,status:'published',createdAt}}finally{database.close()}},
 listMovies(){const database=openDatabase();try{const rows=database.prepare(`SELECT id,slug,title,synopsis,categories,video_key,original_filename,content_type,bytes,status,created_by,created_at FROM movies ORDER BY created_at DESC`).all() as Record<string,unknown>[];return rows.map(row=>({id:String(row.id),slug:String(row.slug),title:String(row.title),synopsis:String(row.synopsis),categories:JSON.parse(String(row.categories)) as string[],videoKey:String(row.video_key),originalFilename:String(row.original_filename),contentType:String(row.content_type??''),bytes:Number(row.bytes),status:String(row.status) as StoredMovieRecord['status'],createdBy:String(row.created_by),createdAt:String(row.created_at)}))}finally{database.close()}},
};
