import { config } from './config.js';
export function createApi(settings = config, transport = fetch) {
  const url = settings.supabaseUrl.replace(/\/$/, '');
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && !!settings.publishableKey && !settings.publishableKey.startsWith('sb_secret_');
  let session = null;
  async function request(path, options = {}, authenticated = true) {
    const requestSession=session;
    if (!configured) throw new Error('Database non collegato. Il salvataggio non è ancora disponibile.');
    if (authenticated && !session) throw new Error('Accedi per continuare.');
    if (authenticated && session.expires_at <= Date.now()) {
      session = null;
      throw new Error('Sessione scaduta. Accedi nuovamente.');
    }
    let response;
    try {
      response = await transport(url + path, {
        ...options,
        headers: { apikey: settings.publishableKey, 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer ' + session.access_token } : {}), ...options.headers }
      });
    } catch { throw new Error('Connessione non disponibile. Verifica la rete e riprova.'); }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (path === '/auth/v1/user' && response.status === 422) throw new Error('Scegli una password diversa da quella attuale e sufficientemente sicura.');
      if (response.status === 401) { if(session===requestSession)session = null; throw new Error('Accesso non valido o scaduto. Accedi nuovamente.'); }
      if (response.status === 403 || body?.code === '42501') throw new Error('Il tuo ruolo non consente questa operazione.');
      if (response.status === 429) throw new Error('Sono arrivate molte richieste di prova. Attendi e riprova più tardi.');
      if (response.status === 400 && path.includes('/functions/')) throw new Error('Controlla i dati: usa solo dati inventati e un’email @example.test.');
      if (body?.code === '23505') throw new Error('Questa richiesta risulta già acquisita.');
      if (body?.code === '23514' || body?.code === '22023') throw new Error('Controlla i dati inseriti: non rispettano le regole della demo.');
      throw new Error('Operazione non completata. Riprova o contatta il responsabile della demo.');
    }
    return body;
  }
  return {
    configured,
    publicFormEnabled: settings.publicFormEnabled === true,
    async signIn(email, password) {
      const result = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({email,password}) }, false);
      session = {...result, expires_at: Date.now() + result.expires_in * 1000};
      return result.user;
    },
    async signOut() {
      const pending=session ? request('/auth/v1/logout', {method:'POST'}) : null;
      session=null;
      if(pending)await pending;
    },
    profile: () => request('/rest/v1/demo_staff?select=role,display_name,active'),
    updatePassword: (password) => request('/auth/v1/user', {method:'PUT',body:JSON.stringify({password})}),
    submitPublic: (student) => settings.publicFormEnabled === true
      ? request('/functions/v1/janus-demo-intake', {method:'POST',body:JSON.stringify(student)}, false)
      : Promise.reject(new Error('Invio dal form studente in attivazione.')),
    submit: async(student) => [await request('/rest/v1/rpc/demo_submit_staff_application', {method:'POST',body:JSON.stringify({p_data:student})})],
    search: (filters) => request('/rest/v1/rpc/demo_search_students_v3', {method:'POST',body:JSON.stringify(filters)}),
    application: (id) => request('/rest/v1/demo_applications?id=eq.'+encodeURIComponent(id)+'&select=id,given_name,family_name,email,birth_date,region,school_year,study_track,service_package,minor_at_submission'),
    guardian: (id) => request('/rest/v1/demo_application_guardians?application_id=eq.'+encodeURIComponent(id)+'&select=given_name,family_name,email,relationship,authority_declared,verified')
    ,department: (department,action='summary',offset=0) => request('/rest/v1/rpc/demo_department_data',{method:'POST',body:JSON.stringify({p_department:department,p_action:action,p_offset:offset})})
  };
}
