export interface ChemicalInfo {
  cid: number;
  name: string;
  formula: string;
  molecularWeight: string;
  iupacName: string;
  smiles: string;
  inchi: string;
  inchiKey: string;
  description?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  chemicalData?: ChemicalInfo;
}
