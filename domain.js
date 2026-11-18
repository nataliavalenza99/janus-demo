export const REGIONS = ['Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana','Trentino-Alto Adige','Umbria',"Valle d’Aosta",'Veneto'];
import { STUDY_TRACKS, studyTrackLabel } from './study-tracks.js';
import { PACKAGES, packageLabel } from './packages.js';
export { STUDY_TRACKS, studyTrackLabel };
export { PACKAGES, packageLabel };
export function todayISO() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
}
export function ageOn(birth, today = todayISO()) {
  const [y,m,d] = today.split('-').map(Number);
  const [by,bm,bd] = birth.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(+date) && date.toISOString().slice(0,10) === value;
}
export function validateStudent(data, today = todayISO()) {
  const errors = {};
  for (const field of ['given_name','family_name']) {
    if (!data[field]?.trim() || data[field].trim().length > 80) errors[field] = 'Inserisci da 1 a 80 caratteri.';
  }
  if (!validDate(data.birth_date) || data.birth_date > today || ageOn(data.birth_date,today) > 100) errors.birth_date = 'Inserisci una data valida, non futura, entro gli ultimi 100 anni.';
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@example\.test$/i.test(data.email || '') || data.email.length > 160) errors.email = 'Per questa demo usa un indirizzo inventato: nome@example.test.';
  if (!REGIONS.includes(data.region)) errors.region = 'Scegli una regione.';
  if (data.study_track && !STUDY_TRACKS.includes(data.study_track)) errors.study_track = 'Scegli un indirizzo presente nell’elenco Janus.';
  if (data.service_package && !PACKAGES.some(p=>p.id===data.service_package)) errors.service_package='Scegli uno dei pacchetti Janus elencati.';
  if (validDate(data.birth_date) && data.birth_date<=today) {
    const minor=ageOn(data.birth_date,today)<18;
    if(data.student_age_group && data.student_age_group!==(minor?'minor':'adult'))errors.student_age_group='La scelta deve corrispondere alla data di nascita dello studente.';
    if(minor){
      for(const field of ['guardian_given_name','guardian_family_name'])if(typeof data[field]!=='string'||!data[field].trim()||data[field].trim().length>80)errors[field]='Inserisci nome e cognome del genitore o tutore.';
      if(!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@example\.test$/i.test(data.guardian_email||'')||(data.guardian_email||'').length>160)errors.guardian_email='Usa un’email inventata del genitore o tutore: nome@example.test.';
      if(!['genitore','tutore_legale'].includes(data.guardian_relationship))errors.guardian_relationship='Indica se compili come genitore o tutore legale.';
      if(data.guardian_authority_confirm!==true)errors.guardian_authority_confirm='Conferma di compilare come genitore o tutore dello studente.';
    }
  }
  if (!/^20\d{2}\/20\d{2}$/.test(data.school_year || '') || Number(data.school_year.slice(5)) !== Number(data.school_year.slice(0,4)) + 1) errors.school_year = 'Scegli un anno scolastico valido.';
  if (data.synthetic_confirm !== true) errors.synthetic_confirm = 'Conferma di usare esclusivamente dati inventati.';
  return errors;
}
export function parseFilters(data) {
  const params = {};
  for (const [key, target] of Object.entries({name:'p_name',email:'p_email',region:'p_region',school_year:'p_school_year',study_track:'p_study_track',service_package:'p_service_package'})) {
    const value = String(data[key] || '').trim();
    if (value.length > 160) throw new Error('Il filtro è troppo lungo.');
    params[target] = value || null;
  }
  for (const [key,target] of [['min_age','p_min_age'],['max_age','p_max_age']]) {
    const raw = String(data[key] ?? '').trim();
    if (raw !== '' && (!/^\d+$/.test(raw) || Number(raw) > 100)) throw new Error('L’età deve essere un numero da 0 a 100.');
    params[target] = raw === '' ? null : Number(raw);
  }
  if (params.p_min_age !== null && params.p_max_age !== null && params.p_min_age > params.p_max_age) throw new Error('L’età minima supera quella massima.');
  return params;
}
