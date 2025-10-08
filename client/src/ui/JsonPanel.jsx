import React, { useEffect, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";  


export function JsonPanel({ value, onChange }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState("");

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

    // Configure Monaco JSON diagnostics on mount
    const handleMount = useCallback((editor, monaco) => {
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        enableSchemaRequest: true, // fetch $schema URLs automatically
        schemas: [
            // attach a schema to enable richer linting
            // {
            //   uri: "https://json.schemastore.org/package.json",
            //   fileMatch: ["*"], // apply to this editor's model
            // },
        ],
        });
    }, []);

  const handleApply = () => {
    try {
      const parsed = JSON.parse(text);
      onChange?.(parsed);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Invalid JSON");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setError("Copied to clipboard");
      setTimeout(() => setError(""), 1500);
    } catch (err) {
      console.error(err);
      setError("Unable to copy");
      setTimeout(() => setError(""), 1500);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          padding: "0.75rem",
          borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}
      >
        <button onClick={handleApply} style={btn()}>
          Apply Changes
        </button>
        <button onClick={handleCopy} style={btn(true)}>
          Copy JSON
        </button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>{error}</span>
      </div>
      <div style={{ flex: 1 }}>
         <Editor
           height="100%"
           defaultLanguage="json"
           value={text}
           onChange={(val) => {
             setText(val ?? "");
             if (error && error !== "Copied to clipboard") setError("");
           }}
           onMount={handleMount}
           options={{
             minimap: { enabled: false },
             wordWrap: "on",
             automaticLayout: true,
             scrollBeyondLastLine: false,
             tabSize: 2,
             renderWhitespace: "selection",
           }}
         />
       </div>
    </div>
  );
}

function btn(primary = false) {
  return {
    borderRadius: 6,
    border: primary ? "1px solid #0ea5e9" : "1px solid #d1d5db",
    background: primary ? "#0ea5e9" : "transparent",
    color: primary ? "#fff" : "#111827",
    fontSize: 13,
    padding: "0.25rem 0.75rem",
    cursor: "pointer",
  };
}