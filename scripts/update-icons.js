import path from "path";
import { writeFile, existsSync } from "fs";
import { promisify } from "util";
import { fromPairs } from "ramda";
import Spritesmith from "spritesmith";
import { uniq } from "ramda";
import { mapObjIndexed } from "ramda";
import getPixels from "get-pixels";
import savePixels from "save-pixels";
import concat from "concat-stream";

// This is to prepare an image sprite containing all necessary icons.
// https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Images/Implementing_image_sprites_in_CSS

const getPixelsPromise = promisify(getPixels);
const writeFilePromise = promisify(writeFile);

const streamToPromise = (stream) =>
  new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.pipe(concat({ encoding: "buffer" }, resolve));
  });

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
// Images should all be in one directory after conversion.
// Pass this directory as the first argument to this script.
const assetDir = process.argv[2];
if (!existsSync(assetDir)) {
  console.error("Provide asset dir as an argument");
  process.exit(1);
}

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
    src: uniq(Object.values(iconFilenames))
  });

  // Set black background and convert to JPG.
  const imageData = await getPixelsPromise(image, "image/png");
  const [nx, ny] = imageData.shape;
  for (let x = 0; x < nx; ++x) {
    for (let y = 0; y < ny; ++y) {
      for (let channel = 0; channel < 3; ++channel) {
        imageData.set(
          x,
          y,
          channel,
          // Multiply current value by opacity.
          imageData.get(x, y, channel) * (imageData.get(x, y, 3) / 255)
        );
      }
    }
  }
  const jpgImage = await streamToPromise(
    savePixels(imageData, "jpg", { quality: 80 })
  );

  // Convert map of filenames to a map of {[id]: [x, y, width, height]}.
  const iconCoordinates = mapObjIndexed((filename, id) => {
    const { x, y, width, height } = coordinates[filename];
    if (width > 80 || height > 80)
      console.warn(`${filename} is larger than expected (${id})`);

    return [x, y, width, height];
  }, iconFilenames);

  await Promise.all([
    writeFilePromise(`${__dirname}/../public/icons.jpg`, jpgImage),
    writeData(`${__dirname}/../src/icons.json`, iconCoordinates)
  ]);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
