import { getImageProps, type StaticImageData } from "next/image";

// The designer's workshop scene, split into layers (tablet and desktop; phones keep their own hero picture).
// The background is the Figma frame without anyone in it; every kid, animal and tool is the designer's own PNG,
// cleaned of stray background-removal pixels and exported at its size in the 3840×1611 scene (mirrored where the
// scene mirrors it). The gears, compass and brace had no PNG, so they were cut from the Figma frame.
import background from "../../../../../public/landing/hero/background.webp";
import artSupplies from "../../../../../public/landing/hero/art-supplies.webp";
import bear from "../../../../../public/landing/hero/bear.webp";
import bucketHatKid from "../../../../../public/landing/hero/bucket-hat-kid.webp";
import caterpillar from "../../../../../public/landing/hero/caterpillar.webp";
import crab from "../../../../../public/landing/hero/crab.webp";
import deer from "../../../../../public/landing/hero/deer.webp";
import gears from "../../../../../public/landing/hero/gears.webp";
import girl from "../../../../../public/landing/hero/girl.webp";
import lizard from "../../../../../public/landing/hero/lizard.webp";
import measureBoy from "../../../../../public/landing/hero/measure-boy.webp";
import mechanicalBird from "../../../../../public/landing/hero/mechanical-bird.webp";
import overallsBoy from "../../../../../public/landing/hero/overalls-boy.webp";
import parrot from "../../../../../public/landing/hero/parrot.webp";
import toolbox from "../../../../../public/landing/hero/toolbox.webp";
import toolsBoy from "../../../../../public/landing/hero/tools-boy.webp";
import turtle from "../../../../../public/landing/hero/turtle.webp";

// 1×1 transparent GIF: phones never download the layered scene.
const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const SCENE_W = 3840;
const SCENE_H = 1611;
// How wide the scene is drawn: it covers the hero box (85vh tall, never under 770px or 350px + 20.6vw) at 2.384:1.
const SCENE_SIZES = "max(100vw, 202.6vh, 1836px, calc(835px + 49.1vw))";
// Motion (motion.css): the scene comes in first, then the layers appear one after another from the sides of the scene
// toward its centre.
const FIRST_LAYER_MS = 1400;
const LAYER_STEP_MS = 130;

type Layer = {
  src: StaticImageData;
  // top-left corner in scene pixels
  x: number;
  y: number;
  // kids and animals pop up, tools drop in
  motion: "pop" | "drop";
  // 0 = outermost, appears first
  order: number;
  // grounded kids and animals grow up out of the floor; the flying parrot and the tools move from their middle
  grounded?: boolean;
};

// Back to front: whoever stands lower in the picture is in front.
const LAYERS: Layer[] = [
  // 115px right of its Figma spot, as in the approved single-picture hero: there its tail had crossed "Ages 8+" at
  // laptop sizes
  { src: parrot, x: 2604, y: 348, motion: "pop", order: 4 },
  { src: deer, x: 1945, y: 768, motion: "pop", order: 13, grounded: true },
  { src: bucketHatKid, x: 1478, y: 874, motion: "pop", order: 11, grounded: true },
  { src: caterpillar, x: 389, y: 1211, motion: "pop", order: 0, grounded: true },
  { src: overallsBoy, x: 2258, y: 826, motion: "pop", order: 7, grounded: true },
  { src: crab, x: 2145, y: 1240, motion: "pop", order: 10, grounded: true },
  { src: bear, x: 1666, y: 1081, motion: "pop", order: 14, grounded: true },
  { src: toolsBoy, x: 967, y: 560, motion: "pop", order: 5, grounded: true },
  { src: lizard, x: 2437, y: 1245, motion: "pop", order: 6, grounded: true },
  { src: girl, x: 2815, y: 718, motion: "pop", order: 2, grounded: true },
  { src: measureBoy, x: 769, y: 727, motion: "pop", order: 3, grounded: true },
  { src: mechanicalBird, x: 1385, y: 1326, motion: "drop", order: 8 },
  { src: toolbox, x: 1554, y: 1425, motion: "drop", order: 12 },
  // the compass lies on the bird's base, so it travels with the bird
  { src: gears, x: 1363, y: 1425, motion: "drop", order: 8 },
  { src: artSupplies, x: 2094, y: 1396, motion: "drop", order: 9 },
  { src: turtle, x: 662, y: 1479, motion: "pop", order: 1, grounded: true },
];

const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(4)}%`;

export default function HeroScene() {
  const { props: backgroundProps } = getImageProps({
    src: background,
    alt: "",
    sizes: SCENE_SIZES,
    quality: 85,
    loading: "eager",
    fetchPriority: "high",
  });

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block [container-type:size]">
      {/* The scene covers the hero box the way object-cover + object-bottom did: the full width, or wider than the box
          when the box is relatively tall, always anchored to the bottom centre (100cqh × 2.3836 = the scene's width at
          the box's height). */}
      <div
        data-intro="scene"
        className="absolute bottom-0 left-[calc(50cqw_-_max(50cqw,119.18cqh))] aspect-[3840/1611] w-[max(100cqw,238.36cqh)]"
      >
        <picture>
          <source media="(max-width: 767px)" srcSet={BLANK_GIF} />
          {/* eslint-disable-next-line @next/next/no-img-element -- a <picture> needs a raw img; its props come from getImageProps */}
          <img {...backgroundProps} alt="" className="absolute inset-0 h-full w-full" />
        </picture>
        {LAYERS.map((layer) => {
          const { props } = getImageProps({
            src: layer.src,
            alt: "",
            sizes: `calc(${SCENE_SIZES} * ${(layer.src.width / SCENE_W).toFixed(4)})`,
            quality: 90,
            loading: "eager",
          });
          return (
            <picture key={layer.src.src}>
              <source media="(max-width: 767px)" srcSet={BLANK_GIF} />
              {/* eslint-disable-next-line @next/next/no-img-element -- a <picture> needs a raw img; its props come from getImageProps */}
              <img
                {...props}
                alt=""
                data-intro={layer.motion === "pop" ? "layer-pop" : "layer-drop"}
                className={`absolute h-auto max-w-none ${layer.grounded ? "origin-bottom" : ""}`}
                style={
                  {
                    ...props.style,
                    left: pct(layer.x, SCENE_W),
                    top: pct(layer.y, SCENE_H),
                    width: pct(layer.src.width, SCENE_W),
                    "--motion-delay": `${FIRST_LAYER_MS + layer.order * LAYER_STEP_MS}ms`,
                  } as React.CSSProperties
                }
              />
            </picture>
          );
        })}
      </div>
    </div>
  );
}
