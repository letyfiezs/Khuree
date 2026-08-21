'use client';
import { useEffect, useRef, useState } from 'react';

type PlayerShellProps={manifestUrl?:string;title:string};
export function PlayerShell({manifestUrl,title}:PlayerShellProps){
 const videoRef=useRef<HTMLVideoElement>(null); const [state,setState]=useState('Тоглуулахад бэлэн');
 useEffect(()=>{let player:{destroy:()=>Promise<void>}|undefined; async function boot(){if(!manifestUrl||!videoRef.current)return; const shaka=await import('shaka-player'); shaka.default.polyfill.installAll(); if(!shaka.default.Player.isBrowserSupported()){setState('Энэ хөтөч дэмжигдэхгүй байна');return} const instance=new shaka.default.Player(); await instance.attach(videoRef.current); instance.configure({drm:{servers:{'com.widevine.alpha':process.env.NEXT_PUBLIC_WIDEVINE_LICENSE_URL??''}},streaming:{bufferingGoal:30,rebufferingGoal:2}}); player=instance; try{await instance.load(manifestUrl);setState('Тоглуулахад бэлэн')}catch{setState('Demo stream холбогдоогүй байна')}} boot(); return()=>{void player?.destroy()}},[manifestUrl]);
 return <div className="player-frame" onContextMenu={e=>e.preventDefault()}><video ref={videoRef} controls controlsList="nodownload noremoteplayback" disablePictureInPicture={false} playsInline aria-label={`${title} видео тоглуулагч`}/>{!manifestUrl&&<div className="player-placeholder"><span className="player-orbit">▶</span><h2>{title}</h2><p>{state}</p><small>Shaka Player · DASH/HLS · DRM-ready</small></div>}<div className="watermark">ХҮРЭЭ · DEMO</div></div>
}
