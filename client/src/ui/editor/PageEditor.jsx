import React from "react";
import { RegionEditor } from "./RegionEditor.jsx";

export function PageEditor({
  page,
  layout,
  components,
  componentOptions,
  selectedPath,
  onSelect,
}) {
  const regions = page?.regions || {};
  const layoutRegions = layout?.regions || {};
  const title = page?.title || "Untitled page";
  const isPageSelected = selectedPath?.kind === "page";

  return (
    <div style={styles.container}>
      <div style={styles.header}>Structure</div>
      <div style={styles.body}>
        <button
          type="button"
          onClick={() => onSelect?.({ kind: "page" })}
          style={{
            ...styles.nodeButton,
            ...(isPageSelected ? styles.nodeButtonActive : {}),
          }}
        >
          Page: {title || "Untitled"}
        </button>
        <div style={styles.regionList}>
          {Object.entries(layoutRegions).map(([regionName, definition]) => (
            <RegionEditor
              key={regionName}
              mode="outline"
              regionName={regionName}
              regionValue={regions[regionName]}
              slots={definition.slots || []}
              components={components}
              componentOptions={componentOptions}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
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
  nodeButton: {
    textAlign: "left",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.75rem",
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.95rem",
  },
  nodeButtonActive: {
    borderColor: "#0ea5e9",
    background: "rgba(14,165,233,0.1)",
  },
  regionList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
};
