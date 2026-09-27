'use strict';
const characters = [
  {id:'olli',name:'올리',color:'#c8df26',description:'연두색 실루엣과 흰 머리 돌기를 살린 대표 캐릭터',points:['선택창: 큰 눈과 크림색 배로 A-1 메인과 자연스럽게 연결합니다.','게임판: 작은 소품 없이 흰 머리 돌기와 연두색 몸으로 구분합니다.','검토 포인트: 얼굴·배 비율과 밝은 녹색의 강도를 봐주세요.']},
  {id:'woni',name:'원이',color:'#ffdd32',description:'밝은 노랑과 잎 장식으로 눈에 띄는 동행 캐릭터',points:['선택창: 짧은 날개 인사와 넓은 부리로 친근함을 표현합니다.','게임판: 노란색 칸에서도 구분되도록 밝은 받침과 녹색 테두리를 둡니다.','검토 포인트: 잎 장식과 몸의 둥근 정도가 공식 원형과 잘 맞는지 봐주세요.']},
  {id:'danji',name:'단지',color:'#f5a2b7',description:'분홍색 몸, 볼과 작은 꽃 장식을 살린 캐릭터',points:['선택창: 코·귀·볼·꽃을 중심으로 부드럽게 표현합니다.','게임판: 하트 소품을 생략하고 분홍색 실루엣과 꽃 장식으로 구분합니다.','검토 포인트: 작은 말에서 꽃과 귀가 과하게 커 보이지 않는지 봐주세요.']},
  {id:'dalli',name:'달리',color:'#bd8449',description:'크림색 몸과 비대칭 갈색 무늬가 특징인 캐릭터',points:['선택창: 비대칭 귀와 눈 주변 갈색 무늬를 유지합니다.','게임판: 가방·모자 없이 작은 점프 포즈로 이동감을 표현합니다.','검토 포인트: 공식 원형과 비교해 얼굴 무늬·밝은 배 영역의 비율을 봐주세요.']},
  {id:'kori',name:'코리',color:'#acd6ef',description:'큰 귀와 굽은 코, 파란 상의를 살린 캐릭터',points:['선택창: 큰 귀와 파란 상의를 유지해 다른 캐릭터와 구분합니다.','게임판: 키보다 귀의 가로 폭을 기준으로 맞춰 옆 칸을 가리지 않게 합니다.','검토 포인트: 작은 크기에서도 코·눈·귀의 구분이 유지되는지 봐주세요.']}
];
const storageKey = 'pension-road-design-review-allone-2026-09-15';
const labels = {undecided:'미정',candidate:'채택 검토',revise:'수정 검토',hold:'보류'};
let notes = {};
try {const saved=JSON.parse(localStorage.getItem(storageKey)||'{}'); if(saved && typeof saved==='object' && !Array.isArray(saved)) notes=saved;} catch {}
let active='olli';
const nav=document.querySelector('.characters');
const overview=document.querySelector('#overview');
for(const [index,c] of characters.entries()){
  const button=document.createElement('button');button.className='character';button.dataset.id=c.id;button.style.setProperty('--color',c.color);button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',c.name+' 시안 보기');
  button.innerHTML=`<span class="swatch" aria-hidden="true"></span><span><b>${c.name}</b><small>0${index+1} · 시안 보기</small></span>`;
  button.addEventListener('click',()=>show(c.id));nav.append(button);
  const card=document.createElement('a');card.className='thumb';card.href='#'+c.id;
  card.innerHTML=`<img src="assets/${c.id}-review.png" alt="${c.name} 디자인 시안" width="1536" height="1024" loading="lazy"><div><b>0${index+1} ${c.name}</b><small data-status="${c.id}">미정</small></div>`;
  card.addEventListener('click',event=>{event.preventDefault();show(c.id);document.querySelector('.work').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});overview.append(card);
}
function review(id){const n=notes[id];return {decision:n&&Object.hasOwn(labels,n.decision)?n.decision:'undecided',memo:n&&typeof n.memo==='string'?n.memo:''};}
function show(id){
  const c=characters.find(x=>x.id===id)||characters[0];active=c.id;
  for(const b of nav.children)b.setAttribute('aria-pressed',String(b.dataset.id===active));
  document.querySelector('#number').textContent=`CHARACTER 0${characters.indexOf(c)+1} / 05`;
  document.querySelector('#character-name').textContent=c.name;document.querySelector('#description').textContent=c.description;
  const sheet=document.querySelector('#sheet');sheet.src=`assets/${c.id}-review.png`;sheet.alt=`${c.name}의 선택창, 게임판 말, 대기·이동·도착 포즈 디자인 시안`;
  document.querySelector('#original-link').href=sheet.src;
  const ref=document.querySelector('#reference');ref.src=`references/${c.id}-official.png`;ref.alt=`농협 공식 ${c.name} 원형`;
  document.querySelector('#points').replaceChildren(...c.points.map(p=>{const li=document.createElement('li');li.textContent=p;return li;}));
  document.querySelector('#decision').value=review(active).decision;document.querySelector('#memo').value=review(active).memo;
  for(const s of document.querySelectorAll('[data-status]'))s.textContent=labels[review(s.dataset.status).decision];
  try{history.replaceState(null,'','#'+c.id);}catch{}
}
function save(){
  notes[active]={decision:document.querySelector('#decision').value,memo:document.querySelector('#memo').value};
  try{localStorage.setItem(storageKey,JSON.stringify(notes));document.querySelector('#save-state').textContent='이 브라우저에 검토 의견을 저장했습니다. 게임에는 반영되지 않습니다.';}catch{document.querySelector('#save-state').textContent='브라우저 저장을 사용할 수 없습니다. 검토 의견 내려받기로 보관해 주세요.';}
  document.querySelector(`[data-status="${active}"]`).textContent=labels[notes[active].decision];
}
document.querySelector('#decision').addEventListener('change',save);document.querySelector('#memo').addEventListener('input',save);
document.querySelector('#export').addEventListener('click',()=>{
  const result={project:'연금로드',review:'올원프렌즈 캐릭터 5종',createdAt:new Date().toISOString(),items:characters.map(c=>({id:c.id,name:c.name,status:labels[review(c.id).decision],memo:review(c.id).memo})),gameChangesApplied:false};
  const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='연금로드-캐릭터-디자인-검토.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
show(location.hash.slice(1));
