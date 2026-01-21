
export enum DocumentType {
  TCT = 'TCT',
  OLYMEL = 'OLYMEL'
}

export interface TCTData {
  id: string;
  tournee: string;
  nom: string;
  debTour: string;
  finTour: string;
  clVeh: string;
  employe: string;
  nomEmploye: string;
  employeConfirm: string;
  vehicule: string;
  changement: string;
  changementPar: string;
  clVehAff: string;
  autoris: string;
  approuve: string;
  retour: string;
  adresseDebut: string;
  adresseFin: string;
}

export interface OlymelData {
  id: string;
  semaine: string;
  jour: string;
  date: string;
  debut: string;
  fin: string;
  duree: string;
  chauffeur: string;
  vehicule: string;
  notes: string;
}

export type ExtractionRow = TCTData | OlymelData;

export interface ExtractionResult {
  rows: ExtractionRow[];
  timestamp: string;
  modelUsed: string;
  docType: DocumentType;
}
