"use client";
import { useEffect, useMemo, useState } from "react";
import type { LiveChannel } from "@/lib/live-channels";

type Recording = { id:string; channel_id:string; channel_name:string; title:string; scheduled_at:string; duration_minutes?:number; ends_at?:string; status:"scheduled"|"recording"|"uploading"|"completed"|"failed"|"cancelled"; object_key?:string; bytes:number; error_message?:string; worker_id?:string };
const labels: Record<Recording["status"], string> = { scheduled:"Хүлээгдэж байна", recording:"Бичиж байна", uploading:"R2 руу хуулж байна", completed:"Бэлэн", failed:"Алдаатай", cancelled:"Цуцлагдсан" };
const formatBytes = (bytes:number) => bytes ? `${(bytes / 1024 ** 3).toFixed(bytes > 1024 ** 3 ? 2 : 3)} GB` : "—";
const localParts = (date:Date) => { const local = new Date(date.getTime()-date.getTimezoneOffset()*60_000); return { date:local.toISOString().slice(0,10), time:local.toISOString().slice(11,16) }; };
const hours = Array.from({length:24},(_,index)=>String(index).padStart(2,"0"));
const minutesOfHour = Array.from({length:60},(_,index)=>String(index).padStart(2,"0"));

function GlassTimePicker({value,onChange,label}:{value:string;onChange:(value:string)=>void;label:string}) {
  const [hour="00",minute="00"] = value.split(":");
  return <div className="glass-time-picker" aria-label={label}>
    <span className="time-clock" aria-hidden="true">◷</span>
    <select aria-label={`${label} - цаг`} value={hour} onChange={event=>onChange(`${event.target.value}:${minute}`)}>{hours.map(option=><option key={option}>{option}</option>)}</select>
    <b>:</b>
    <select aria-label={`${label} - минут`} value={minute} onChange={event=>onChange(`${hour}:${event.target.value}`)}>{minutesOfHour.map(option=><option key={option}>{option}</option>)}</select>
    <em>24H</em>
  </div>;
}

export function AdminLive() {
  const [channels,setChannels]=useState<LiveChannel[]>([]), [recordings,setRecordings]=useState<Recording[]>([]);
  const defaults = useState(() => { const start=new Date(Date.now()+5*60_000); start.setSeconds(0,0); const end=new Date(start.getTime()+30*60_000); return { start:localParts(start), end:localParts(end) }; })[0];
  const [channelId,setChannelId]=useState(""), [title,setTitle]=useState(""), [minutes,setMinutes]=useState<number|"">(""), [scheduledDate,setScheduledDate]=useState(defaults.start.date), [scheduledTime,setScheduledTime]=useState(defaults.start.time), [endsDate,setEndsDate]=useState(defaults.end.date), [endsTime,setEndsTime]=useState(defaults.end.time), [busy,setBusy]=useState(""), [error,setError]=useState("");
  const load=async()=>{ const response=await fetch("/api/admin/live",{cache:"no-store"}); const data=await response.json() as {channels?:LiveChannel[];recordings?:Recording[];error?:string}; if(data.channels){setChannels(data.channels);setChannelId((id)=>id||data.channels![0]?.id||"");} if(data.recordings)setRecordings(data.recordings); if(!response.ok)setError(data.error||"Бичлэгийн мэдээлэл уншиж чадсангүй."); };
  useEffect(()=>{const first=window.setTimeout(()=>void load(),0); const timer=window.setInterval(()=>void load(),10_000); return()=>{window.clearTimeout(first);window.clearInterval(timer);};},[]);
  async function action(name:string,payload:Record<string,unknown>={}) { setBusy(`${name}-${String(payload.recordingId||"")}`);setError(""); const response=await fetch("/api/admin/live",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:name,...payload})}); const data=await response.json() as {error?:string;url?:string}; if(!response.ok)setError(data.error||"Үйлдэл амжилтгүй."); else if(data.url) window.open(data.url,"_blank","noopener,noreferrer"); await load();setBusy(""); }
  const active=useMemo(()=>recordings.filter(x=>["recording","uploading"].includes(x.status)),[recordings]);
  const scheduled=recordings.filter(x=>x.status==="scheduled"), archive=recordings.filter(x=>x.status!=="scheduled");
  const submit=(now=false)=>void action(now?"start":"schedule",{channelId,minutes:minutes===""?undefined:minutes,title,scheduledAt:now?undefined:new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString(),endsAt:endsDate&&endsTime?new Date(`${endsDate}T${endsTime}:00`).toISOString():undefined});
  return <div className="recording-console">
    <div className="admin-toolbar"><div><span className="admin-eyebrow">LIVE RECORDER</span><h1>Шууд ТВ бичлэг</h1><p>Сонгосон цагт автоматаар бичиж, R2 архивт хадгална.</p></div><div className="recorder-health"><i className={active.length?"active":""}/><span>{active.length?`${active.length} бичлэг ажиллаж байна`:"Recorder хуваарь хүлээж байна"}</span></div></div>
    <p className="rights-warning">Зөвхөн өөрийн эзэмшдэг эсвэл бичиж, хадгалах зөвшөөрөлтэй сувгийг архивлана уу. Хуваарь ажиллахын тулд recorder PC асаалттай байна.</p>
    {error&&<p className="form-error">⚠ {error}</p>}
    <section className="record-scheduler-card"><div className="scheduler-copy"><span>ШИНЭ ХУВААРЬ</span><h2>Юуг, хэзээ бичих вэ?</h2><p>Улаанбаатарын цагаар эхлэх хугацаа болон бичлэгийн уртыг сонгоно.</p></div><div className="scheduler-form">
      <label><span>Суваг</span><select value={channelId} onChange={e=>setChannelId(e.target.value)}>{channels.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="wide"><span>Бичлэгийн нэр</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Жишээ: Оройн мэдээ"/></label>
      <label><span>Эхлэх огноо</span><input type="date" value={scheduledDate} onChange={e=>setScheduledDate(e.target.value)}/></label>
      <label><span>Эхлэх цаг <small>24 цагийн формат</small></span><GlassTimePicker label="Эхлэх цаг" value={scheduledTime} onChange={setScheduledTime}/></label>
      <label><span>Дуусах огноо <small>(сонголттой)</small></span><input type="date" value={endsDate} onChange={e=>setEndsDate(e.target.value)}/></label>
      <label><span>Дуусах цаг <small>24 цагийн формат</small></span><GlassTimePicker label="Дуусах цаг" value={endsTime} onChange={setEndsTime}/></label>
      <label><span>Үргэлжлэх минут <small>(сонголттой)</small></span><div className="duration-input"><input type="number" min="1" max="720" placeholder="Ж: 30" value={minutes} onChange={e=>setMinutes(e.target.value===""?"":Number(e.target.value))}/><b>минут</b></div></label>
      <div className="scheduler-actions wide"><button className="glass-button" disabled={!!busy||!channelId||!scheduledDate||!scheduledTime} onClick={()=>submit(false)}>＋ Хуваарь хадгалах</button><button className="record-now" disabled={!!busy||!channelId} onClick={()=>submit(true)}><i/> Одоо бичиж эхлэх</button></div>
    </div></section>
    <div className="record-summary"><article><span>ХҮЛЭЭГДЭЖ БУЙ</span><b>{scheduled.length}</b><small>автомат хуваарь</small></article><article><span>ИДЭВХТЭЙ</span><b>{active.length}</b><small>бичлэг / upload</small></article><article><span>БЭЛЭН АРХИВ</span><b>{recordings.filter(x=>x.status==="completed").length}</b><small>зөвхөн админд</small></article></div>
    <section className="recording-list modern"><div className="section-heading"><div><span>ХУВААРЬ</span><h2>Удахгүй эхлэх</h2></div></div>{!scheduled.length&&<div className="record-empty">Товлосон бичлэг алга.</div>}{scheduled.map(r=><RecordingRow key={r.id} r={r} busy={busy} action={action}/>)}</section>
    <section className="recording-list modern"><div className="section-heading"><div><span>ХУВИЙН АРХИВ</span><h2>Бичлэгүүд</h2></div><small>Зөвхөн админ үзэж, татаж чадна</small></div>{!archive.length&&<div className="record-empty">Бичлэгийн архив хоосон байна.</div>}{archive.map(r=><RecordingRow key={r.id} r={r} busy={busy} action={action}/>)}</section>
  </div>;
}

  function RecordingRow({r,busy,action}:{r:Recording;busy:string;action:(name:string,payload?:Record<string,unknown>)=>Promise<void>}) { const ready=r.status==="completed"&&r.object_key, stopping=r.error_message==="__STOP_REQUESTED__", canStop=r.worker_id?.endsWith("-stop-v1"); const duration=r.duration_minutes?`${r.duration_minutes} мин`:r.ends_at?`дуусах ${new Date(r.ends_at).toLocaleString("mn-MN")}`:""; return <article className="record-row"><div className={`record-icon ${stopping?"uploading":r.status}`}><i/></div><div className="record-main"><b>{r.title}</b><small>{r.channel_name} · {new Date(r.scheduled_at).toLocaleString("mn-MN")} · {duration}</small>{r.error_message&&!stopping&&<em>{r.error_message}</em>}</div><span className={`record-status ${stopping?"uploading":r.status}`}>{stopping?"Зогсоож байна":labels[r.status]}</span><small className="record-size">{formatBytes(r.bytes)}</small><div className="record-actions">{ready&&<><button onClick={()=>void action("preview",{recordingId:r.id})}>▶ Үзэх</button><button onClick={()=>void action("download",{recordingId:r.id})}>↓ Татах</button></>}{r.status==="recording"&&canStop&&<button className="force-stop" disabled={!!busy} onClick={()=>{if(confirm("Бичлэгийг одоо зогсоож, бичигдсэн хэсгийг архивлах уу?"))void action("stop",{recordingId:r.id});}}>■ Force stop</button>}{r.status==="scheduled"&&<button onClick={()=>void action("cancel",{recordingId:r.id})}>Цуцлах</button>}{!["recording","uploading"].includes(r.status)&&!stopping&&<button className="danger" disabled={!!busy} onClick={()=>{if(confirm("Бичлэг болон R2 файлыг бүрэн устгах уу?"))void action("delete",{recordingId:r.id});}}>Устгах</button>}</div></article>; }
