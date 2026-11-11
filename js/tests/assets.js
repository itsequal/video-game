import fs from "node:fs";
import { SPRITE } from "../art/errante.sprite.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function testSpriteSheet() {
  const file = new URL("../../assets/sprites/errante.png", import.meta.url);
  const buffer = fs.readFileSync(file);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  assert(width === SPRITE.frameW * SPRITE.frames.length, `ancho ${width}`);
  assert(height === SPRITE.frameH, `alto ${height}`);
  const box = SPRITE.portrait;
  assert(box.x >= 0 && box.y >= 0, "retrato negativo");
  assert(box.x + box.w <= SPRITE.frameW && box.y + box.h <= SPRITE.frameH, "retrato fuera del cuadro");
  assert(SPRITE.feet.y === SPRITE.frameH - 1, "los pies no están en la última fila");
}
