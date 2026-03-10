import { ChemicalInfo } from "../types";

export const fetchChemicalBySearch = async (query: string): Promise<ChemicalInfo | null> => {
  try {
    // 1. Get CID from name
    const searchRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON`);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const cid = searchData.IdentifierList.CID[0];

    // 2. Get properties
    const propsRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES,IsomericSMILES,InChI,InChIKey/JSON`);
    if (!propsRes.ok) return null;
    const propsData = await propsRes.json();
    const props = propsData.PropertyTable.Properties[0];

    // 3. Get official name (Title)
    let officialName = query;
    try {
      const nameRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/description/JSON`);
      if (nameRes.ok) {
        const nameData = await nameRes.json();
        officialName = nameData.InformationList.Information[0]?.Title || query;
      }
    } catch (e) {
      console.error("Failed to fetch official name", e);
    }

    // 4. Get description (summary)
    let description = "";
    try {
      const descRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/description/JSON`);
      if (descRes.ok) {
        const descData = await descRes.json();
        // Find the one with Description
        const info = descData.InformationList.Information.find((i: any) => i.Description);
        description = info?.Description || "";
      }
    } catch (e) {
      console.error("Failed to fetch description", e);
    }

    return {
      cid: props.CID,
      name: officialName,
      formula: props.MolecularFormula,
      molecularWeight: props.MolecularWeight,
      iupacName: props.IUPACName,
      smiles: props.CanonicalSMILES || props.IsomericSMILES || "N/A",
      inchi: props.InChI,
      inchiKey: props.InChIKey,
      description
    };
  } catch (error) {
    console.error("PubChem API Error:", error);
    return null;
  }
};

export const getChemicalImageUrl = (cid: number) => {
  return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`;
};
