import {PACKAGES,packageLabel,ageOn,validDate,todayISO} from './domain.js';
export function setupEnrollmentForm(form){
  const packageContainer=form.querySelector('[data-package-options]');
  if(packageContainer){
    for(const item of PACKAGES){
      const label=document.createElement('label');label.className='package-choice';
      const radio=document.createElement('input');radio.type='radio';radio.name='service_package';radio.value=item.id;
      const body=document.createElement('span');body.className='package-copy';
      const tag=document.createElement('span');tag.className='package-tag';tag.textContent=item.tag;
      const name=document.createElement('strong');name.textContent=item.name;
      const description=document.createElement('span');description.textContent=item.description;
      body.append(tag,name,description);label.append(radio,body);packageContainer.append(label);
    }
  }
  const guardian=form.querySelector('[data-guardian-section]');
  function update(){
    const group=form.elements.student_age_group.value;
    const show=group==='minor'||(validDate(form.elements.birth_date.value)&&ageOn(form.elements.birth_date.value)<18);
    guardian.hidden=!show;
    for(const input of guardian.querySelectorAll('input,select')){input.disabled=!show;if(!show){if(input.type==='checkbox')input.checked=false;else input.value='';}}
    const hint=form.querySelector('[data-age-hint]');
    if(validDate(form.elements.birth_date.value))hint.textContent=`Età calcolata: ${ageOn(form.elements.birth_date.value)} anni. Per gli studenti minorenni compila anche i dati del genitore o tutore.`;
    else hint.textContent='La data di nascita permette di verificare se servono i dati del genitore o tutore.';
    const summary=form.querySelector('[data-package-summary]');if(summary)summary.textContent=packageLabel(form.elements.service_package.value);
  }
  form.elements.birth_date.max=todayISO();
  form.elements.birth_date.addEventListener('change',()=>{
    if(validDate(form.elements.birth_date.value))form.elements.student_age_group.value=ageOn(form.elements.birth_date.value)<18?'minor':'adult';
    update();
  });
  form.addEventListener('change',update);form.addEventListener('reset',()=>queueMicrotask(update));update();
}
export function enrollmentData(form){
  const data=Object.fromEntries(new FormData(form));
  for(const key of ['given_name','family_name','email','guardian_given_name','guardian_family_name','guardian_email'])if(typeof data[key]==='string')data[key]=data[key].trim();
  data.email=(data.email||'').toLowerCase();data.guardian_email=(data.guardian_email||'').toLowerCase();
  data.synthetic_confirm=data.synthetic_confirm==='on';data.guardian_authority_confirm=data.guardian_authority_confirm==='on';
  data.study_track=data.study_track||null;data.service_package=data.service_package||null;
  if(validDate(data.birth_date)&&ageOn(data.birth_date)>=18){for(const key of Object.keys(data))if(key.startsWith('guardian_'))delete data[key];}
  return data;
}
export function showEnrollmentErrors(form,errors){
  for(const node of form.querySelectorAll('[data-error]')){
    const key=node.dataset.error;node.textContent=errors[key]||'';node.id='error-'+key;
    for(const input of form.querySelectorAll(`[name="${key}"]`)){input.setAttribute('aria-invalid',String(!!errors[key]));input.setAttribute('aria-describedby',node.id);}
  }
  const first=Object.keys(errors)[0];if(first)form.querySelector(`[name="${first}"]`)?.focus();
  return !!first;
}
