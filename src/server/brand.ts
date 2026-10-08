import "server-only";
import { cache } from "react";
import { getSettings } from "./settings";

export interface Brand {
  name: string;
  shortName: string;
  tagline: string;
  parentMinistry: string;
  founder: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  motto: string;
  mottoRef: string;
  logoUrl: string;
  markUrl: string;
  heroUrl: string | null;
  ogUrl: string;
  founderPhotoUrl: string;
  founderPhoto2Url: string;
  signatureUrl: string | null;
  flags: Record<string, boolean>;
  site: { carouselSeconds: number; footerNote: string; poweredBy: string; showPoweredBy: boolean; facebook: string; youtube: string; instagram: string; whatsapp: string; announcementBar: string };
}

const asset = (id: string | null | undefined) => (id ? `/api/v1/assets/${id}` : null);

/** Branding resolved once per request; every logo and picture in the UI comes from here, so it is all editable in the backend. */
export const getBrand = cache(async (): Promise<Brand> => {
  const s = await getSettings(["institution", "site", "branding", "featureFlags"]);
  return {
    name: s.institution.name,
    shortName: s.institution.shortName,
    tagline: s.institution.tagline,
    parentMinistry: s.institution.parentMinistry,
    founder: s.institution.founder,
    phone: s.institution.phone,
    email: s.institution.email,
    website: s.institution.website,
    address: s.institution.address,
    motto: s.institution.motto,
    mottoRef: s.institution.mottoRef,
    logoUrl: asset(s.branding.logoAssetId) ?? "/brand/logo-full-480.webp",
    markUrl: asset(s.branding.logoAssetId) ?? "/brand/logo-mark-128.png",
    heroUrl: asset(s.branding.heroAssetId),
    ogUrl: asset(s.branding.ogImageAssetId) ?? asset(s.branding.logoAssetId) ?? "/brand/logo-full-480.png",
    founderPhotoUrl: asset(s.branding.founderPhotoAssetId) ?? "/brand/founder-1.jpg",
    founderPhoto2Url: asset(s.branding.founderPhoto2AssetId) ?? "/brand/founder-2.jpg",
    signatureUrl: asset(s.branding.signatureAssetId),
    flags: s.featureFlags as unknown as Record<string, boolean>,
    site: s.site,
  };
});
