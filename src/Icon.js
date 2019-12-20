import React from "react";
import icons from "./icons.json";

function Icon({ id, style }) {
  // CancelMutateMorph is not a bad "missing image" icon.
  const [x, y, width, height] = icons[id] || icons.CancelMutateMorph;

  return (
    <div
      style={{
        ...style,
        backgroundImage: "url(/icons.jpg)",
        backgroundPosition: `-${x}px -${y}px`,
        width,
        height
      }}
    />
  );
}

export default Icon;
