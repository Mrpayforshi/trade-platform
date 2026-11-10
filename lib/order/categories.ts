// Starter list of what Zimbabwean buyers commonly import, shown as a submenu in the
// search box. It is a convenience for buyers, not a catalogue: tapping an item only adds a
// line to the list, and the search then matches it against products that are actually
// published. Edit freely. Keep items free of commas (a comma splits a list line) and avoid
// categories that need special regulatory handling until they are ready to be enabled.

import { scoreProduct, tokens, type OfferProduct } from "./match";

export type CategoryGroup = { id: string; name: string; items: string[] };

export const STARTER_CATEGORIES: CategoryGroup[] = [
  {
    id: "solar",
    name: "Solar and energy",
    items: ["Solar panels", "Solar inverters", "Lithium batteries", "Solar water pumps", "Diesel generators", "Solar street lights"],
  },
  {
    id: "mining",
    name: "Mining equipment",
    items: ["Excavators", "Jaw crushers", "Ball mills", "Drilling rigs", "Conveyor belts", "Dewatering pumps"],
  },
  {
    id: "manufacturing",
    name: "Manufacturing equipment",
    items: ["CNC machines", "Injection moulding machines", "Packaging machines", "Welding machines", "Industrial sewing machines", "Hydraulic presses"],
  },
  {
    id: "agriculture",
    name: "Agriculture and irrigation",
    items: ["Irrigation systems", "Tractors", "Grain mills", "Greenhouse kits", "Water tanks", "Maize shellers"],
  },
  {
    id: "construction",
    name: "Construction",
    items: ["Concrete mixers", "Brick making machines", "Wheel loaders", "Roofing sheets", "Scaffolding"],
  },
  {
    id: "transport",
    name: "Trucks and transport",
    items: ["Tipper trucks", "Flatbed trucks", "Forklifts", "Water bowsers", "Trailers"],
  },
];

/** For each starter item, how many approved suppliers currently have a matching published
 *  product. Uses the same scoring as the search, so the menu never promises more than a
 *  search can return. Server side only (it needs the loaded offers). */
export function itemAvailability(offers: OfferProduct[], groups: CategoryGroup[] = STARTER_CATEGORIES): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of groups) {
    for (const item of g.items) {
      const query = tokens(item);
      const suppliers = new Set<string>();
      for (const o of offers) if (scoreProduct(query, o) > 0) suppliers.add(o.supplier_id);
      out[item] = suppliers.size;
    }
  }
  return out;
}
