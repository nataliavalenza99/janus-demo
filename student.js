import {createApi} from './api.js';
import {setupEnrollmentForm,enrollmentData,showEnrollmentErrors} from './enrollment-ui.js';
import {REGIONS,STUDY_TRACKS,studyTrackLabel,validateStudent,todayISO} from './domain.js';
const api=createApi(),$=s=>document.querySelector(s),form=$('#student-form');
let requestId=crypto.randomUUID(),saving=false;
for(const region of REGIONS) form.elements.region.add(new Option(region,region));
for(const track of STUDY_TRACKS)form.elements.study_track.add(new Option(studyTrackLabel(track),track));
form.elements.birth_date.max=todayISO();
setupEnrollmentForm(form);
function updateSummary(){
  const name=[form.elements.given_name.value.trim(),form.elements.family_name.value.trim()].filter(Boolean).join(' ');
  if($('#summary-name'))$('#summary-name').textContent=name||'Da compilare';
  if($('#summary-year'))$('#summary-year').textContent=form.elements.school_year.value||'Da indicare';
  if($('#summary-track'))$('#summary-track').textContent=studyTrackLabel(form.elements.study_track.value)||'Non indicato';
}
form.addEventListener('input',updateSummary);
form.addEventListener('change',updateSummary);
form.addEventListener('reset',()=>queueMicrotask(updateSummary));
if(!api.publicFormEnabled){
  $('#submit-button').disabled=true;$('#submit-button').textContent='Invio temporaneamente sospeso';
  $('.student-help').textContent='Aggiornamento del form in corso. L’invio sarà riattivato al termine delle verifiche.';
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(saving)return;
  const data=enrollmentData(form);
  const errors=validateStudent(data);
  $('#submit-error').textContent='';
  if(showEnrollmentErrors(form,errors))return;
  saving=true;$('#submit-button').disabled=true;$('#submit-button').textContent='Invio in corso…';
  try{
    const receipt=await api.submitPublic({...data,request_id:requestId});
    if(!receipt?.id)throw new Error('Conferma non disponibile. Riprova senza chiudere questa pagina.');
    $('#receipt-name').textContent=data.given_name+' '+data.family_name;$('#receipt-id').textContent='Riferimento: '+receipt.id;
    $('#student-entry').hidden=true;$('#receipt').hidden=false;$('#receipt').focus();form.reset();requestId=crypto.randomUUID();
  }catch(error){$('#submit-error').textContent=error.message;}
  finally{saving=false;$('#submit-button').disabled=false;$('#submit-button').textContent='Invia richiesta di prova →';}
});
$('#new-request').onclick=()=>{$('#receipt').hidden=true;$('#student-entry').hidden=false;form.elements.given_name.focus();};
