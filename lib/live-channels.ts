export type LiveChannel = {
  id: string;
  name: string;
  category: string;
  streamUrl: string;
};

const sky = (id: string) =>
  `https://cdn4.skygo.mn/live/disk1/${id}/HLSv3-FTA/${id}.m3u8`;
const mnb = (id: string) => `https://live.mnb.mn/hls/${id}.stream.m3u8`;
const row = (
  id: string,
  name: string,
  category: string,
  streamUrl = sky(id),
): LiveChannel => ({ id, name, category, streamUrl });

export const liveChannels: LiveChannel[] = [
  row("AsianBOX", "AsianBOX", "Кино"),
  row("BloombergMon", "Bloomberg Mongolia", "Мэдээ"),
  row("C1", "C1 Television", "Энтертайнмент"),
  row(
    "Ekh_Oron",
    "Эх Орон ТВ",
    "Үндэсний",
    "https://cdn1.skygo.mn/live/disk1/Ekh_Oron/HLS-FTA/Ekh_Oron.m3u8",
  ),
  row("Channel11", "Channel 11", "Энтертайнмент"),
  row(
    "CinemaTV",
    "Cinema TV",
    "Кино",
    "https://cdn1.skygo.mn/live/disk1/CinemaTV/HLS-FTA/CinemaTV.m3u8",
  ),
  row("CNBC", "CNBC", "Бизнес"),
  row("Eagle", "Eagle News", "Мэдээ"),
  row("mnb", "МҮОНТ", "Үндэсний", mnb("mnb")),
  row("mn2", "Монголын мэдээ", "Мэдээ", mnb("mn2")),
  row("mnb_sport", "MNB Спорт", "Спорт", mnb("mnb_sport")),
  row("mnb_world", "MNB World", "Мэдээ", mnb("mnb_world")),
  row("Education", "Боловсрол суваг", "Энтертайнмент"),
  row("ETV", "ETV HD", "Энтертайнмент"),
  row("GlobalTV", "Global TV", "Энтертайнмент"),
  row("GTV", "GTV", "Энтертайнмент"),
  row("Malchin", "Малчин ТВ", "Үндэсний"),
  row("MNplus91", "MN+ 91", "Энтертайнмент"),
  row("MNCTV", "MNC TV", "Энтертайнмент"),
  row("Moviebox", "MovieBOX", "Кино"),
  row("NTVHD", "NTV HD", "Мэдээ"),
  row("ONTV", "ONTV", "Энтертайнмент"),
  row("Parlament", "Парламент ТВ", "Мэдээ"),
  row("SBN", "SBN", "Энтертайнмент"),
  row("SoyonGegeeruulegch", "Соён гэгээрүүлэгч", "Танин мэдэхүй"),
  row("Star", "Star TV", "Энтертайнмент"),
  row("SuldTV", "Сүлд ТВ", "Үндэсний"),
  row("VTV", "VTV", "Энтертайнмент"),
  row("TM", "TM TV", "Энтертайнмент"),
  row("TV5HD", "TV5 HD", "Мэдээ"),
  row("TV8HD", "TV8 HD", "Мэдээ"),
  row("TV9HD", "TV9 HD", "Мэдээ"),
  row("MN25", "25-р суваг", "Энтертайнмент"),
  row("UBSHD", "UBS HD", "Энтертайнмент"),
  row("UlziiTV", "Өлзий ТВ", "Үндэсний"),
];
