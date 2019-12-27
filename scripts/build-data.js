import path from "path";
import { writeFile } from "fs";
import { parseStringPromise } from "xml2js";
import { promisify } from "util";
import {
  mapObjIndexed,
  keys,
  map,
  mergeDeepWith,
  fromPairs,
  mergeDeepWithKey
} from "ramda";
import axios from "axios";

const writeFilePromise = promisify(writeFile);

const baseDataUrl =
  "https://raw.githubusercontent.com/SC2Mapster/SC2GameData/master";

// Values in XML files are all strings. Convert to number if possible.
const preferNumber = (value) => {
  if (!isNaN(Number(value))) return Number(value);
  return value;
};

// Flattens node attributes.
// {$: {id: "1"}, Speed: [...]} -> {id: 1, Speed: [...]}
const flattenAtributes = ({ $, ...children }) => ({
  ...mapObjIndexed(preferNumber, $),
  ...mapObjIndexed(flattenNodes, children)
});

const flattenNodes = map(flattenAtributes);

// Merge one file into another, taking care to match id & index.
// The logic for this is crazy. #FuckXML
const mergeDeepUsingIndexes = mergeDeepWithKey((key, l, r) => {
  if (l === undefined || !Array.isArray(l)) return r;

  const array = l ? [...l] : [];

  for (const item of r) {
    const targetIndex = item.hasOwnProperty("id")
      ? array.findIndex(({ id }) => id === item.id)
      : typeof item.index === "string"
      ? array.findIndex(({ index }) => index === item.index)
      : item.hasOwnProperty("index")
      ? item.index
      : key.endsWith("Array") || key === "LayoutButtons"
      ? -1
      : 0;

    if (targetIndex === -1 && item.removed !== 1) {
      array.push(item);
    } else if (item.removed === 1) {
      array.splice(targetIndex, 1);
    } else {
      array[targetIndex] = mergeDeepUsingIndexes(array[targetIndex], item);
    }
  }

  return array;
});

// Flatten the full tree to something more usable like:
//  [{value: "1"}] -> [1]
const flattenTree = (value) => {
  if (typeof value !== "object") return value;

  // Plain objects
  if (!Array.isArray(value)) {
    // Simple values (<LifeMax value="550"/>).
    if (keys(value).length === 1 && value.hasOwnProperty("value")) {
      return value.value;
    }

    return mapObjIndexed(flattenTree, value);
  }

  // Simple one-off values (<LifeMax value="550"/>).
  if (
    value[0] &&
    value.length === 1 &&
    keys(value[0]).length === 1 &&
    value[0].hasOwnProperty("value")
  ) {
    return value[0].value;
  }

  // Deleted
  if (value.some(({ deleted }) => deleted === 1)) {
    return flattenTree(value.filter(({ deleted }) => deleted !== 1));
  }

  // Empty arrays (from deletions).
  if (value.length === 0) return undefined;

  // ID indexed values.
  if (value[0].id) {
    return fromPairs(value.map((item) => [item.id, flattenTree(item)]));
  }

  // String indexed values (<CostResource index="Minerals" value="150"/>).
  if (typeof value[0].index === "string") {
    return fromPairs(
      value.map(({ index, ...rest }) => [index, flattenTree(rest, index)])
    );
  }

  // Remove any remaining index.
  return value.map(({ index, ...rest }) => flattenTree(rest, index));
};

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

  const tree = xmlData.map(flattenAtributes).reduce(mergeDeepUsingIndexes);

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
