import React from "react";
import { FieldEditor, defaultValueForSchema } from "./FieldEditor.jsx";

function createComponent(type, schema, previous = {}) {
  if (!type) return undefined;
  const base = {
    type,
    props: schema ? defaultValueForSchema(schema) || {} : {},
  };
  if (previous._wrapTw) base._wrapTw = previous._wrapTw;
  return base;
}

function ComponentEditor({
  component,
  onChange,
  onRemove,
  components,
  componentOptions,
  label,
}) {
  const current = component && typeof component === "object" ? component : {};
  const type = current.type || "";
  const schema = type ? components[type] : null;
  const propsValue = current.props && typeof current.props === "object" ? current.props : {};
  const wrapTw = current._wrapTw || "";

  return (
    <div style={propertyStyles.component}>
      <div style={propertyStyles.componentHeader}>
        <label style={{ ...propertyStyles.label, flex: 1 }}>
          <span style={propertyStyles.labelText}>{label}</span>
          <select
            value={type}
            onChange={(e) => {
              const nextType = e.target.value;
              if (!nextType) {
                if (onRemove) onRemove();
                else onChange(undefined);
                return;
              }
              const nextSchema = components[nextType];
              onChange(createComponent(nextType, nextSchema, current));
            }}
            style={propertyStyles.input}
          >
            <option value="">Select component</option>
            {componentOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={propertyStyles.removeButton}
          >
            Remove
          </button>
        )}
      </div>

      {type && (
        <div style={propertyStyles.componentBody}>
          <label style={propertyStyles.label}>
            <span style={propertyStyles.labelText}>Wrapper classes (_wrapTw)</span>
            <input
              type="text"
              value={wrapTw}
              onChange={(e) => {
                const val = e.target.value;
                const next = { ...current, type, props: propsValue };
                if (val) next._wrapTw = val;
                else delete next._wrapTw;
                onChange(next);
              }}
              style={propertyStyles.input}
            />
          </label>
          {schema ? (
            <FieldEditor
              schema={schema}
              value={propsValue}
              onChange={(val) => {
                const next = { ...current, type, props: val ?? {} };
                if (!val) delete next.props;
                onChange(next);
              }}
              path={[type, "props"]}
            />
          ) : (
            <div style={propertyStyles.missingSchema}>No schema found for {type}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function SlotEditor({
  slotName,
  value,
  onChange,
  components,
  componentOptions,
  mode = "properties",
  regionName,
  selectedPath,
  onSelect,
  focusIndex,
}) {
  const header = slotName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (mode === "outline") {
    const slotSelected =
      selectedPath?.kind === "slot" &&
      selectedPath?.regionName === regionName &&
      selectedPath?.slotName === slotName;

    const renderComponentSummary = (component, idx) => {
      if (!component || typeof component !== "object") {
        return "Empty component";
      }
      return component.type || `Item ${idx + 1}`;
    };

    const handleSelectSlot = () => {
      onSelect?.({ kind: "slot", regionName, slotName });
    };

    const componentItems = Array.isArray(value)
      ? value.map((item, idx) => ({ item, idx }))
      : value
      ? [{ item: value, idx: null }]
      : [];

    return (
      <div style={outlineStyles.slot}>
        <button
          type="button"
          onClick={handleSelectSlot}
          style={{
            ...outlineStyles.nodeButton,
            ...(slotSelected ? outlineStyles.nodeButtonActive : {}),
          }}
        >
          {header}
        </button>
        <div style={outlineStyles.componentList}>
          {componentItems.length === 0 ? (
            <div style={outlineStyles.emptyLabel}>Empty</div>
          ) : (
            componentItems.map(({ item, idx }) => {
              const isSelected =
                selectedPath?.kind === "component" &&
                selectedPath?.regionName === regionName &&
                selectedPath?.slotName === slotName &&
                (selectedPath?.index ?? null) === (idx ?? null);
              return (
                <button
                  key={idx ?? "single"}
                  type="button"
                  onClick={() =>
                    onSelect?.({
                      kind: "component",
                      regionName,
                      slotName,
                      index: idx ?? null,
                    })
                  }
                  style={{
                    ...outlineStyles.nodeButton,
                    ...(isSelected ? outlineStyles.nodeButtonActive : {}),
                  }}
                >
                  {renderComponentSummary(item, idx ?? 0)}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const arrayValue = Array.isArray(value) ? value : undefined;
  const focusIndexes =
    arrayValue && focusIndex !== undefined && focusIndex !== null
      ? arrayValue
          .map((_, idx) => idx)
          .filter((idx) => idx === focusIndex)
      : arrayValue
      ? arrayValue.map((_, idx) => idx)
      : [];

  if (arrayValue) {
    const renderIndexes = focusIndexes.length ? focusIndexes : arrayValue.map((_, idx) => idx);
    return (
      <div style={propertyStyles.slot}>
        <div style={propertyStyles.slotHeader}>{header}</div>
        {renderIndexes.map((idx) => (
          <ComponentEditor
            key={idx}
            component={arrayValue[idx]}
            onChange={(nextComponent) => {
              if (!onChange) return;
              if (nextComponent === undefined) {
                const next = arrayValue.filter((_, i) => i !== idx);
                onChange(next.length ? next : []);
              } else {
                const next = [...arrayValue];
                next[idx] = nextComponent;
                onChange(next);
              }
            }}
            onRemove={() => {
              if (!onChange) return;
              const next = arrayValue.filter((_, i) => i !== idx);
              onChange(next.length ? next : []);
            }}
            components={components}
            componentOptions={componentOptions}
            label={`Item ${idx + 1}`}
          />
        ))}
        {(!focusIndexes.length || focusIndex === undefined || focusIndex === null) && (
          <button
            type="button"
            onClick={() => {
              if (!onChange) return;
              const defaultType = componentOptions[0];
              if (defaultType) {
                onChange([
                  ...(arrayValue || []),
                  createComponent(defaultType, components[defaultType] || {}),
                ]);
              }
            }}
            style={propertyStyles.addButton}
          >
            Add Component
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={propertyStyles.slot}>
      <div style={propertyStyles.slotHeader}>{header}</div>
      <ComponentEditor
        component={value}
        onChange={(nextComponent) => {
          if (!onChange) return;
          if (nextComponent === undefined) onChange(undefined);
          else onChange(nextComponent);
        }}
        onRemove={() => {
          if (!onChange) return;
          onChange(undefined);
        }}
        components={components}
        componentOptions={componentOptions}
        label="Component"
      />
    </div>
  );
}

const propertyStyles = {
  slot: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: "1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.75rem",
    background: "#fff",
  },
  slotHeader: {
    fontSize: "1rem",
    fontWeight: 600,
  },
  component: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  componentHeader: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "flex-end",
  },
  componentBody: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
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
  removeButton: {
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    border: "1px solid #ef4444",
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.75rem",
    height: "2.25rem",
  },
  addButton: {
    alignSelf: "flex-start",
    padding: "0.35rem 0.85rem",
    borderRadius: "9999px",
    border: "1px solid #0ea5e9",
    background: "#0ea5e9",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.75rem",
  },
  missingSchema: {
    padding: "0.75rem",
    borderRadius: "0.5rem",
    background: "#fef3c7",
    color: "#92400e",
    fontSize: "0.875rem",
  },
};

const outlineStyles = {
  slot: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  nodeButton: {
    textAlign: "left",
    padding: "0.4rem 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  nodeButtonActive: {
    borderColor: "#0ea5e9",
    background: "rgba(14,165,233,0.12)",
  },
  componentList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    paddingLeft: "1rem",
  },
  emptyLabel: {
    color: "#9ca3af",
    fontSize: "0.75rem",
    paddingLeft: "0.25rem",
  },
};

export { createComponent };
