import {api,view,openDetail} from './app.js';
import {PACKAGES,STUDY_TRACKS,studyTrackLabel,packageLabel} from './domain.js';
const $=s=>document.querySelector(s);
const departments={
 commerciale:{number:'01',title:'Commerciale',subtitle:'Il portafoglio delle richieste e le preferenze degli studenti.',color:'coral',tasks:[['queue','Apri le richieste','Consulta il portafoglio consentito al tuo account.'],['catalog','Offerte e percorsi','I quattro pacchetti e i dodici indirizzi di studio.']]},
 segreteria:{number:'02',title:'Segreteria',subtitle:'Le richieste ricevute e i dati dichiarati da verificare.',color:'blue',tasks:[['guardians','Genitori e tutori da verificare','Richieste con titolo dichiarato ancora non verificato.'],['queue','Richieste ricevute','Apri la coda delle anagrafiche disponibili.']]},
 didattica:{number:'03',title:'Didattica',subtitle:'Gli studenti assegnati e i percorsi di preparazione.',color:'mint',tasks:[['queue','Studenti assegnati','Consulta solo gli studenti nel perimetro previsto.'],['catalog','Catalogo formativo','Esplora indirizzi e preferenze di pacchetto.']]},
 admin:{number:'04',title:'Admin',subtitle:'La visione trasversale degli accessi e delle registrazioni.',color:'lilac',tasks:[['people','Utenti e ruoli','Consulta account, ruoli e stato attivo della demo.'],['audit','Registro inserimenti','Autori e date degli inserimenti realmente avvenuti.']]}
};
let active=null,identity=null,generation=0,summaryGeneration=0,offset=0,lastAction=null;
function node(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function message(text){$('#department-error').textContent=text;}
function metrics(data){
 const values=active==='admin'?[['Richieste visibili',data.total],['Account operativi',data.staff_accounts],['Eventi registrati',data.audit_events],['Titoli da verificare',data.guardians_pending]]:active==='segreteria'?[['Richieste ricevute',data.total],['Studenti minorenni',data.minors],['Titoli da verificare',data.guardians_pending],['Pacchetto indicato',data.with_package]]:active==='didattica'?[['Studenti assegnati',data.total],['Studenti minorenni',data.minors],['Pacchetto indicato',data.with_package],['Invii dal form',data.from_form]]:[['Richieste visibili',data.total],['Invii dal form',data.from_form],['Pacchetto indicato',data.with_package],['Studenti minorenni',data.minors]];
 $('#department-metrics').replaceChildren();for(const [label,value]of values){const box=node('div','department-metric');box.append(node('span','',label),node('strong','',String(value??'—')));$('#department-metrics').append(box);}
}
async function selectDepartment(key){
 const spec=departments[key];if(!spec||!identity)return;
 const ticket=++summaryGeneration;++generation;active=key;offset=0;lastAction=null;
 view('department-view');$('#workspace-title').textContent=spec.title;
 $('#department-view').dataset.department=key;$('#department-number').textContent=spec.number;
 $('#department-title').textContent=spec.title;$('#department-description').textContent=spec.subtitle;
 $('#department-scope').textContent='Verifica del perimetro…';message('');
 for(const button of document.querySelectorAll('[data-department]'))if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.department===key));
 $('#department-output').hidden=true;$('#department-metrics').replaceChildren();$('#department-tasks').replaceChildren();
 for(const [action,title,description]of spec.tasks){const button=node('button','department-task');button.type='button';button.append(node('strong','',title),node('span','',description),node('b','task-arrow','↗'));button.onclick=()=>runAction(action);$('#department-tasks').append(button);}
 const search=node('button','department-task');search.type='button';search.append(node('strong','','Ricerca libera'),node('span','','Nome, email, regione, età, anno, indirizzo e pacchetto.'),node('b','task-arrow','↗'));search.onclick=()=>view('search-view');$('#department-tasks').append(search);
 try{const summary=await api.department(key);if(ticket!==summaryGeneration)return;metrics(summary);$('#department-scope').textContent=summary.scope;}
 catch(error){if(ticket===summaryGeneration){message(error.message);$('#department-scope').textContent='Accesso al reparto non disponibile.';}}
 $('#department-limit').textContent=key==='commerciale'?'Operativo nella demo: ricezione, consultazione, inserimento e cataloghi. Trattative, approvazioni commerciali e inviti personalizzati restano nelle fasi successive.':key==='segreteria'?'Operativo nella demo: richieste, dettagli del genitore/tutore e coda dei titoli dichiarati. Approvazione documentale e passaggio alla Didattica non sono ancora eseguiti da questa demo.':key==='didattica'?'Operativo nella demo: consultazione degli studenti assegnati e cataloghi. Piani didattici, assegnazione tutor e lezioni restano nelle fasi successive.':'Operativo nella demo: lettura trasversale, account/ruoli e audit degli inserimenti. Non sono presenti modifiche dei ruoli o approvazioni sostitutive.';
}
function table(headers,rows,formatter){
 const wrap=node('div','table-wrap');const t=node('table');const head=node('thead');const row=node('tr');for(const label of headers)row.append(node('th','',label));head.append(row);const body=node('tbody');
 for(const item of rows){const r=node('tr');for(const value of formatter(item)){const td=node('td');if(value instanceof Node)td.append(value);else td.textContent=String(value??'—');r.append(td);}body.append(r);}t.append(head,body);wrap.append(t);return wrap;
}
function catalog(){
 const grid=node('div','role-catalog-grid');for(const p of PACKAGES){const card=node('article','role-catalog-card');card.append(node('span','',p.tag),node('h3','',p.name),node('p','',p.description));grid.append(card);}
 const tracks=node('div','role-track-list');for(const item of STUDY_TRACKS)tracks.append(node('span','',studyTrackLabel(item)));
 $('#department-content').append(grid,node('h3','role-subtitle','Indirizzi di studio'),tracks);
}
async function runAction(action,page=0){
 if(!active)return;const key=active,ticket=++generation;lastAction=action;offset=page;
 $('#department-output').hidden=false;$('#department-content').replaceChildren();$('#department-pagination').hidden=true;message('');
 const label=departments[key].tasks.find(t=>t[0]===action)?.[1]||'Consultazione';$('#department-output-title').textContent=label;
 if(action==='catalog'){catalog();return;}
 $('#department-content').append(node('p','','Caricamento in corso…'));
 try{
  const data=await api.department(key,action,page*25);if(ticket!==generation)return;$('#department-content').replaceChildren();
  if(!data.length){$('#department-content').append(node('p','role-empty','Nessuna voce disponibile in questo perimetro.'));return;}
  const rows=data.slice(0,25);
  if(action==='people')$('#department-content').append(table(['Operatore','Ruolo','Stato'],rows,r=>[r.display_name,r.role,r.active?'Attivo':'Disattivato']));
  else if(action==='audit')$('#department-content').append(table(['Data','Autore','Evento','Riferimento richiesta'],rows,r=>[new Date(r.happened_at).toLocaleString('it-IT',{timeZone:'Europe/Rome'}),r.actor_name,r.event==='created'?'Richiesta acquisita':r.event,r.application_id]));
  else $('#department-content').append(table(['Studente','Email','Percorso','Pacchetto','Scheda'],rows,r=>{const button=node('button','quiet row-detail','Apri');button.type='button';button.onclick=()=>openDetail(r.id);return[r.given_name+' '+r.family_name,r.email,studyTrackLabel(r.study_track)||'Non indicato',packageLabel(r.service_package),button];}));
  $('#department-pagination').hidden=page===0&&data.length<=25;$('#department-previous').disabled=page===0;$('#department-next').disabled=data.length<=25;$('#department-page-label').textContent='Pagina '+(page+1);
 }catch(error){if(ticket===generation){$('#department-content').replaceChildren();message(error.message);}}
}
document.addEventListener('janus:authenticated',event=>{
 identity=event.detail;$('#department-nav').replaceChildren();
 const allowed=identity.role==='admin'?Object.keys(departments):[identity.role];
 for(const key of allowed){if(!departments[key])continue;const spec=departments[key],button=node('button','department-tab');button.type='button';button.dataset.department=key;button.append(node('span','',spec.number),node('strong','',spec.title));button.onclick=()=>selectDepartment(key);$('#department-nav').append(button);}
 selectDepartment(identity.role==='admin'?'admin':identity.role);
});
document.addEventListener('janus:view',event=>{if(event.detail.name!=='department-view'){++generation;++summaryGeneration;for(const button of document.querySelectorAll('button[data-department]'))button.setAttribute('aria-pressed','false');}});
document.addEventListener('janus:signed-out',()=>{++generation;++summaryGeneration;identity=null;active=null;$('#department-nav').replaceChildren();$('#department-metrics').replaceChildren();$('#department-content').replaceChildren();$('#department-error').textContent='';});
$('#department-previous').onclick=()=>runAction(lastAction,Math.max(0,offset-1));$('#department-next').onclick=()=>runAction(lastAction,offset+1);
