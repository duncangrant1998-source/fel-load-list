"use client";

import { useState } from "react";
import { TRANSPORT_MODES } from "@/lib/types";

// A mode select that falls back to a free-text field when "Other" is chosen,
// or when the current value doesn't match one of the fixed options (an
// earlier custom entry).
export default function ModeField({
  value,
  onChange,
  label = "Mode",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const knownOptions = TRANSPORT_MODES.slice(0, -1); // everything but "Other"
  const startsCustom = !!value && !knownOptions.includes(value);
  const [isOther, setIsOther] = useState(startsCustom);
  const [customValue, setCustomValue] = useState(startsCustom ? value : "");

  return (
    <div>
      {label && (
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          {label}
        </div>
      )}
      <select
        value={isOther ? "Other" : value || ""}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "Other") {
            setIsOther(true);
            onChange(customValue);
          } else {
            setIsOther(false);
            onChange(next);
          }
        }}
        className="w-full rounded-md border border-fel-border bg-fel-panel2 px-2 py-1.5 text-sm uppercase tracking-wide outline-none focus:border-fel-red"
      >
        <option value="" disabled>
          Select...
        </option>
        {knownOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
        <option value="Other">Other</option>
      </select>
      {isOther && (
        <input
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Describe the method of transportation"
          className="mt-2 w-full rounded-md border border-fel-border bg-fel-panel2 px-2 py-1.5 text-sm outline-none focus:border-fel-red"
        />
      )}
    </div>
  );
}
