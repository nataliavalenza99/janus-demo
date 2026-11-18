// Catalogo fornito dall'utente il 17 novembre 2026; nessun percorso aggiunto.
export const STUDY_TRACKS = [
  'Liceo classico',
  'Liceo scienze umane',
  'Liceo economico sociale',
  'Liceo linguistico',
  'Liceo scientifico sportivo',
  'Liceo scienze applicate',
  'Istituto tecnico del turismo',
  'Amministrazione, finanza e marketing',
  'Istituto tecnico tecnologico informatico',
  'IPSSAS (ex socio-sanitario)',
  'IPSEOA (Istituto professionale per l’enogastronomia e l’ospitalità alberghiera)',
  'MME (Meccanica ed energia)'
];

// Etichette visibili; i valori già salvati rimangono stabili.
const DISPLAY_LABELS = [
  'Liceo Classico',
  'Liceo Scienze Umane',
  'Liceo Economico Sociale',
  'Liceo Linguistico',
  'Liceo Scientifico Sportivo',
  'Liceo Scienze Applicate',
  'Istituto Tecnico del Turismo',
  'Amministrazione, Finanza e Marketing',
  'Istituto Tecnico Tecnologico Informatico',
  'IPSSAS (ex Socio-Sanitario)',
  'IPSEOA (Istituto Professionale per l’Enogastronomia e l’Ospitalità Alberghiera)',
  'MME (Meccanica ed Energia)'
];
export function studyTrackLabel(value) {
  const index = STUDY_TRACKS.indexOf(value);
  return index < 0 ? value : DISPLAY_LABELS[index];
}
