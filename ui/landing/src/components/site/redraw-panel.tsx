"use client";

import { useRef, useState } from "react";
import { CANDLES, DRAG_MAX, DRAG_MIN, DRAG_TO, fmtUsd, levelsFor, lineTo, ORDER, RISING_BARS } from "./market-data";
import { PLOT, priceScale, SketchPlot } from "./sketch-plot";
import styles from "./sketch-chart.module.css";

const history = CANDLES.slice(-24);
const scale = priceScale([
  ...history.flatMap(bar => [bar.h, bar.l]),
  ...RISING_BARS.flatMap(bar => [bar.h, bar.l]),
  ...lineTo(DRAG_MIN), ...lineTo(DRAG_MAX),
]);
const clamp = (value: number) => Math.min(DRAG_MAX, Math.max(DRAG_MIN, Math.round(value / 10) * 10));

export function RedrawPanel() {
  const [end, setEnd] = useState(DRAG_TO);
  const [grabbing, setGrabbing] = useState(false);
  const plot = useRef<HTMLDivElement>(null);
  const shape = lineTo(end);
  const level = levelsFor(shape);
  const drawn = shape.map((price, index) => ({ x: PLOT.start + index / (shape.length - 1) * (PLOT.right - PLOT.start), y: scale.y(price) }));
  const handle = drawn[drawn.length - 1];
  const setFromClientY = (clientY: number) => {
    const box = plot.current?.getBoundingClientRect();
    if (box) setEnd(clamp(scale.price((clientY - box.top) / box.height * PLOT.height)));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.marketHeader}>
        <div><p className={styles.small}>Your target</p><strong className={styles.price}>${fmtUsd(level.target)}</strong></div>
      </div>
      <SketchPlot drawn={drawn} market={[]} entryY={scale.y(ORDER.entry)} plotRef={plot} label={`Your drawn Bitcoin path, aiming for $${fmtUsd(level.target)}.`}>
        <button
          aria-label="End of the drawn line"
          aria-orientation="vertical"
          aria-valuemax={DRAG_MAX}
          aria-valuemin={DRAG_MIN}
          aria-valuenow={end}
          aria-valuetext={`Aiming for $${fmtUsd(level.target)}`}
          className={styles.dragHandle}
          data-dragging={grabbing}
          onKeyDown={event => {
            const change = event.key === "ArrowUp" ? 100 : event.key === "ArrowDown" ? -100 : event.key === "PageUp" ? 500 : event.key === "PageDown" ? -500 : null;
            if (change !== null) { event.preventDefault(); setEnd(value => clamp(value + change)); }
            else if (event.key === "Home" || event.key === "End") { event.preventDefault(); setEnd(event.key === "Home" ? DRAG_MIN : DRAG_MAX); }
          }}
          onPointerDown={event => { event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); setGrabbing(true); setFromClientY(event.clientY); }}
          onPointerMove={event => { if (grabbing) setFromClientY(event.clientY); }}
          onPointerUp={() => setGrabbing(false)}
          onPointerCancel={() => setGrabbing(false)}
          onLostPointerCapture={() => setGrabbing(false)}
          role="slider"
          style={{ left: `${handle.x / PLOT.width * 100}%`, top: `${handle.y / PLOT.height * 100}%` }}
          type="button"
        ><span /></button>
      </SketchPlot>
      <div className={styles.footer}>
        <p>Drag the blue dot.</p>
        <button className={styles.button} onClick={() => setEnd(DRAG_TO)} type="button">Reset</button>
      </div>
    </div>
  );
}
