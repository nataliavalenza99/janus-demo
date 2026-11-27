// Solo preferenza grafica sul dispositivo. Nessun dato del form o di accesso.
const storageKey='janus-demo-theme';
const body=document.body,header=document.querySelector('header.c-top,header.topbar');
let busy=false,darkStyles;
const initial=body.classList.contains('future-theme')?'dark':'light';
let current=initial;
function stored(){try{const value=localStorage.getItem(storageKey);return ['light','dark'].includes(value)?value:null;}catch{return null;}}
function loadDarkStyles(){
 if(document.querySelector('link[href$="futuro.css"]')?.sheet)return Promise.resolve();
 if(darkStyles)return darkStyles;
 darkStyles=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./futuro.css',import.meta.url).href;const timeout=setTimeout(()=>{link.remove();darkStyles=null;reject(Error('Tema non disponibile. Riprova.'));},12000);link.onload=()=>{clearTimeout(timeout);resolve();};link.onerror=()=>{clearTimeout(timeout);link.remove();darkStyles=null;reject(Error('Tema non disponibile. Riprova.'));};document.head.append(link);});return darkStyles;
}
const controls=document.createElement('div');controls.className='theme-switcher';controls.setAttribute('role','group');controls.setAttribute('aria-label','Tema della pagina');
const label=document.createElement('span');label.className='theme-mode-label';label.textContent='Aspetto';controls.append(label);
const buttons=[];
for(const [value,text]of [['light','Chiaro'],['dark','Scuro']]){const button=document.createElement('button');button.type='button';button.className='theme-mode-button';button.dataset.mode=value;button.textContent=text;button.addEventListener('click',()=>void applyTheme(value));buttons.push(button);controls.append(button);}
const status=document.createElement('span');status.className='theme-mode-status';status.setAttribute('role','status');controls.append(status);
function sync(){for(const button of buttons){button.setAttribute('aria-pressed',String(button.dataset.mode===current));button.disabled=busy;}controls.setAttribute('aria-busy',String(busy));}
function artwork(dark){
 const copy=document.querySelector('.staff-login-copy');
 if(dark&&copy&&!copy.querySelector('.future-login-photo')){const image=document.createElement('img');image.className='future-login-photo';image.src=new URL('./assets/janus-studio-editoriale.png',import.meta.url).href;image.alt='Immagine illustrativa generata: studio condiviso';copy.querySelector('p')?.after(image);}
 for(const image of document.querySelectorAll('.future-login-photo,.future-orbit,.future-banner-orbit'))image.hidden=!dark;
}
async function applyTheme(mode,save=true){
 if(busy||!['light','dark'].includes(mode))return;busy=true;sync();
 try{if(mode==='dark')await loadDarkStyles();body.classList.toggle('future-theme',mode==='dark');body.dataset.theme=mode;artwork(mode==='dark');current=mode;const caption=document.querySelector('.future-comparison>span');if(caption)caption.textContent=mode==='dark'?'JANUS / ASPETTO SCURO':'JANUS / ASPETTO CHIARO';for(const link of document.querySelectorAll('.future-comparison a'))if(/(?:iscrizione|gestionale)-d\.html$/.test(link.getAttribute('href')))link.textContent='Demo principale';status.removeAttribute('data-error');status.textContent=mode==='dark'?'Modalità scura attiva.':'Modalità chiara attiva.';if(save)try{localStorage.setItem(storageKey,mode);}catch{/* Scelta valida per questa pagina anche se il salvataggio locale non e' disponibile. */}}
 catch(error){status.setAttribute('data-error','true');status.textContent=error.message;}
 finally{busy=false;sync();}
}
if(header){header.classList.add('demo-theme-header');const trailing=header.querySelector('.account,.c-employee');header.insertBefore(controls,trailing??null);}
sync();void applyTheme(stored()??initial,false);
