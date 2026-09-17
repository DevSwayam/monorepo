"use client";

import { useState } from "react";
import { fmtUsd } from "./market-data";
import styles from "./candle-pnl.module.css";

export type CandleValue = { x: number; y: number; bottom: number; pnl: number };
const money = (value: number) => `${value < -0.005 ? "−" : "+"}$${fmtUsd(Math.abs(value), 2)}`;

/**
 * One live readout; completed candles remain individually inspectable.
 *
 * The right-hand bound is 7rem rather than the plot's own edge, to clear the
 * price tag parked there. A run finishes at the right, which is exactly where
 * that tag lives, so an inset of 2rem put this readout on top of it for the
 * last third of every trade — two figures in one place, one of them unreadable.
 */
export function CandlePnl({ candles }: { candles: CandleValue[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const index = selected !== null && selected < candles.length ? selected : candles.length - 1;
  const current = candles[index];
  if (!current) return null;
  return (
    <div className={styles.layer}>
      {candles.map((candle, i) => (
        <button
          aria-label={`Candle ${i + 1}: trade profit or loss ${money(candle.pnl)}`}
          className={styles.candle}
          data-candle-pnl={candle.pnl}
          key={i}
          onPointerEnter={event => { if (event.pointerType === "mouse") setSelected(i); }}
          onPointerLeave={event => { if (event.pointerType === "mouse" && document.activeElement !== event.currentTarget) setSelected(null); }}
          onFocus={() => setSelected(i)}
          onBlur={() => setSelected(null)}
          onClick={() => setSelected(i)}
          onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); event.currentTarget.blur(); setSelected(null); } }}
          style={{ left: `${candle.x}%`, top: `${candle.y}%`, height: `max(24px, ${candle.bottom - candle.y}%)` }}
          type="button"
        />
      ))}
      <div
        className={styles.value}
        data-active-candle={index}
        style={{ left: `clamp(2rem, ${current.x}%, calc(100% - 7rem))`, top: `max(2px, calc(${current.y}% - 26px))` }}
      >
        <strong style={{ color: Math.abs(current.pnl) < 0.005 ? "var(--fg-muted)" : current.pnl > 0 ? "var(--up)" : "var(--down)" }}>{money(current.pnl)}</strong>
      </div>
    </div>
  );
}
