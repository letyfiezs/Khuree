"use client";
import { useMemo, useState } from "react";
import { PlayerShell } from "./player-shell";
import { matchesSearch } from "@/lib/search-normalize";
type Channel = {
  id: string;
  name: string;
  category: string;
  streamUrl: string;
  accent: string;
};
const sky = (id: string) =>
  `https://cdn4.skygo.mn/live/disk1/${id}/HLSv3-FTA/${id}.m3u8`;
const mnb = (id: string) => `https://live.mnb.mn/hls/${id}.stream.m3u8`;
const channels: Channel[] = [
  {
    id: "asianbox",
    name: "AsianBOX",
    category: "Кино",
    streamUrl: sky("AsianBOX"),
    accent: "#8620a7",
  },
  {
    id: "bloomberg",
    name: "Bloomberg Mongolia",
    category: "Мэдээ",
    streamUrl: sky("BloombergMon"),
    accent: "#52248f",
  },
  {
    id: "c1",
    name: "C1 Television",
    category: "Энтертайнмент",
    streamUrl: sky("C1"),
    accent: "#e83227",
  },
  {
    id: "ekh-oron",
    name: "Эх Орон ТВ",
    category: "Үндэсний",
    streamUrl:
      "https://cdn1.skygo.mn/live/disk1/Ekh_Oron/HLS-FTA/Ekh_Oron.m3u8",
    accent: "#176aa2",
  },
  {
    id: "channel11",
    name: "Channel 11",
    category: "Энтертайнмент",
    streamUrl: sky("Channel11"),
    accent: "#292f8c",
  },
  {
    id: "cinematv",
    name: "Cinema TV",
    category: "Кино",
    streamUrl:
      "https://cdn1.skygo.mn/live/disk1/CinemaTV/HLS-FTA/CinemaTV.m3u8",
    accent: "#a71d32",
  },
  {
    id: "cnbc",
    name: "CNBC",
    category: "Бизнес",
    streamUrl: sky("CNBC"),
    accent: "#1273ad",
  },
  {
    id: "eagle",
    name: "Eagle News",
    category: "Мэдээ",
    streamUrl: sky("Eagle"),
    accent: "#173b8f",
  },
  {
    id: "mnb",
    name: "МҮОНТ",
    category: "Үндэсний",
    streamUrl: mnb("mnb"),
    accent: "#1b57a5",
  },
  {
    id: "mn2",
    name: "Монголын мэдээ",
    category: "Мэдээ",
    streamUrl: mnb("mn2"),
    accent: "#1378a1",
  },
  {
    id: "mnb-sport",
    name: "MNB Спорт",
    category: "Спорт",
    streamUrl: mnb("mnb_sport"),
    accent: "#1a8d5a",
  },
  {
    id: "mnb-world",
    name: "MNB World",
    category: "Мэдээ",
    streamUrl: mnb("mnb_world"),
    accent: "#17629d",
  },
  {
    id: "education",
    name: "Боловсрол суваг",
    category: "Энтертайнмент",
    streamUrl: sky("Education"),
    accent: "#f09a24",
  },
  {
    id: "etv",
    name: "ETV HD",
    category: "Энтертайнмент",
    streamUrl: sky("ETV"),
    accent: "#e22429",
  },
  {
    id: "globaltv",
    name: "Global TV",
    category: "Энтертайнмент",
    streamUrl: sky("GlobalTV"),
    accent: "#6042a6",
  },
  {
    id: "gtv",
    name: "GTV",
    category: "Энтертайнмент",
    streamUrl: sky("GTV"),
    accent: "#e04a22",
  },
  {
    id: "malchin",
    name: "Малчин ТВ",
    category: "Үндэсний",
    streamUrl: sky("Malchin"),
    accent: "#24824b",
  },
  {
    id: "mnplus",
    name: "MN+ 91",
    category: "Энтертайнмент",
    streamUrl: sky("MNplus91"),
    accent: "#d72762",
  },
  {
    id: "mnctv",
    name: "MNC TV",
    category: "Энтертайнмент",
    streamUrl: sky("MNCTV"),
    accent: "#1764a8",
  },
  {
    id: "moviebox",
    name: "MovieBOX",
    category: "Кино",
    streamUrl: sky("Moviebox"),
    accent: "#b12134",
  },
  {
    id: "ntv",
    name: "NTV HD",
    category: "Мэдээ",
    streamUrl: sky("NTVHD"),
    accent: "#e02a2a",
  },
  {
    id: "ontv",
    name: "ONTV",
    category: "Энтертайнмент",
    streamUrl: sky("ONTV"),
    accent: "#9c244d",
  },
  {
    id: "parliament",
    name: "Парламент ТВ",
    category: "Мэдээ",
    streamUrl: sky("Parlament"),
    accent: "#315e9a",
  },
  {
    id: "sbn",
    name: "SBN",
    category: "Энтертайнмент",
    streamUrl: sky("SBN"),
    accent: "#d53030",
  },
  {
    id: "soyon",
    name: "Соён гэгээрүүлэгч",
    category: "Танин мэдэхүй",
    streamUrl: sky("SoyonGegeeruulegch"),
    accent: "#977226",
  },
  {
    id: "star",
    name: "Star TV",
    category: "Энтертайнмент",
    streamUrl: sky("Star"),
    accent: "#d62e81",
  },
  {
    id: "suld",
    name: "Сүлд ТВ",
    category: "Үндэсний",
    streamUrl: sky("SuldTV"),
    accent: "#a98020",
  },
  {
    id: "vtv",
    name: "VTV",
    category: "Энтертайнмент",
    streamUrl: sky("VTV"),
    accent: "#3444a2",
  },
  {
    id: "tm",
    name: "TM TV",
    category: "Энтертайнмент",
    streamUrl: sky("TM"),
    accent: "#b22b2b",
  },
  {
    id: "tv5",
    name: "TV5 HD",
    category: "Мэдээ",
    streamUrl: sky("TV5HD"),
    accent: "#e11d2e",
  },
  {
    id: "tv8",
    name: "TV8 HD",
    category: "Мэдээ",
    streamUrl: sky("TV8HD"),
    accent: "#273d91",
  },
  {
    id: "tv9",
    name: "TV9 HD",
    category: "Мэдээ",
    streamUrl: sky("TV9HD"),
    accent: "#dc2727",
  },
  {
    id: "mn25",
    name: "25-р суваг",
    category: "Энтертайнмент",
    streamUrl: sky("MN25"),
    accent: "#d59c1e",
  },
  {
    id: "ubs",
    name: "UBS HD",
    category: "Энтертайнмент",
    streamUrl: sky("UBSHD"),
    accent: "#254aa3",
  },
  {
    id: "ulzii",
    name: "Өлзий ТВ",
    category: "Үндэсний",
    streamUrl: sky("UlziiTV"),
    accent: "#be8d20",
  },
];
export function LiveTv() {
  const [active, setActive] = useState(channels[0]);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    return query.trim()
      ? channels.filter((channel) =>
          matchesSearch(query, channel.name, channel.category),
        )
      : channels;
  }, [query]);
  return (
    <div className="live-layout">
      <section className="live-stage">
        <div className="live-heading">
          <div>
            <p className="section-kicker">ШУУД ЭФИР</p>
            <h1>{active.name}</h1>
          </div>
          <span>
            <i /> LIVE
          </span>
        </div>
        <div className="live-player">
          <PlayerShell
            key={active.id}
            manifestUrl={active.streamUrl}
            title={active.name}
            autoPlay
            live
          />
        </div>
        <p className="rights-note">
          HLS эфирийг эх CDN-ээс шууд тоглуулж байна. Суваг солиход шинэ live
          stream автоматаар ачаална.
        </p>
      </section>
      <aside className="channel-list">
        <div>
          <b>Монгол сувгууд</b>
          <span>{channels.length} суваг</span>
        </div>
        <label className="channel-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Суваг хайх..."
          />
        </label>
        <div className="channel-scroll">
          {visible.map((channel) => (
            <button
              key={channel.id}
              className={active.id === channel.id ? "active" : ""}
              onClick={() => setActive(channel)}
            >
              <i style={{ background: channel.accent }}>
                {channel.name.slice(0, 2).toUpperCase()}
              </i>
              <span>
                <strong>{channel.name}</strong>
                <small>{channel.category}</small>
              </span>
              <em>LIVE</em>
            </button>
          ))}
          {!visible.length && <p className="no-channel">Суваг олдсонгүй</p>}
        </div>
      </aside>
    </div>
  );
}
