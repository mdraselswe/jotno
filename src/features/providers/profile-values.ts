import type { VetProfileValues } from "./components/vet-profile-form";

/** Poisha → the fee box's text, keeping poisha: 35000 → "350", 35050 → "350.50". */
export function vetFeeInput(poisha: number): string {
  return poisha % 100 === 0 ? String(poisha / 100) : (poisha / 100).toFixed(2);
}

interface StoredProfile {
  displayName: string;
  title: string | null;
  bio: string | null;
  qualifications: string | null;
  registrationNo: string | null;
  nameNidBn: string | null;
  experienceYears: number | null;
  consultFee: number;
  visitFee: number;
  clinicName: string | null;
  address: string | null;
  districtId: number | null;
  areaId: number | null;
  lat: number | null;
  lon: number | null;
  phonePublic: string | null;
  emergency24x7: boolean;
  homeVisit: boolean;
  photoPath: string | null;
  speciesIds: number[];
}

/** A stored vet profile as the form's starting values (fees in taka with poisha, blanks as ""). */
export function vetProfileValues(p: StoredProfile): VetProfileValues {
  return {
    displayName: p.displayName,
    title: p.title ?? "",
    bio: p.bio ?? "",
    qualifications: p.qualifications ?? "",
    registrationNo: p.registrationNo ?? "",
    nameNidBn: p.nameNidBn ?? "",
    experienceYears: p.experienceYears == null ? "" : String(p.experienceYears),
    consultFeeTaka: vetFeeInput(p.consultFee),
    visitFeeTaka: vetFeeInput(p.visitFee),
    clinicName: p.clinicName ?? "",
    address: p.address ?? "",
    districtId: p.districtId,
    areaId: p.areaId,
    lat: p.lat,
    lon: p.lon,
    phonePublic: p.phonePublic ?? "",
    emergency24x7: p.emergency24x7,
    homeVisit: p.homeVisit,
    photoPath: p.photoPath,
    speciesIds: p.speciesIds,
  };
}
