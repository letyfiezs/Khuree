export type ContentKind = 'movie' | 'series';
export type ContentItem = { id:string; slug:string; title:string; synopsis:string; year:number; duration:string; age:string; rating:number; genre:string[]; kind:ContentKind; status:'published'|'draft'|'processing'; accent:string; episodes?:number; videoKey?:string };
export const content: ContentItem[] = [
 {id:'1',slug:'huiten-mur',title:'Хүйтэн мөр',synopsis:'Цасан шуурганд тасарсан уулын сууринд нэгэн мөрдөгч өнгөрсөнтэйгөө нүүр тулна. Үнэнийг нуусан мөр бүр түүнийг гэрт нь улам ойртуулна.',year:2026,duration:'2ц 08м',age:'16+',rating:8.7,genre:['Триллер','Драма','Нууц'],kind:'movie',status:'published',accent:'#7f1018'},
 {id:'2',slug:'hoh-tengeriin-dor',title:'Хөх тэнгэрийн дор',synopsis:'Тал нутгийн нэгэн гэр бүлийн гурван үеийн түүх.',year:2026,duration:'2ц 14м',age:'12+',rating:8.2,genre:['Драма'],kind:'movie',status:'published',accent:'#27364b'},
 {id:'3',slug:'zerleg-salhi',title:'Зэрлэг салхи',synopsis:'Хил дээрх жижиг хотод эхэлсэн эрэл.',year:2026,duration:'8 анги',age:'13+',rating:8.4,genre:['Адал явдал'],kind:'series',status:'published',accent:'#6a3d16',episodes:8},
 {id:'4',slug:'tsagaan-shono',title:'Цагаан шөнө',synopsis:'Улаанбаатарын нэг шөнийн нууц.',year:2024,duration:'1ц 56м',age:'18+',rating:7.9,genre:['Гэмт хэрэг'],kind:'movie',status:'draft',accent:'#202454'},
];
export const getContent = (slug:string) => content.find(item=>item.slug===slug);
