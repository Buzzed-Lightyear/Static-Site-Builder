import React from "react";
import { RegionEditor } from "./RegionEditor.jsx";
import { SlotEditor } from "./SlotEditor.jsx";

function PanelSection({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>{title}</div>
      <div style={styles.sectionBody}>{children}</div>
    </div>
  );
}

export function PropertiesPanel({
  page,
  onChange,
  layout,
  components,
  componentOptions,
  selectedPath,
}) {
  const regions = page?.regions || {};
  const layoutRegions = layout?.regions || {};

  const updatePage = (next) => {
    onChange({ ...page, ...next });
  };

  const setRegionValue = (regionName, regionValue) => {
    const nextRegions = { ...regions };
    if (!regionValue || Object.keys(regionValue).length === 0) delete nextRegions[regionName];
    else nextRegions[regionName] = regionValue;
    updatePage({ regions: nextRegions });
  };

  const setSlotValue = (regionName, slotName, slotValue) => {
    const currentRegion = regions[regionName] && typeof regions[regionName] === "object"
      ? { ...regions[regionName] }
      : {};
    if (slotValue === undefined) delete currentRegion[slotName];
    else currentRegion[slotName] = slotValue;
    setRegionValue(regionName, currentRegion);
  };

  const path = selectedPath || { kind: "page" };

  if (path.kind === "page") {
    const title = page?.title || "";
    return (
      <div style={styles.container}>
        <div style={styles.header}>Properties</div>
        <div style={styles.body}>
          <PanelSection title="Page settings">
            <label style={styles.label}>
              <span style={styles.labelText}>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => updatePage({ title: e.target.value })}
                style={styles.input}
              />
            </label>
          </PanelSection>
        </div>
      </div>
    );
  }

  if (path.kind === "region") {
    const { regionName } = path;
    const regionDefinition = layoutRegions[regionName];
    const regionValue = regions[regionName];
    if (!regionDefinition) {
      return renderMissing("Region", regionName);
    }
    return (
      <div style={styles.container}>
        <div style={styles.header}>Properties</div>
        <div style={styles.body}>
          <PanelSection title={`Region: ${formatName(regionName)}`}>
            <RegionEditor
              mode="properties"
              regionName={regionName}
              regionValue={regionValue}
              slots={regionDefinition.slots || []}
              onChange={(nextRegion) => setRegionValue(regionName, nextRegion)}
              components={components}
              componentOptions={componentOptions}
            />
          </PanelSection>
        </div>
      </div>
    );
  }

  if (path.kind === "slot") {
    const { regionName, slotName } = path;
    const regionDefinition = layoutRegions[regionName];
    const regionValue = regions[regionName];
    if (!regionDefinition || !(regionDefinition.slots || []).includes(slotName)) {
      return renderMissing("Slot", `${regionName}.${slotName}`);
    }
    const slotValue = regionValue && typeof regionValue === "object" ? regionValue[slotName] : undefined;
    return (
      <div style={styles.container}>
        <div style={styles.header}>Properties</div>
        <div style={styles.body}>
          <PanelSection title={`Slot: ${formatName(slotName)}`}>
            <SlotEditor
              mode="properties"
              regionName={regionName}
              slotName={slotName}
              value={slotValue}
              onChange={(nextSlot) => setSlotValue(regionName, slotName, nextSlot)}
              components={components}
              componentOptions={componentOptions}
            />
          </PanelSection>
        </div>
      </div>
    );
  }

  if (path.kind === "component") {
    const { regionName, slotName } = path;
    const index = path.index ?? undefined;
    const regionDefinition = layoutRegions[regionName];
    const regionValue = regions[regionName];
    if (!regionDefinition || !(regionDefinition.slots || []).includes(slotName)) {
      return renderMissing("Component", `${regionName}.${slotName}`);
    }
    const slotValue = regionValue && typeof regionValue === "object" ? regionValue[slotName] : undefined;
    if (Array.isArray(slotValue)) {
      if (typeof index === "number" && (index < 0 || index >= slotValue.length)) {
        return renderMissing("Component", `${regionName}.${slotName}[${index}]`);
      }
    } else if (typeof index === "number") {
      return renderMissing("Component", `${regionName}.${slotName}`);
    }
    return (
      <div style={styles.container}>
        <div style={styles.header}>Properties</div>
        <div style={styles.body}>
          <PanelSection title={`Component in ${formatName(slotName)}`}>
            <SlotEditor
              mode="properties"
              regionName={regionName}
              slotName={slotName}
              value={slotValue}
              onChange={(nextSlot) => setSlotValue(regionName, slotName, nextSlot)}
              components={components}
              componentOptions={componentOptions}
              focusIndex={index}
            />
          </PanelSection>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>Properties</div>
      <div style={styles.body}>
        <div style={styles.emptyState}>Select an element to edit its properties.</div>
      </div>
    </div>
  );
}

function renderMissing(type, name) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>Properties</div>
      <div style={styles.body}>
        <div style={styles.emptyState}>
          {type} "{name}" is no longer available in the layout.
        </div>
      </div>
    </div>
  );
}

function formatName(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid #e5e7eb",
    borderRadius: "1rem",
    background: "#fff",
    overflow: "hidden",
  },
  header: {
    padding: "0.75rem 1rem",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
    fontWeight: 600,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: "1.25rem",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  sectionHeader: {
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  sectionBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
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
  emptyState: {
    fontSize: "0.875rem",
    color: "#6b7280",
  },
};
