// Nomi e descrizioni forniti dall'utente, nessun prezzo o contenuto aggiunto.
export const PACKAGES = [
  {id:'gold-digital',name:'Janus Gold Digital',description:'Eccellenza dello studio on-demand',tag:'On-demand'},
  {id:'gold-academy-live',name:'Janus Gold Academy Live',description:'Tecnologia Janus potenziata dalle lezioni live',tag:'Lezioni live'},
  {id:'gold-experience',name:'Janus Gold Experience',description:'Percorso d’élite su misura per te',tag:'Su misura'},
  {id:'summer-rescue',name:'Janus Summer Rescue',description:'Recupero intelligente e conveniente',tag:'Recupero'}
];
export function packageLabel(id){return PACKAGES.find(p=>p.id===id)?.name||'Non indicato';}
