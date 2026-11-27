import {PACKAGES,STUDY_TRACKS,studyTrackLabel,packageLabel} from './domain.js';

const $=selector=>document.querySelector(selector);
let generation=0;
const invalid=()=>Error('I dati sono cambiati o non sono disponibili. Aggiorna la panoramica.');
export function percentage(count,total){if(!Number.isSafeInteger(count)||!Number.isSafeInteger(total)||count<0||count>total)throw invalid();return total===0?null:Math.round(count/total*1000)/10;}
const percent=value=>value===null?'—':value.toLocaleString('it-IT',{maximumFractionDigits:1})+'%';
function count(summary,key){const value=summary[key];if(!Number.isSafeInteger(value)||value<0)throw invalid();return value;}
export function groupedPreferences(rows,field){
 const counts=new Map();for(const row of rows){const value=row[field]||null;counts.set(value,(counts.get(value)||0)+1);}
 return [...counts].map(([key,value])=>({key,count:value,percent:percentage(value,rows.length)})).sort((a,b)=>b.count-a.count||String(a.key??'').localeCompare(String(b.key??''),'it'));
}
// Le azioni esistenti restituiscono 26 righe, con pagine utili di 25.
export async function readOverviewPages(api,department,action,expected,isCurrent=()=>true){
 const rows=[],seen=new Set();for(let offset=0;offset<10000;offset+=25){
  if(!isCurrent())throw Object.assign(Error('Consultazione superata'),{name:'AbortError'});
  const page=await api.department(department,action,offset);
  if(!Array.isArray(page)||page.length>26)throw invalid();
  for(const row of page.slice(0,25)){const id=action==='people'?row.user_id:row.id;if(!id||seen.has(id))throw invalid();seen.add(id);rows.push(row);}
  if(page.length<=25){if(rows.length!==expected)throw invalid();return rows;}
 }throw Error('Il riepilogo richiede piu dati del limite della demo.');
}
export function overviewModel(department,summary,rows=[],staff=[],audit=[]){
 const total=count(summary,'total'),minors=count(summary,'minors'),fromForm=count(summary,'from_form'),withPackage=count(summary,'with_package');
 for(const value of [minors,fromForm,withPackage])percentage(value,total);
 if(['commerciale','didattica'].includes(department)&&rows.length!==total)throw invalid();
 const common={total,ages:[{label:'Maggiorenni',count:total-minors,percent:percentage(total-minors,total)},{label:'Minorenni oggi',count:minors,percent:percentage(minors,total)}],source:[{label:'Dal form cliente',count:fromForm,percent:percentage(fromForm,total)},{label:'Altri inserimenti',count:total-fromForm,percent:percentage(total-fromForm,total)}],packageCoverage:[{label:'Pacchetto indicato',count:withPackage,percent:percentage(withPackage,total)},{label:'Da scegliere',count:total-withPackage,percent:percentage(total-withPackage,total)}]};
 if(department==='commerciale'||department==='didattica'){
  common.packages=groupedPreferences(rows,'service_package').map(item=>({...item,label:packageLabel(item.key)}));
  common.tracks=groupedPreferences(rows,'study_track').map(item=>({...item,label:item.key?studyTrackLabel(item.key):'Indirizzo da definire'}));
 }
 if(department==='segreteria'||department==='admin')common.pending=count(summary,'guardians_pending');
 if(department==='admin'){
  if(staff.length!==count(summary,'staff_accounts'))throw invalid();
  const active=staff.filter(person=>person.active===true);common.activeStaff=active.length;common.inactiveStaff=staff.length-active.length;
  const roles=['admin','commerciale','segreteria','didattica'];
  if(active.some(person=>!roles.includes(person.role)))throw invalid();
  const labels={admin:'Admin',commerciale:'Commerciale',segreteria:'Segreteria',didattica:'Didattica'};
  common.staffRoles=roles.map(role=>({label:labels[role],count:active.filter(person=>person.role===role).length,percent:percentage(active.filter(person=>person.role===role).length,active.length)}));
  common.recent=audit.slice(0,4).map(item=>({at:item.happened_at,actor:item.actor_name||'Form cliente',event:item.event==='created'?'Richiesta acquisita':item.event,reference:item.application_id}));
 }return common;
}
function node(tag,text,className){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}
export function animateDemoCount(element,value){
 if(!Number.isSafeInteger(value)||value<0){element.textContent='—';return;}
 element.dataset.count=String(value);const visual=node('span','0'),accessible=node('span',String(value),'demo-dash-sr');visual.setAttribute('aria-hidden','true');element.replaceChildren(visual,accessible);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||!value){visual.textContent=String(value);return;}
 let start;const tick=time=>{if(!element.isConnected)return;if(start===undefined)start=time;const t=Math.min(1,(time-start)/600);visual.textContent=Math.round(value*(1-(1-t)**3)).toLocaleString('it-IT');if(t<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);
}
function enabled(){return document.body.classList.contains('concept-d');}
function styles(){if($('#demo-overview-style'))return;const link=document.createElement('link');link.id='demo-overview-style';link.rel='stylesheet';link.href=new URL('./demo-overview.css',import.meta.url).href;document.head.append(link);}
export function clearDepartmentOverview(){generation++;$('#demo-overview')?.remove();$('#demo-overview-tools')?.remove();}
export function beginDepartmentOverview(refresh){
 clearDepartmentOverview();if(!enabled())return;styles();
 const bar=node('div',undefined,'demo-overview-tools');bar.id='demo-overview-tools';const status=node('p','Aggiornamento dei dati del reparto…');status.id='demo-overview-status';status.setAttribute('role','status');
 const button=node('button','Aggiorna panoramica','quiet');button.type='button';button.id='demo-overview-refresh';button.disabled=true;button.onclick=refresh;bar.append(status,button);$('#department-metrics').before(bar);
 const section=node('section',undefined,'demo-overview');section.id='demo-overview';section.setAttribute('aria-label','Panoramica del reparto');section.setAttribute('aria-busy','true');section.append(node('p','Caricamento dei grafici…','demo-dash-note'));$('#department-metrics').after(section);
}
export function failDepartmentOverview(message){if(!enabled())return;$('#demo-overview')?.replaceChildren(node('p',message,'demo-dash-error'));$('#demo-overview')?.setAttribute('aria-busy','false');if($('#demo-overview-refresh'))$('#demo-overview-refresh').disabled=false;if($('#demo-overview-status'))$('#demo-overview-status').textContent='Panoramica non aggiornata. Riprova senza cambiare reparto.';}
function svg(name,attrs={}){const element=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value]of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
function card(title,note){const element=node('article',undefined,'demo-dash-card');element.append(node('h3',title),node('p',note,'demo-dash-note'));return element;}
function action(buttonLabel,actionName,onAction){const button=node('button',buttonLabel,'quiet demo-dash-action');button.type='button';button.onclick=()=>onAction(actionName);return button;}
function bars(items,total){
 const list=node('ul',undefined,'demo-dash-bars');for(const item of items){const li=node('li'),label=node('div',undefined,'demo-dash-bar-label');label.append(node('span',item.label),node('strong',item.count+' · '+percent(item.percent)));const graphic=svg('svg',{viewBox:'0 0 100 7',preserveAspectRatio:'none','aria-hidden':'true'});graphic.append(svg('rect',{width:100,height:7,rx:3.5,class:'demo-dash-track'}),svg('rect',{width:item.percent??0,height:7,rx:3.5,class:'demo-dash-fill'}));li.append(label,graphic);list.append(li);}if(!items.length)list.append(node('li',total?'Distribuzione non disponibile.':'Nessuna scheda in questo perimetro.','demo-dash-note'));return list;
}
function ring(items,total){
 const wrap=node('div',undefined,'demo-dash-ring-wrap'),graphic=svg('svg',{viewBox:'0 0 100 100',role:'img','aria-label':items.map(item=>item.label+': '+item.count).join(', '),class:'demo-dash-ring'}),c=2*Math.PI*36;
 graphic.append(svg('circle',{cx:50,cy:50,r:36,fill:'none','stroke-width':11,class:'demo-dash-ring-base'}));let offset=0;
 items.forEach((item,i)=>{if(total&&item.count){const length=item.count/total*c;graphic.append(svg('circle',{cx:50,cy:50,r:36,fill:'none','stroke-width':11,'stroke-dasharray':length+' '+(c-length),'stroke-dashoffset':-offset,transform:'rotate(-90 50 50)',class:'demo-dash-segment demo-dash-color-'+i}));offset+=length;}});
 const value=svg('text',{x:50,y:52,'text-anchor':'middle',class:'demo-dash-ring-value'});value.textContent=String(total);const caption=svg('text',{x:50,y:64,'text-anchor':'middle',class:'demo-dash-ring-caption'});caption.textContent='schede';graphic.append(value,caption);
 const legend=node('ul',undefined,'demo-dash-legend');items.forEach((item,i)=>{const li=node('li'),dot=node('span',undefined,'demo-dash-dot demo-dash-color-'+i);dot.setAttribute('aria-hidden','true');li.append(dot,node('span',item.label),node('strong',item.count+' · '+percent(item.percent)));legend.append(li);});wrap.append(graphic,legend);return wrap;
}
export async function renderDepartmentOverview(department,summary,api,onAction){
 if(!enabled())return;const ticket=generation,current=()=>ticket===generation&&!!$('#demo-overview');
 try{
  let rows=[],staff=[],audit=[];
  if(department==='commerciale'||department==='didattica')rows=await readOverviewPages(api,department,'queue',count(summary,'total'),current);
  if(department==='admin')[staff,audit]=await Promise.all([readOverviewPages(api,department,'people',count(summary,'staff_accounts'),current),api.department(department,'audit',0)]);
  if(!current())return;const model=overviewModel(department,summary,rows,staff,audit),panels=[];
  if(department==='commerciale'){
   const first=card('Da dove arrivano le richieste','Percentuali sulle '+model.total+' schede visibili al tuo account.');first.append(ring(model.source,model.total),action('Apri le richieste','queue',onAction));
   const second=card('I pacchetti di maggiore interesse','Preferenze dichiarate, da verificare con il cliente.');second.append(bars(model.packages,model.total),action('Consulta offerte e percorsi','catalog',onAction));panels.push(first,second);
  }else if(department==='segreteria'){
   const first=card('Studenti maggiorenni e minorenni','Eta calcolata alla data odierna, sulle schede visibili.');first.append(ring(model.ages,model.total));
   const second=card('Le verifiche da aprire','Titoli dichiarati di genitori o tutori ancora da controllare.');const pending=node('strong',undefined,'demo-dash-highlight');animateDemoCount(pending,model.pending);second.append(pending,node('p','Dichiarazioni da verificare. Il contatore non attesta una verifica documentale.','demo-dash-note'),action('Apri genitori e tutori da verificare','guardians',onAction));panels.push(first,second);
  }else if(department==='didattica'){
   let items=model.tracks.slice(0,6);if(model.tracks.length>6){const count=model.tracks.slice(6).reduce((n,item)=>n+item.count,0);items.push({label:'Altri indirizzi',count,percent:percentage(count,model.total)});}
   const first=card('Le schede assegnate per indirizzo','Solo gli studenti assegnati nel perimetro di questo reparto.');first.append(bars(items,model.total),action('Apri le schede assegnate','queue',onAction));
   const second=card('I pacchetti degli studenti assegnati','Preferenze registrate nelle schede, non contratti approvati.');second.append(bars(model.packages,model.total),action('Apri il catalogo formativo','catalog',onAction));panels.push(first,second);
  }else if(department==='admin'){
   const first=card('Account attivi per ruolo',model.activeStaff+' attivi · '+model.inactiveStaff+' disattivati. Percentuali sui soli attivi.');first.append(bars(model.staffRoles,model.activeStaff),action('Consulta utenti e ruoli','people',onAction));
   const second=card('Ultimi inserimenti registrati','Eventi effettivamente presenti nel registro della demo.');const list=node('ol',undefined,'demo-dash-events');for(const event of model.recent){const li=node('li');li.append(node('strong',event.event),node('span',event.actor),node('time',new Date(event.at).toLocaleString('it-IT',{timeZone:'Europe/Rome'})));list.append(li);}second.append(model.recent.length?list:node('p','Nessun evento registrato.','demo-dash-note'),action('Apri il registro completo','audit',onAction));panels.push(first,second);
  }
  $('#demo-overview').replaceChildren(...panels);$('#demo-overview').setAttribute('aria-busy','false');$('#demo-overview-status').textContent='Aggiornato alle '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+' · Dati del reparto autorizzati.'+(model.total===0?' Nessuna scheda; percentuali non disponibili.':'');$('#demo-overview-refresh').disabled=false;
 }catch(error){if(current())failDepartmentOverview(error.message);}
}
