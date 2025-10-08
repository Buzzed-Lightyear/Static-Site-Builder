import React from "react";
import { SlotEditor } from "./SlotEditor.jsx";

export function RegionEditor({
  regionName,
  regionValue,
  slots = [],
  onChange,
  components,
  componentOptions,
  mode = "properties",
  selectedPath,
  onSelect,
  focusSlot,
}) {
  const value = regionValue && typeof regionValue === "object" ? regionValue : {};
  const regionTitle = regionName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const tw = value._tw || "";

  const handleSlotChange = (slotName, slotValue) => {
    if (!onChange) return;
    const next = { ...value };
    if (slotValue === undefined) delete next[slotName];
    else next[slotName] = slotValue;
    onChange(next);
  };

  if (mode === "outline") {
    const isSelected =
      selectedPath?.kind === "region" && selectedPath?.regionName === regionName;
    const visibleSlots = focusSlot ? slots.filter((slot) => slot === focusSlot) : slots;

    return (
      <div style={outlineStyles.region}>
        <button
          type="button"
          onClick={() => onSelect?.({ kind: "region", regionName })}
          style={{
            ...outlineStyles.nodeButton,
            ...(isSelected ? outlineStyles.nodeButtonActive : {}),
          }}
        >
          {regionTitle}
        </button>
        <div style={outlineStyles.slotList}>
          {visibleSlots.map((slot) => (
            <SlotEditor
              key={slot}
              mode="outline"
              regionName={regionName}
              slotName={slot}
              value={value[slot]}
              selectedPath={selectedPath}
              onSelect={onSelect}
              components={components}
              componentOptions={componentOptions}
            />
          ))}
        </div>
      </div>
    );
  }

  const renderedSlots = focusSlot ? slots.filter((slot) => slot === focusSlot) : slots;

  return (
    <section style={propertyStyles.region}>
      <header style={propertyStyles.regionHeader}>
        <h3 style={propertyStyles.regionTitle}>{regionTitle}</h3>
      </header>
      <div style={propertyStyles.regionBody}>
        <label style={propertyStyles.label}>
          <span style={propertyStyles.labelText}>Region classes (_tw)</span>
          <input
            type="text"
            value={tw}
            onChange={(e) => {
              if (!onChange) return;
              const val = e.target.value;
              const next = { ...value };
              if (val) next._tw = val;
              else delete next._tw;
              onChange(next);
            }}
            style={propertyStyles.input}
          />
        </label>
        <div style={propertyStyles.slots}>
          {renderedSlots.map((slot) => (
            <SlotEditor
              key={slot}
              mode="properties"
              regionName={regionName}
              slotName={slot}
              value={value[slot]}
              onChange={(slotValue) => handleSlotChange(slot, slotValue)}
              components={components}
              componentOptions={componentOptions}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const propertyStyles = {
  region: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid #e5e7eb",
    borderRadius: "1rem",
    overflow: "hidden",
    background: "#fff",
  },
  regionHeader: {
    padding: "1rem",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
  },
  regionTitle: {
    margin: 0,
    fontSize: "1.125rem",
  },
  regionBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    padding: "1rem",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    fontSize: "0.875rem",
    color: "#111827",
  },
  labelText: {
    fontWeight: 500,
  },
  input: {
    padding: "0.5rem",
    border: "1px solid #d1d5db",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
  },
  slots: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
};

const outlineStyles = {
  region: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  nodeButton: {
    textAlign: "left",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  nodeButtonActive: {
    borderColor: "#0ea5e9",
    background: "rgba(14,165,233,0.1)",
  },
  slotList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    paddingLeft: "1rem",
  },
};
