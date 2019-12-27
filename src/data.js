import { memoizeWith, identity, mergeDeepWith } from "ramda";
import data from "./data.json";

export const trainTime = (unit) => {
  for (const { InfoArray } of Object.values(data.CAbilTrain)) {
    for (const { Unit, Time } of Object.values(InfoArray)) {
      if (Unit === unit) return Time;
    }
  }
};

export const getUnit = (id) => {
  const unit = data.CUnit[id];
  if (!unit) throw new Error(`No unit data for ${id}`);
  return unit;
};

const mergeTree = mergeDeepWith((l, r) => {
  if (!Array.isArray(l) || !Array.isArray(r)) return r;
  return Array.from({ length: Math.max(l.length, r.length) }, (_, i) =>
    l[i] && r[i] ? mergeTree(l[i], r[i]) : l[i] || r[i]
  );
});

export const getAbilGroup = memoizeWith(identity, (id) => {
  let abil;
  for (const key in data) {
    if (key.startsWith("CAbil") && data[key][id]) {
      abil = data[key][id];
      break;
    }
  }
  if (!abil) return;

  if (abil.parent) {
    const parent = JSON.parse(
      JSON.stringify(getAbilGroup(abil.parent))
        // Hack...
        .replace("##unit##", abil.unit)
    );

    return {
      ...mergeTree(parent, abil),
      parent: undefined
    };
  }

  return abil;
});

// Abilities are very different.
export const getAbilCmd = memoizeWith(identity, (cmd) => {
  const [groupId, id] = cmd.split(",");

  const abil = getAbilGroup(groupId);

  // Not all abilities are in data.
  if (!abil) return undefined;

  const { CmdButtonArray, InfoArray } = abil;

  if (CmdButtonArray && CmdButtonArray[id]) {
    return {
      ...abil,
      ...CmdButtonArray[id],
      id: cmd,
      Unit: InfoArray && InfoArray[0] && InfoArray[0].Unit
    };
  }

  if (InfoArray && InfoArray[id]) {
    return {
      ...abil,
      ...InfoArray[id],
      DefaultButtonFace: InfoArray[id].Button[0].DefaultButtonFace,
      id: cmd
    };
  }

  // console.warn(`Unable to find AbilCmd ${cmd}`);
});

export const getUnitAbils = memoizeWith(identity, (id) => {
  const { CardLayouts = [] } = getUnit(id);

  // Abilities are indexed by card-row-column.
  // Some abilities are visible in data but are actually overwritten by later abils...
  const abils = {};

  for (const card in CardLayouts) {
    for (const button of CardLayouts[card].LayoutButtons) {
      if (button === null) {
        console.log(CardLayouts);
        continue;
      }
      const { Type, AbilCmd, Row, Column } = button;
      if (Type !== "AbilCmd") continue;

      abils[`${card}${Row}${Column}`] = getAbilCmd(AbilCmd);
    }
  }

  return Object.values(abils).filter(Boolean);
});

export const getAllPossibleUnits = (units) => {
  units = [...units];

  for (let index = 0; index < units.length; index++) {
    for (const { Unit } of getUnitAbils(units[index])) {
      if (Unit) {
        for (const u of Array.isArray(Unit) ? Unit : [Unit]) {
          if (!units.includes(u)) units.push(u);
        }
      }
    }
  }

  return units;
};
