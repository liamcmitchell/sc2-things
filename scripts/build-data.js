import path from "path";
import { writeFile } from "fs";
import { parseStringPromise } from "xml2js";
import { promisify } from "util";
import { mapObjIndexed, fromPairs, keys, values, mergeDeepRight } from "ramda";
import axios from "axios";

const writeFilePromise = promisify(writeFile);

const baseDataUrl =
  "https://raw.githubusercontent.com/SC2Mapster/SC2GameData/master";

// Values in XML files are all strings. Convert to number if possible.
const preferNumber = (value) => {
  if (!isNaN(Number(value))) return Number(value);
  return value;
};

// Transforms arrays of nodes into object using any available key.
// [{index: "x"}] -> {x: {index: "x"}}
// [{value: 1}] -> {"0": {value: 1}}
const xmlNodesToTree = (nodes) => {
  return fromPairs(
    nodes
      .map(xmlNodeToTree)
      .map((node, i) => [node.id || node.index || i, node])
  );
};

// Flattens node attributes.
// {$: {id: "1"}, Speed: [...]} -> {id: 1, Speed: [...]}
const xmlNodeToTree = ({ $, ...children }) => ({
  ...mapObjIndexed(preferNumber, $),
  ...mapObjIndexed(xmlNodesToTree, children)
});

// Flatten the full XML tree to something more usable like:
//  {"0": {value: "1"}} -> [1]
const flattenTree = mapObjIndexed((value, index) => {
  if (typeof value !== "object") return value;

  // Removed (<GlossaryStrongArray index="0" removed="1"/>).
  if (value.removed === 1) return undefined;

  // Simple one-off values (<LifeMax value="550"/>).
  if (
    value["0"] &&
    keys(value).length === 1 &&
    keys(value["0"]).length === 1 &&
    value["0"].hasOwnProperty("value")
  ) {
    return value["0"].value;
  }

  // Arrays (<AbilArray Link="stop"/>).
  if (
    value["0"] &&
    !keys(value)
      .map(Number)
      .some(isNaN)
  ) {
    return values(flattenTree(value)).filter(Boolean);
  }

  // Simple and indexed values (<CostResource index="Minerals" value="150"/>).
  if (
    value.hasOwnProperty("value") &&
    (keys(value).length === 1 ||
      (keys(value).length === 2 && String(value.index) === index))
  ) {
    return value.value;
  }

  return flattenTree(value);
});

const readData = async (file) => {
  // Data for LOTV multi is made from merging multiple data files.
  // Found the right files by comparing data against Liquipedia wiki.
  const files = [
    `mods/liberty.sc2mod/base.sc2data/GameData/${file}.xml`,
    `mods/swarm.sc2mod/base.sc2data/GameData/${file}.xml`,
    `mods/void.sc2mod/base.sc2data/GameData/${file}.xml`,
    `mods/voidmulti.sc2mod/base.sc2data/GameData/${file}.xml`
  ];

  const xmlData = await Promise.all(
    files.map(async (file) => {
      const { data } = await axios(`${baseDataUrl}/${file}`);

      // All files have a catalog as root.
      const { Catalog } = await parseStringPromise(data);

      return Catalog;
    })
  );

  const tree = xmlData
    // Turn XML into object tree (no arrays)
    .map(xmlNodeToTree)
    // so we can merge the files together.
    .reduce(mergeDeepRight);

  // Then we try to flatten the object tree as much as possible.
  return flattenTree(tree);
};

const writeData = async (file, data) => {
  await writeFilePromise(
    path.resolve(__dirname, file),
    JSON.stringify(data, null, 2) + "\n"
  );
};

const main = async () => {
  const data = await Promise.all([
    readData("UnitData"),
    readData("AbilData"),
    readData("ButtonData")
  ]);
  await writeData(`../src/data.json`, Object.assign({}, ...data));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
