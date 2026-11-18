import {enrollmentData,showEnrollmentErrors} from './enrollment-ui.js';
import {validateStudent} from './domain.js';
const form=document.querySelector('#student-form'),steps=[...document.querySelectorAll('.wizard-step')],tabs=[...document.querySelectorAll('[data-wizard-step]')];
let current=0,furthest=0;
const fields=[['given_name','family_name','birth_date','email','student_age_group','guardian_given_name','guardian_family_name','guardian_email','guardian_relationship','guardian_authority_confirm'],['region','school_year','study_track','service_package']];
function go(index){current=index;furthest=Math.max(furthest,index);steps.forEach((step,i)=>step.hidden=i!==index);tabs.forEach((tab,i)=>{tab.disabled=i>furthest;tab.setAttribute('aria-current',i===index?'step':'false');tab.classList.toggle('done',i<index);});document.querySelector('#wizard-position').textContent=`PASSO ${index+1} DI 3`;document.querySelector('#wizard-progress').style.width=((index+1)/3*100)+'%';}
function validStep(){const errors=validateStudent(enrollmentData(form));const relevant=Object.fromEntries(Object.entries(errors).filter(([key])=>fields[current]?.includes(key)));return !showEnrollmentErrors(form,relevant);}
document.querySelectorAll('[data-wizard-next]').forEach(button=>button.onclick=()=>{if(validStep()){go(Math.min(2,current+1));steps[current].querySelector('input,select,button')?.focus();}});
document.querySelectorAll('[data-wizard-back]').forEach(button=>button.onclick=()=>go(Math.max(0,current-1)));
tabs.forEach((tab,i)=>tab.onclick=()=>{if(i<=furthest)go(i);});
form.addEventListener('submit',event=>{const errors=validateStudent(enrollmentData(form));if(!Object.keys(errors).length)return;event.preventDefault();event.stopImmediatePropagation();const first=Object.keys(errors)[0];go(fields[0].includes(first)?0:fields[1].includes(first)?1:2);showEnrollmentErrors(form,errors);},true);
document.querySelector('#new-request').addEventListener('click',()=>{furthest=0;go(0);});go(0);
