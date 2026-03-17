const SERVER='http://localhost:3000'
let cfg={}
let totalMsgCount=0,msgLineCounter=0
const emoteMap={}
const dockLikeCount=new Map(),MAX_DOCK=20
const MAX_CHAT_NODES=150
const TC=['#FF0000','#0000FF','#00FF00','#B22222','#FF7F50','#9ACD32','#FF4500','#2E8B57','#DAA520','#D2691E','#5F9EA0','#1E90FF','#FF69B4','#8A2BE2','#00FF7F']
const KNOWN_BOTS=['nightbot','streamelements','fossabot','moobot','wizebot','botrix','streamlabs','sery_bot','stay_hydrated_bot']

const getColor=s=>{if(!s)return TC[0];let h=0;for(let i=0;i<s.length;i++)h=s.charCodeAt(i)+((h<<5)-h);return TC[Math.abs(h)%TC.length]}
const platIconSvg=spl=>{const icons={TT:'<rect width="18" height="18" rx="3" fill="#010101"/><path d="M12.1 4a3.2 3.2 0 01-2.5-2.8H7.7V11a1.9 1.9 0 01-1.9 1.7 1.9 1.9 0 01-1.9-1.9 1.9 1.9 0 011.9-1.9l.5.07V6.6a4.2 4.2 0 00-.5-.03A4.2 4.2 0 001.6 10.8a4.2 4.2 0 004.2 4.2 4.2 4.2 0 004.2-4.2V6.1a5.4 5.4 0 003.2 1V4.7a3.2 3.2 0 01-1.1-.7z" fill="#fff"/>',YT:'<rect width="18" height="18" rx="3" fill="#FF0000"/><polygon points="7.5,6.5 7.5,11.5 12,9" fill="#fff"/>',TW:'<rect width="18" height="18" rx="3" fill="#9147FF"/><path d="M4 2L3 4.8V14.6h3.8V16.5l2-1.9h2.8l4.4-4.4V2H4zm10.4 8.6L12 13H9.4L7.4 15V13H4.6V3.4H14.4V10.6zM11.4 5.4V9H10V5.4h1.4zm-3.4 0V9H6.6V5.4H8z" fill="#fff"/>'};return icons[spl]||icons.TT}
const esc=s=>String(s??'').replace(/[&<>"\`]/g,c=>({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' })[c])
const openLink=url=>window.electronAPI?.openExternal(url)||window.open(url,'_blank')
const nextBg=even=>{msgLineCounter++;return msgLineCounter%2===0?'linea-bg-even':'linea-bg-odd'}
