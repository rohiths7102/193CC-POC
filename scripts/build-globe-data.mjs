/**
 * Generates src/lib/globe-data.ts — the land dot-matrix and the 193 UN member
 * states (name + centre point) for the Reach globe. Run once with
 * `yarn geo:build`; the output is committed, so the browser ships no geo code.
 *
 * Sources: Natural Earth via world-atlas (land-110m, countries-50m).
 * Country centre = centroid of the state's LARGEST polygon, so overseas
 * territories (French Guiana, Alaska…) do not drag a pin into the ocean.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoContains, geoCentroid, geoArea } from "d3-geo";

const load = (f) => JSON.parse(readFileSync(new URL(`../node_modules/world-atlas/${f}`, import.meta.url)));

// The 193 UN member states. [display name, world-atlas name if different]
const UN = [
  "Afghanistan","Albania","Algeria","Andorra","Angola",["Antigua and Barbuda","Antigua and Barb."],"Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia",["Bosnia and Herzegovina","Bosnia and Herz."],"Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada",["Central African Republic","Central African Rep."],"Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica",
  ["Côte d’Ivoire","Côte d'Ivoire"],"Croatia","Cuba","Cyprus","Czechia",["DR Congo","Dem. Rep. Congo"],"Denmark","Djibouti","Dominica",["Dominican Republic","Dominican Rep."],
  "Ecuador","Egypt","El Salvador",["Equatorial Guinea","Eq. Guinea"],"Eritrea","Estonia",["Eswatini","eSwatini"],"Ethiopia","Fiji","Finland",
  "France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea",
  "Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq",
  "Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait",
  "Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta",["Marshall Islands","Marshall Is."],"Mauritania","Mauritius","Mexico",
  "Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru",
  "Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea",["North Macedonia","Macedonia"],"Norway","Oman",
  "Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Rwanda",["Saint Kitts and Nevis","St. Kitts and Nevis"],"Saint Lucia",["Saint Vincent and the Grenadines","St. Vin. and Gren."],"Samoa","San Marino",["São Tomé and Príncipe","São Tomé and Principe"],"Saudi Arabia",
  "Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia",["Solomon Islands","Solomon Is."],"Somalia","South Africa",
  "South Korea",["South Sudan","S. Sudan"],"Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Tajikistan",
  "Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia",["Türkiye","Turkey"],"Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom",["United States","United States of America"],"Uruguay","Uzbekistan","Vanuatu","Venezuela",["Viet Nam","Vietnam"],
  "Yemen","Zambia","Zimbabwe",
];
const MANUAL = { Tuvalu: [-8.52, 179.2] };

if (UN.length !== 193) throw new Error(`expected 193 member states, got ${UN.length}`);

const countries = feature(load("countries-50m.json"), load("countries-50m.json").objects.countries).features;
const byName = new Map(countries.map((f) => [f.properties.name, f]));

const largest = (f) => {
  if (f.geometry.type !== "MultiPolygon") return f;
  let best = null, bestA = -1;
  for (const coords of f.geometry.coordinates) {
    const p = { type: "Feature", geometry: { type: "Polygon", coordinates: coords } };
    const a = geoArea(p);
    if (a > bestA) { bestA = a; best = p; }
  }
  return best;
};

const states = UN.map((entry) => {
  const [name, alias] = Array.isArray(entry) ? entry : [entry, entry];
  if (MANUAL[name]) return [name, ...MANUAL[name]];
  const f = byName.get(alias);
  if (!f) throw new Error(`no geometry for ${name} (${alias})`);
  const [lon, lat] = geoCentroid(largest(f));
  return [name, +lat.toFixed(2), +lon.toFixed(2)];
});

// Land dot-matrix: an even Fibonacci sphere, kept where it falls on land.
const land = feature(load("land-110m.json"), load("land-110m.json").objects.land);
const N = 14000, dots = [];
const golden = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
  const lat = (Math.asin(y) * 180) / Math.PI;
  const lon = ((((Math.atan2(r * Math.sin(th), r * Math.cos(th)) * 180) / Math.PI) + 540) % 360) - 180;
  if (lat < -58) continue; // no Antarctica — it reads as noise at the pole
  if (geoContains(land, [lon, lat])) dots.push(Math.round(lat * 10), Math.round(lon * 10));
}

const out = `// Generated by scripts/build-globe-data.mjs — do not edit by hand.
// Natural Earth via world-atlas. ${dots.length / 2} land dots; 193 UN member states.

/** Land dot-matrix as flat [lat×10, lon×10, …] pairs. */
export const LAND_DOTS: readonly number[] = [${dots.join(",")}];

/** The 193 UN member states: [name, lat, lon]. */
export const UN_MEMBER_STATES: readonly (readonly [string, number, number])[] = ${JSON.stringify(states)};
`;
writeFileSync(new URL("../src/lib/globe-data.ts", import.meta.url), out);
console.log(`land dots: ${dots.length / 2}, states: ${states.length}`);
