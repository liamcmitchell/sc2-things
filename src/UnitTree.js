import React from "react";
import Icon from "./Icon.js";
import { getAllPossibleUnits } from "./data.js";

const Race = ({ name, startingUnits }) => (
  <div>
    <h2>{name}</h2>
    {getAllPossibleUnits(startingUnits).map((id) => (
      <div key={id} style={{ marginBottom: 8 }}>
        <Icon id={id} />
      </div>
    ))}
  </div>
);

function UnitTree() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <Race name="Protoss" startingUnits={["Nexus"]} />
      <Race name="Terran" startingUnits={["CommandCenter"]} />
      <Race name="Zerg" startingUnits={["Hatchery", "Larva"]} />
    </div>
  );
}

export default UnitTree;
