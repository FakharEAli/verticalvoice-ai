import { registerIndustryPack, hasIndustryPack } from "@/industries/core/registry";
import { healthcarePack } from "@/industries/healthcare/pack";
import { restaurantPack } from "@/industries/restaurant/pack";
import { realEstatePack } from "@/industries/real-estate/pack";

const packs = [healthcarePack, restaurantPack, realEstatePack];

for (const pack of packs) {
  if (!hasIndustryPack(pack.id)) {
    registerIndustryPack(pack);
  }
}

export { healthcarePack, restaurantPack, realEstatePack };
