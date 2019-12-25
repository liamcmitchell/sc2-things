import path from "path";
import { writeFile } from "fs";
import { promisify } from "util";
import { fromPairs } from "ramda";
import Spritesmith from "spritesmith";
import { uniq } from "ramda";
import { mapObjIndexed } from "ramda";

// This is to prepare an image sprite containing all necessary icons.
// https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Images/Implementing_image_sprites_in_CSS

const writeFilePromise = promisify(writeFile);

const createSprite = (params) =>
  new Promise((resolve, reject) => {
    Spritesmith.run(params, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

// Images are first extracted from game files with stormex:
// https://github.com/Talv/stormex
// Something like `stormex '/mnt/s1/BnetGameLib/StarCraft II' -s 'btn-' -o 'buttons'`
// Then converted to PNG using XnConvert https://www.xnview.com/en/xnconvert/
// Images should all be in assets directory after conversion.
const assetDir = `${__dirname}/../assets`;

const writeData = async (file, data) => {
  await writeFilePromise(
    path.resolve(__dirname, file),
    JSON.stringify(data, null, 2) + "\n"
  );
};

const abilIcons = (CAbil) => {
  const icons = [];
  for (const { InfoArray, CmdButtonArray } of Object.values(CAbil)) {
    if (InfoArray) {
      for (const { Button } of Object.values(InfoArray)) {
        if (Button && Button[0]) icons.push(Button[0].DefaultButtonFace);
      }
    }
    if (CmdButtonArray) {
      for (const { DefaultButtonFace } of Object.values(CmdButtonArray)) {
        if (DefaultButtonFace) icons.push(DefaultButtonFace);
      }
    }
  }
  return icons;
};

const main = async () => {
  const data = require("../src/data.json");

  // TODO: Get icons from dependency tree.
  const icons = uniq([
    ...abilIcons(data.CAbilTrain),
    ...abilIcons(data.CAbilMorph),
    ...abilIcons(data.CAbilBuild),
    ...abilIcons(data.CAbilResearch),
    ...abilIcons(data.CAbilMerge)
  ]);

  const iconFilenames = fromPairs(
    icons
      .map((id) => {
        const { Icon } = data.CButton[id] || {};
        if (
          !Icon ||
          !Icon.startsWith("Assets") ||
          !Icon.endsWith(".dds") ||
          // Ignore placeholder.
          Icon.includes("btn-missing-kaeo")
        )
          return null;

        return [
          id,
          Icon.replace("Assets\\Textures\\", `${assetDir}/`).replace(
            ".dds",
            ".png"
          )
        ];
      })
      .filter(Boolean)
  );

  const { image, coordinates } = await createSprite({
    src: uniq(Object.values(iconFilenames)),
    exportOpts: { format: "jpg" }
  });

  // Convert map of filenames to a map of {[id]: [x, y, width, height]}.
  const iconCoordinates = mapObjIndexed((filename, id) => {
    const { x, y, width, height } = coordinates[filename];
    if (width > 80 || height > 80)
      console.warn(`${filename} is larger than expected (${id})`);

    return [x, y, width, height];
  }, iconFilenames);

  await Promise.all([
    writeFilePromise(`${__dirname}/../public/icons.jpg`, image),
    writeData(`${__dirname}/../src/icons.json`, iconCoordinates)
  ]);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
