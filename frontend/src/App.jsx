import { useState, useEffect, useCallback } from "react";
import { uploadFile, listUploads, deleteFile, getStats } from "./api";
import {
  FiUpload,
  FiSearch,
  FiDownload,
  FiTrash2,
  FiFile,
  FiHardDrive,
  FiCopy,
  FiDatabase,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiAlertCircle,
  FiInbox,
} from "react-icons/fi";
import "./App.css";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const SORT_OPTIONS = [
  { value: "-uploaded_at", label: "Newest first" },
  { value: "uploaded_at", label: "Oldest first" },
  { value: "original_name", label: "Name A–Z" },
  { value: "-original_name", label: "Name Z–A" },
  { value: "-size", label: "Largest first" },
  { value: "size", label: "Smallest first" },
];

function App() {
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [order, setOrder] = useState("-uploaded_at");
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getStats();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listUploads(searchQuery, page, pageSize, order);
      setFiles(data.results);
      setTotalCount(data.count);
      setTotalPages(data.total_pages);
      setError(null);
    } catch (err) {
      console.error("Error loading files:", err);
      setError("Failed to load files: " + err.message);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, pageSize, order]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, order, pageSize]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await uploadFile(file);
      addToast(`"${file.name}" uploaded successfully.`);
      await loadFiles();
      await loadStats();
      e.target.value = "";
    } catch (err) {
      setError("Upload failed: " + err.message);
      addToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (uploadId) => {
    const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";
    window.open(`${BASE_URL}/files/${uploadId}/download/`, "_blank");
  };

  const handleDelete = async (uploadId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      setError(null);
      await deleteFile(uploadId);
      addToast("File deleted successfully.");
      await loadFiles();
      await loadStats();
    } catch (err) {
      setError("Delete failed: " + err.message);
      addToast("Delete failed: " + err.message, "error");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>
            <FiDatabase size={28} />
            File Vault
          </h1>
          <span className="tagline">Secure storage with SHA-256 deduplication</span>
        </div>
      </header>

      <main className="app-main">
        {/* Stats dashboard */}
        <section className="stats-grid">
          <div className={`stat-card ${statsLoading ? "" : "highlight"}`}>
            <div className="label">Total uploads</div>
            <div className="value">
              {statsLoading ? (
                <span className="skeleton" style={{ display: "inline-block", width: 48, height: 28 }} />
              ) : (
                stats?.total_uploads ?? "—"
              )}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Stored files</div>
            <div className="value">
              {statsLoading ? (
                <span className="skeleton" style={{ display: "inline-block", width: 48, height: 28 }} />
              ) : (
                stats?.total_stored_files ?? "—"
              )}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Duplicates saved</div>
            <div className="value">
              {statsLoading ? (
                <span className="skeleton" style={{ display: "inline-block", width: 48, height: 28 }} />
              ) : (
                stats?.duplicates_saved ?? "—"
              )}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Storage used</div>
            <div className="value">
              {statsLoading ? (
                <span className="skeleton" style={{ display: "inline-block", width: 64, height: 28 }} />
              ) : (
                formatSize(stats?.total_storage_bytes ?? 0)
              )}
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <div className="toolbar">
          <input
            type="file"
            id="file-input"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: "none" }}
          />
          <label htmlFor="file-input" className="btn btn-primary" style={{ cursor: uploading ? "not-allowed" : "pointer" }}>
            <FiUpload size={18} />
            {uploading ? "Uploading…" : "Upload file"}
          </label>
          <div className="search-wrap">
            <FiSearch size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search by filename…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select
            className="page-size-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
          <select
            className="page-size-select"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Duplication</th>
                <th>References</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="skeleton-row">
                    <td><span className="skeleton" style={{ width: "80%" }} /></td>
                    <td><span className="skeleton" style={{ width: 60 }} /></td>
                    <td><span className="skeleton" style={{ width: 70 }} /></td>
                    <td><span className="skeleton" style={{ width: 40 }} /></td>
                    <td><span className="skeleton" style={{ width: 120 }} /></td>
                    <td><span className="skeleton" style={{ width: 100 }} /></td>
                  </tr>
                ))
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-icon"><FiInbox /></div>
                      <p>{searchQuery ? "No files match your search." : "No files uploaded yet."}</p>
                      <span className="hint">
                        {!searchQuery && "Use “Upload file” to add your first file."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FiFile size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                        {file.original_name}
                      </span>
                    </td>
                    <td>{formatSize(file.stored_file.size_bytes)}</td>
                    <td>
                      {file.stored_file.ref_count > 1 ? (
                        <span className="badge badge-warning">
                          <FiCopy size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                          Duplicate ({file.stored_file.ref_count} copies)
                        </span>
                      ) : (
                        <span className="badge badge-success">Unique</span>
                      )}
                    </td>
                    <td>{file.stored_file.ref_count}</td>
                    <td>{formatDate(file.uploaded_at)}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => handleDownload(file.id)}
                          title="Download"
                        >
                          <FiDownload size={14} />
                          Download
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(file.id)}
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && files.length > 0 && (
            <div className="pagination">
              <span className="pagination-info">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
              </span>
              <div className="pagination-btns">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <FiChevronLeft size={18} />
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <FiChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        File Vault — Secure corporate file storage with deduplication • Built with Django & React
      </footer>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "success" ? <FiCheckCircle size={20} /> : <FiAlertCircle size={20} />}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
