import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache = false;

const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

export default function RichTextEditor() {
  const editorRef = useRef(null);
  const quillInstance = useRef(null);
  const [warnings, setWarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const pipelineRef = useRef(null);

  const sendContentToAPI = async (text) => {
    if (!pipelineRef.current) {
      console.error("Pipeline is not loaded yet.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await pipelineRef.current(text);
      console.log(result);

      setWarnings(
        result.map((item) => ({
          label: item.label,
          score: item.score,
        }))
      );
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSpellCheck = debounce(() => {
    const editorContent = quillInstance.current.root.innerText;
    if (editorContent.trim()) {
      sendContentToAPI(editorContent);
    }
  }, 500);

  useEffect(() => {
    const loadPipeline = async () => {
      try {
        console.log("Loading model...");
        const pipe = await pipeline(
          "sentiment-analysis",
          "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
        );
        pipelineRef.current = pipe;
        console.log("Model loaded successfully.");
      } catch (error) {
        console.error("Error loading the model:", error);
      }
    };

    loadPipeline();

    if (editorRef.current && !quillInstance.current) {
      quillInstance.current = new Quill(editorRef.current, {
        theme: "snow",
        placeholder: "Type here...",
      });

      quillInstance.current.on("text-change", () => {
        setWarnings([]);
        triggerSpellCheck();
      });
    }
  }, []);

  return (
    <div
      style={{
        position: "relative",
        padding: "20px",
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <div
        ref={editorRef}
        style={{
          height: "300px",
          marginBottom: "10px",
          borderRadius: "10px",
          border: "1px solid #ccc",
          backgroundColor: "#f7f7f7",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          padding: "10px",
          fontFamily: "'Open Sans', sans-serif",
        }}
      ></div>

      <div
        style={{ marginTop: "20px", position: "relative", textAlign: "center" }}
      >
        {isLoading && (
          <p style={{ color: "#007BFF", fontWeight: "bold" }}>
            Analyzing sentiment...
          </p>
        )}

        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "8px",
            background: "#FFEFD5",
            boxShadow: "0 3px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          {warnings.map((warning, index) => (
            <p
              key={index}
              style={{ color: "#D9534F", fontWeight: "bold", margin: "8px 0" }}
            >
              <strong>Label:</strong> {warning.label} | <strong>Score:</strong>{" "}
              {warning.score}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
