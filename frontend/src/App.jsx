import { useState, useEffect } from "react";
import { uploadFile, listUploads } from "./api";

function App() {
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await listUploads(searchQuery);
      setFiles(data);
      setError(null);
    } catch (err) {
      console.error("Error loading files:", err);
      setError("Failed to load files: " + err.message);
      setFiles([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await uploadFile(file);
      await loadFiles();
      e.target.value = ""; // Reset input
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (uploadId, filename) => {
    const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";
    window.open(`${BASE_URL}/files/${uploadId}/download/`, "_blank");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "system-ui" }}>
      <h1>File Vault</h1>
      <p style={{ color: "#666" }}>Secure file storage with SHA-256 deduplication</p>
      
      {loading && (
        <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
          Loading files...
        </div>
      )}

      <div style={{ marginBottom: "30px", display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          type="file"
          id="file-input"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{ display: "none" }}
        />
        <label
          htmlFor="file-input"
          style={{
            padding: "10px 20px",
            backgroundColor: uploading ? "#ccc" : "#007bff",
            color: "white",
            borderRadius: "5px",
            cursor: uploading ? "not-allowed" : "pointer",
            display: "inline-block"
          }}
        >
          {uploading ? "Uploading..." : "Upload File"}
        </label>

        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            flex: 1,
            maxWidth: "400px"
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: "10px",
          backgroundColor: "#fee",
          color: "#c33",
          borderRadius: "5px",
          marginBottom: "20px"
        }}>
          {error}
        </div>
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: "5px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Filename</th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Size</th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>SHA-256</th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>References</th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Uploaded</th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                  {searchQuery ? "No files found matching your search." : "No files uploaded yet."}
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>{file.original_name}</td>
                  <td style={{ padding: "12px" }}>{formatSize(file.stored_file.size_bytes)}</td>
                  <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "12px" }}>
                    {file.stored_file.sha256.substring(0, 16)}...
                  </td>
                  <td style={{ padding: "12px" }}>{file.stored_file.ref_count}</td>
                  <td style={{ padding: "12px" }}>{formatDate(file.uploaded_at)}</td>
                  <td style={{ padding: "12px" }}>
                    <button
                      onClick={() => handleDownload(file.id, file.original_name)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer"
                      }}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
