import React, { useEffect, useState, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import { parseTree, findNodeAtLocation } from "jsonc-parser";
import {
  validateSite,
  pageSchema,
  describeValidationError,
} from "../core/validator.js";

const MARKER_OWNER = "ssb-json";
const SCHEMA_URI = "inmemory://ssb/page.schema.json";

export function JsonPanel({ value, onChange }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState("");
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const containerRef = useRef(null);

  const layoutEditor = useCallback(() => {
    const editor = editorRef.current;
    const container = containerRef.current;
    if (!editor || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 && height === 0) return;

    editor.layout({ width, height });
  }, []);

  const clearMarkers = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (model && monaco) {
      monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    }
  }, []);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
    setError("");
    clearMarkers();
  }, [value, clearMarkers]);

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      enableSchemaRequest: false,
      schemas: [
        {
          uri: SCHEMA_URI,
          fileMatch: ["*"],
          schema: pageSchema,
        },
      ],
    });
    layoutEditor();
  }, [layoutEditor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver !== "function") {
      layoutEditor();
      return;
    }

    const observer = new ResizeObserver((entries) => {
      if (!Array.isArray(entries)) return;
      for (const entry of entries) {
        if (entry.target === container) {
          layoutEditor();
        }
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [layoutEditor]);

  useEffect(() => {
    const handleWindowResize = () => layoutEditor();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleWindowResize);
      return () => window.removeEventListener("resize", handleWindowResize);
    }
    return undefined;
  }, [layoutEditor]);

  const handleApply = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();

    if (model && monaco) {
      monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error(err);
      if (model && monaco) {
        const markers = buildSyntaxMarkers(err, model, monaco);
        monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
      }
      setError(formatSyntaxError(err, model));
      return;
    }

    try {
      validateSite({ page: parsed });
    } catch (err) {
      console.error(err);
      if (model && monaco) {
        const markers = buildValidationMarkers(err, text, model, monaco);
        monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
      }
      setError(describeValidationError(err));
      return;
    }

    onChange?.(parsed);
    setError("");
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
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
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
            automaticLayout: false,
            scrollBeyondLastLine: false,
            tabSize: 2,
            renderWhitespace: "selection",
          }}
        />
      </div>
    </div>
  );
}

function buildSyntaxMarkers(err, model, monaco) {
  const message = err?.message || "Invalid JSON";
  const match = /position (\d+)/i.exec(message);
  if (match) {
    const offset = Number(match[1]);
    const pos = model.getPositionAt(Number.isFinite(offset) ? offset : 0);
    return [
      {
        startLineNumber: pos.lineNumber,
        startColumn: pos.column,
        endLineNumber: pos.lineNumber,
        endColumn: pos.column + 1,
        message,
        severity: monaco.MarkerSeverity.Error,
      },
    ];
  }
  return [
    {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
      message,
      severity: monaco.MarkerSeverity.Error,
    },
  ];
}

function buildValidationMarkers(err, text, model, monaco) {
  if (!Array.isArray(err?.errors) || err.errors.length === 0) {
    return [
      {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        message: err?.message || "Validation failed",
        severity: monaco.MarkerSeverity.Error,
      },
    ];
  }

  const tree = parseTree(text);
  return err.errors.map(validationError => {
    const pointer = validationError.instancePath || "";
    const segments = pointerToSegments(pointer);
    let node = tree ? findNodeAtLocation(tree, segments) : null;
    if (!node && segments.length > 0) {
      node = findNodeAtLocation(tree, segments.slice(0, -1)) || node;
    }
    const range = node ? toRange(model, node) : { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 };
    return {
      ...range,
      message: `${pointer || "/"} ${validationError.message}`,
      severity: monaco.MarkerSeverity.Error,
    };
  });
}

function formatSyntaxError(err, model) {
  const message = err?.message || "Invalid JSON";
  const match = /position (\d+)/i.exec(message);
  if (match && model) {
    const offset = Number(match[1]);
    const pos = model.getPositionAt(Number.isFinite(offset) ? offset : 0);
    return `Invalid JSON at line ${pos.lineNumber}, column ${pos.column}`;
  }
  return "Invalid JSON";
}

function pointerToSegments(pointer) {
  if (!pointer) return [];
  return pointer
    .split("/")
    .slice(1)
    .map(segment => {
      const decoded = segment.replace(/~1/g, "/").replace(/~0/g, "~");
      return /^\d+$/.test(decoded) ? Number(decoded) : decoded;
    });
}

function toRange(model, node) {
  const start = model.getPositionAt(node.offset);
  const end = model.getPositionAt(node.offset + Math.max(node.length || 0, 1));
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  };
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