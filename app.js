import { createApi } from './api.js';
import { REGIONS, STUDY_TRACKS, PACKAGES, packageLabel, studyTrackLabel, validateStudent, parseFilters, todayISO, ageOn } from './domain.js';
import {setupEnrollmentForm,enrollmentData,showEnrollmentErrors} from './enrollment-ui.js';
export const api = createApi();
const $ = (selector) => document.querySelector(selector);
let role = null, page = 0, filters = {}, searchGeneration = 0, requestId = crypto.randomUUID(), saving = false;
let authGeneration=0,detailGeneration=0;
const pageSize = 25;
for (const select of document.querySelectorAll('.study-tracks')) for (const track of STUDY_TRACKS) select.add(new Option(studyTrackLabel(track),track));
for (const select of document.querySelectorAll('.region')) for (const region of REGIONS) select.add(new Option(region,region));
for (const select of document.querySelectorAll('.years')) for (const year of ['2025/2026','2026/2027','2027/2028']) select.add(new Option(year,year));
$('[name="birth_date"]').max = todayISO();
setupEnrollmentForm($('#student-form'));
for(const select of document.querySelectorAll('.package-filter'))for(const item of PACKAGES)select.add(new Option(item.name,item.id));
$('#connection').textContent = api.configured ? 'Ambiente di test collegato. Accedi per usare le funzioni.' : 'Database non collegato: accesso e salvataggio non sono ancora disponibili.';
$('#connection').classList.toggle('ready',api.configured);
$('#login-button').disabled = !api.configured;
export function view(name) {
  for (const id of ['search-view','form-view','receipt','password-view','detail-view','department-view']) {const section=$('#'+id);if(section)section.hidden = id !== name;}
  $('#show-search').setAttribute('aria-pressed',String(name === 'search-view'));
  $('#show-form').setAttribute('aria-pressed',String(name === 'form-view'));
  const titles={'search-view':'Studenti e richieste','form-view':'Inserisci uno studente','receipt':'Richiesta acquisita','password-view':'La mia password','detail-view':'Dettaglio richiesta'};
  if($('#workspace-title'))$('#workspace-title').textContent=titles[name]||'Gestionale Janus';
  if (name === 'form-view') $('#student-form [name="given_name"]').focus();
  if (name === 'receipt') $('#receipt').focus();
  if (name === 'password-view') $('#password-form [name=new_password]').focus();
  document.dispatchEvent(new CustomEvent('janus:view',{detail:{name}}));
}
function textCell(row,text) { const td = document.createElement('td'); td.textContent = text; row.append(td); return td; }
function clearResults() {
  ++searchGeneration; page=0; filters={};
  $('#results').replaceChildren(); $('#results-table').hidden=true; $('#pagination').hidden=true;
  $('#search-empty').hidden=false;
  $('#search-error').textContent='';
  $('#search-status').textContent='Scegli i filtri e premi Cerca studenti, oppure Mostra tutti gli studenti.';
}
async function search() {
  const generation = ++searchGeneration;
  $('#search-error').textContent = ''; $('#search-status').textContent = 'Ricerca in corso…';
  $('#results').replaceChildren(); $('#pagination').hidden = true; $('#results-table').hidden = true;
  $('#search-empty').hidden=true;
  try {
    const rows = await api.search({...filters,p_offset:page * pageSize,p_limit:pageSize + 1});
    if (generation !== searchGeneration) return;
    for (const item of rows.slice(0,pageSize)) {
      const row = document.createElement('tr');
      for (const value of [item.given_name + ' ' + item.family_name,item.email,item.region,item.age,item.school_year]) textCell(row,value);
      textCell(row,studyTrackLabel(item.study_track) || 'Non indicato').className='study-track-cell';
      textCell(row,packageLabel(item.service_package)).className='package-cell';
      if(item.is_minor){const minor=document.createElement('span');minor.className='minor-badge';minor.textContent='Minorenne';row.cells[3].append(minor);}
      const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = 'Ricevuta'; textCell(row,'').append(badge);
      const detail=document.createElement('button');detail.type='button';detail.className='quiet row-detail';detail.textContent='Apri';detail.setAttribute('aria-label','Apri richiesta di '+item.given_name+' '+item.family_name);detail.onclick=()=>openDetail(item.id);textCell(row,'').append(detail);
      $('#results').append(row);
    }
    $('#search-status').textContent = rows.length ? `${Math.min(rows.length,pageSize)} risultati in questa pagina` : 'Nessuno studente trovato. Prova a togliere un filtro.';
    $('#results-table').hidden = rows.length === 0;
    $('#pagination').hidden = page === 0 && rows.length <= pageSize;
    $('#previous').disabled = page === 0; $('#next').disabled = rows.length <= pageSize;
    $('#page-label').textContent = `Pagina ${page + 1}`;
  } catch (error) { if (generation === searchGeneration) { $('#search-error').textContent = error.message; $('#search-status').textContent = 'Ricerca non completata.'; } }
}
$('#login-form').addEventListener('submit',async(event) => {
  event.preventDefault(); $('#login-error').textContent = ''; $('#login-button').disabled = true;
  const form = new FormData(event.currentTarget);
  try {
    await api.signIn(form.get('email'),form.get('password'));
    const profiles = await api.profile(); const staff = profiles.find(p => p.active);
    if (!staff) { await api.signOut(); throw new Error('Account senza accesso operativo. Contatta il responsabile della demo.'); }
    role = staff.role; $('#account-label').textContent = `${staff.display_name} · ${role}`;
    ++authGeneration;
    $('#scope-label').textContent = role === 'commerciale' ? 'Visualizzi le richieste che hai inserito.' : role === 'didattica' ? 'Visualizzi soltanto gli studenti assegnati a te.' : 'Visualizzi le richieste dell’ambiente di prova.';
    $('#show-form').hidden = !['admin','commerciale','segreteria'].includes(role);
    $('#welcome').hidden = true; $('#workspace').hidden = false; $('#logout').hidden = false;
    $('#show-password').hidden = false;
    event.target.reset(); view('search-view'); clearResults();
    document.dispatchEvent(new CustomEvent('janus:authenticated',{detail:{role,displayName:staff.display_name}}));
  } catch (error) { $('#login-error').textContent = error.message; }
  finally { $('#login-button').disabled = !api.configured; }
});
$('#logout').addEventListener('click',async() => {
  ++searchGeneration;
  ++authGeneration;++detailGeneration;
  const signingOut=api.signOut();
  role = null; page = 0; filters = {}; requestId = crypto.randomUUID();
  $('#student-form').reset(); $('#search-form').reset(); $('#results').replaceChildren();
  $('#receipt-id').textContent = ''; $('#receipt-name').textContent = ''; $('#account-label').textContent = '';
  $('#workspace').hidden = true; $('#welcome').hidden = false; $('#logout').hidden = true;
  $('#show-password').hidden = true; $('#password-form').reset(); $('#password-status').textContent = ''; $('#password-error').textContent = '';
  for(const node of document.querySelectorAll('#detail-view dd'))node.textContent='';
  $('#detail-guardian-status').textContent='';$('#detail-error').textContent='';$('#detail-guardian').hidden=true;
  document.dispatchEvent(new CustomEvent('janus:signed-out'));
  try { await signingOut; } catch { /* Dati e sessione locali sono già cancellati. */ }
});
$('#show-form').onclick = () => view('form-view');
$('#show-search').onclick = $('#cancel-form').onclick = () => view('search-view');
$('#search-form').addEventListener('submit',(event) => {
  event.preventDefault(); try { filters = parseFilters(Object.fromEntries(new FormData(event.target))); page = 0; search(); }
  catch(error) { $('#search-error').textContent = error.message; }
});
$('#search-form').addEventListener('reset',clearResults);
$('#show-all-students').onclick = () => { $('#search-form').reset(); search(); };
$('#previous').onclick = () => { if(page > 0) { page--; search(); } };
$('#next').onclick = () => { page++; search(); };
$('#student-form').addEventListener('submit',async(event) => {
  event.preventDefault(); if(saving) return;
  const epoch=authGeneration;
  const data = enrollmentData(event.target);
  const errors = validateStudent(data);
  $('#submit-error').textContent = '';
  if(showEnrollmentErrors(event.target,errors))return;
  saving = true; $('#submit-button').disabled = true; $('#submit-button').textContent = 'Salvataggio in corso…';
  try {
    const rows = await api.submit({...data,request_id:requestId});
    if(epoch!==authGeneration)return;
    if(!rows?.[0]?.id) throw new Error('Conferma del database non ricevuta. Verifica nella ricerca prima di riprovare.');
    $('#receipt-name').textContent = `${data.given_name} ${data.family_name}`;
    $('#receipt-id').textContent = `Riferimento: ${rows[0].id}`;
    event.target.reset(); requestId = crypto.randomUUID(); view('receipt');
  } catch(error) { $('#submit-error').textContent = error.message; }
  finally { saving = false; $('#submit-button').disabled = false; $('#submit-button').textContent = 'Invia richiesta di prova'; }
});
$('#receipt-search').onclick = () => { $('#search-form').reset(); view('search-view'); };
$('#receipt-new').onclick = () => view('form-view');
export async function openDetail(id){
  const ticket=++detailGeneration,epoch=authGeneration;
  view('detail-view');$('#detail-error').textContent='';$('#detail-guardian').hidden=true;
  for(const node of document.querySelectorAll('#detail-view dd'))node.textContent='…';
  try{
    const rows=await api.application(id);if(ticket!==detailGeneration||epoch!==authGeneration)return;if(!rows.length)throw new Error('Richiesta non disponibile per il tuo account.');
    const item=rows[0];
    $('#detail-name').textContent=item.given_name+' '+item.family_name;
    $('#detail-email').textContent=item.email;$('#detail-birth').textContent=item.birth_date;
    $('#detail-track').textContent=studyTrackLabel(item.study_track)||'Non indicato';$('#detail-package').textContent=packageLabel(item.service_package);
    if(ageOn(item.birth_date)<18||item.minor_at_submission){
      $('#detail-guardian').hidden=false;
      const guardians=await api.guardian(id),guardian=guardians[0];
      if(ticket!==detailGeneration||epoch!==authGeneration)return;
      $('#detail-guardian-status').textContent=guardian?'Titolo dichiarato · Da verificare dal reparto competente':'Dati del genitore o tutore riservati ai reparti autorizzati.';
      $('#detail-guardian-name').textContent=guardian?guardian.given_name+' '+guardian.family_name:'Riservato';
      $('#detail-guardian-email').textContent=guardian?.email||'Riservato';
      $('#detail-guardian-relation').textContent=guardian?(guardian.relationship==='genitore'?'Genitore':'Tutore legale'):'Riservato';
    }
  }catch(error){if(ticket===detailGeneration&&epoch===authGeneration)$('#detail-error').textContent=error.message;}
}
$('#close-detail').onclick=()=>{++detailGeneration;view('search-view');};
$('#show-password').onclick = () => { $('#password-status').textContent=''; $('#password-error').textContent=''; view('password-view'); };
$('#cancel-password').onclick = () => { $('#password-form').reset(); view('search-view'); };
$('#password-form').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const form=event.currentTarget,password=form.elements.new_password.value,confirmation=form.elements.confirm_password.value;
  $('#password-error').textContent='';$('#password-status').textContent='';
  if(password.length<12){$('#password-error').textContent='Usa almeno 12 caratteri.';form.elements.new_password.focus();return;}
  if(password!==confirmation){$('#password-error').textContent='Le due password non coincidono.';form.elements.confirm_password.focus();return;}
  $('#save-password').disabled=true;
  try{
    const user=await api.updatePassword(password);
    if(!user?.id)throw new Error('Conferma non ricevuta. Verifica l’accesso prima di chiudere.');
    form.reset();$('#password-status').textContent='Password salvata. Dal prossimo accesso usa la nuova password scelta da te.';
  }catch(error){$('#password-error').textContent=error.message;}
  finally{$('#save-password').disabled=false;}
});
