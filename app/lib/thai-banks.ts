// Thai Banks List for autocomplete
export const THAI_BANKS = [
  { code: "bbl", name: "ธนาคารกรุงเทพ" },
  { code: "kbank", name: "ธนาคารกสิกรไทย" },
  { code: "krungthai", name: "ธนาคารกรุงไทย" },
  { code: "scb", name: "ธนาคารไทยพาณิชย์" },
  { code: "bay", name: "ธนาคารกรุงศรีอยุธยา" },
  { code: "ttb", name: "ธนาคารทหารไทยธนชาต" },
  { code: "gsb", name: "ธนาคารออมสิน" },
  { code: "baac", name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร" },
  { code: "ghb", name: "ธนาคารอาคารสงเคราะห์" },
  { code: "isbt", name: "ธนาคารอิสลามแห่งประเทศไทย" },
  { code: "cimb", name: "ธนาคารซีไอเอ็มบีไทย" },
  { code: "uob", name: "ธนาคารยูโอบี" },
  { code: "lh", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์" },
  { code: "kk", name: "ธนาคารเกียรตินาคินภัทร" },
  { code: "tisco", name: "ธนาคารทิสโก้" },
] as const;

export type ThaiBank = (typeof THAI_BANKS)[number];

export function getBankByName(name: string): ThaiBank | undefined {
  return THAI_BANKS.find((bank) => bank.name === name);
}

export function getBankByCode(code: string): ThaiBank | undefined {
  return THAI_BANKS.find((bank) => bank.code === code);
}

export function searchBanks(query: string): ThaiBank[] {
  if (!query) return THAI_BANKS;
  const q = query.toLowerCase();
  return THAI_BANKS.filter(
    (bank) => bank.name.toLowerCase().includes(q) || bank.code.toLowerCase().includes(q)
  );
}
