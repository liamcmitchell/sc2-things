import React from "react";
import icons from "./icons.json";

function Icon({ id, style }) {
  const icon = icons[id];
  const [x, y, width, height] = icon || [-76, -76, 76, 76];

  return (
    <div
      title={id}
      style={{
        ...style,
        backgroundColor: "black",
        backgroundImage: icon && "url(/icons.jpg)",
        backgroundPosition: icon && `${-x}px ${-y}px`,
        width,
        height
      }}
    >
      {!icon && (
        <div
          style={{
            fontSize: 10,
            padding: 8,
            color: "white",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {id}
        </div>
      )}
    </div>
  );
}

export default Icon;
