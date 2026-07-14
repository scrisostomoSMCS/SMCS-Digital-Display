"use client";

import { EVENT_COLORS } from "@/lib/eventColors";

/*
  Color chooser for an event. A row of quick preset swatches, plus a "custom"
  swatch that opens the browser's native color picker so any color can be
  chosen. Controlled: the parent form owns the selected hex value.
*/
type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

const swatchBase = "h-8 w-8 rounded-sm border-2 transition";
const selectedRing = "border-ink ring-2 ring-ink/40";
const idleRing = "border-ink/20 hover:border-ink/50";

export default function ColorPicker({
  value,
  onChange,
  label = "Event Color",
}: ColorPickerProps) {
  // Is the current value one of the presets, or a custom-picked color?
  const isPreset = EVENT_COLORS.some(
    (c) => c.value.toLowerCase() === value.toLowerCase(),
  );

  return (
    <div>
      <span className="block text-base font-semibold">{label}</span>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {EVENT_COLORS.map((c) => {
          const selected = value.toLowerCase() === c.value.toLowerCase();
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange(c.value)}
              title={c.name}
              aria-label={c.name}
              aria-pressed={selected}
              className={`${swatchBase} ${selected ? selectedRing : idleRing}`}
              style={{ backgroundColor: c.value }}
            />
          );
        })}

        {/* Custom color: the hidden native input opens the OS color picker.
            Shows the chosen custom color, or a rainbow to invite picking. */}
        <label
          title="Custom color"
          className={`${swatchBase} relative cursor-pointer ${
            isPreset ? idleRing : selectedRing
          }`}
          style={
            isPreset
              ? {
                  backgroundImage:
                    "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                }
              : { backgroundColor: value }
          }
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Custom color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>

      {!isPreset && (
        <p className="mt-1 text-sm text-ink/60">Custom: {value.toUpperCase()}</p>
      )}
    </div>
  );
}
