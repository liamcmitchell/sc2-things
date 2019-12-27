import React from "react";
import { mapObjIndexed } from "ramda";
import Icon from "./Icon.js";
import { trainTime, getUnit } from "./data.js";

const nameToId = (name) => name.replace(" ", "");

const idToName = (id) => id.replace(/([a-z])([A-Z])/, "$1 $2");

// Faster is normal * 1.4.
const fasterTime = (time) =>
  typeof time !== "number" ? time : Math.round(time / 1.4);

const liquipediaProtossUnits = [
  // Unit,Supply,Minerals,Gas,Time,Size,Armor,Health,Shield,Sight
  "Probe,1,50,0,12,0.75,0,20,20,8",
  "Zealot,2,100,0,27,1,1,100,50,9",
  "Sentry,2,50,100,26,1,1,40,40,10",
  "Stalker,2,125,50,30,1.25,1,80,80,10",
  "Adept,2,100,25,27,1,1,70,70,9",
  "High Templar,2,50,150,39,0.75,0,40,40,10",
  "Dark Templar,2,125,125,39,0.75,1,40,80,8",
  "Archon,4,0,0,9,2,0,10,350,9",
  "Observer,1,25,75,21,1,0,40,20,11",
  "Warp Prism,2,200,0,36,1.75,0,80,100,10",
  "Immortal,4,250,100,39,1.5,1,200,100,9",
  "Colossus,6,300,200,54,2,1,200,150,10",
  "Disruptor,3,150,150,36,1,1,100,100,9",
  "Phoenix,2,150,100,25,1.5,0,120,60,10",
  "Void Ray,4,250,150,43,2,0,150,100,10",
  "Oracle,3,150,150,37,1.5,0,100,60,10",
  "Tempest,5,250,175,43,2.5,2,200,100,12",
  "Carrier,6,350,250,64,2.5,2,300,150,12",
  "Interceptor,0,15,0,11,0.5,0,40,40,7",
  "Mothership Core,2,100,100,21,2,1,130,60,9",
  "Mothership,8,400,400,114,2.75,2,350,350,14"
].map((row) => {
  const [
    id,
    Supply,
    Minerals,
    Gas,
    Time,
    Size,
    Armor,
    Health,
    Shield,
    Sight
  ] = row.split(",");

  return {
    id: nameToId(id),
    Supply: Number(Supply),
    Minerals: Number(Minerals),
    Gas: Number(Gas),
    Time: Number(Time),
    Size: Number(Size),
    Armor: Number(Armor),
    Health: Number(Health),
    Shield: Number(Shield),
    Sight: Number(Sight)
  };
});

const units = liquipediaProtossUnits
  .map((liquipediaUnit) => {
    const unit = getUnit(liquipediaUnit.id);

    if (!unit) return null;

    const {
      id,
      Food = 0,
      LifeMax,
      CostResource: { Minerals = 0, Vespene = 0 } = {},
      Radius = 0.5,
      LifeArmor = 0,
      ShieldsMax = 0,
      Sight
    } = unit;

    const row = {
      Icon: <Icon id={id} />,
      Unit: idToName(id),
      Supply: -Food,
      Minerals: Minerals,
      Gas: Vespene,
      Time: fasterTime(trainTime(id)),
      Size: Radius * 2,
      Armor: LifeArmor,
      Health: LifeMax,
      Shield: ShieldsMax,
      Sight: Sight
    };

    // Show different wiki value in parens.
    return mapObjIndexed((value, key) => {
      if (liquipediaUnit.hasOwnProperty(key) && value !== liquipediaUnit[key])
        return (
          <>
            {value} ({liquipediaUnit[key]})
          </>
        );

      return value;
    }, row);
  })
  .filter(Boolean);

function Table({ rows }) {
  return (
    <table style={{ borderSpacing: 8 }}>
      <thead style={{ fontWeight: "bold" }}>
        <tr>
          {Object.keys(rows[0]).map((key) => (
            <td key={key}>{key}</td>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {Object.entries(row).map(([key, value]) => (
              <td key={key}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UnitStatistics() {
  return <Table rows={units} />;
}

export default UnitStatistics;
