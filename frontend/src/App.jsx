import { useState, useEffect, useCallback } from "react";
import { uploadFile, listUploads, deleteFile, getStats, getDuplicates, bulkDelete, bulkDownloadZip, login, register, logout } from "./api";
import {
  FiUpload,
  FiSearch,
  FiDownload,
  FiTrash2,
  FiFile,
  FiCopy,
  FiDatabase,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiAlertCircle,
  FiInbox,
  FiEye,
  FiX,
  FiFileText,
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
  const [uploadProgress, setUploadProgress] = useState(null);
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
  const [previewFile, setPreviewFile] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  const [activeTab, setActiveTab] = useState("files");
  const [duplicates, setDuplicates] = useState([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [expandedDup, setExpandedDup] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("access_token"));
  const [authTab, setAuthTab] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

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

  const loadDuplicates = useCallback(async () => {
    try {
      setDupLoading(true);
      const data = await getDuplicates();
      setDuplicates(data);
    } catch (err) {
      console.error("Duplicates error:", err);
    } finally {
      setDupLoading(false);
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
    if (activeTab === "duplicates") loadDuplicates();
  }, [activeTab, loadDuplicates]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, order, pageSize]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      await uploadFile(file, (pct) => setUploadProgress(pct));
      addToast(`"${file.name}" uploaded successfully.`);
      await loadFiles();
      await loadStats();
      e.target.value = "";
    } catch (err) {
      setError("Upload failed: " + err.message);
      addToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
      setUploadProgress(null);
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

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} selected file(s)?`)) return;
    setBulkWorking(true);
    try {
      const result = await bulkDelete([...selectedIds]);
      addToast(`Deleted ${result.deleted} file(s).`);
      setSelectedIds(new Set());
      await loadFiles();
      await loadStats();
    } catch (err) {
      addToast("Bulk delete failed: " + err.message, "error");
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkDownload = async () => {
    setBulkWorking(true);
    try {
      await bulkDownloadZip([...selectedIds]);
      addToast("ZIP download started.");
    } catch (err) {
      addToast("ZIP download failed: " + err.message, "error");
    } finally {
      setBulkWorking(false);
    }
  };

  const TEXT_EXTS = new Set(["txt","md","js","jsx","ts","tsx","py","json","csv","html","css","yaml","yml","xml","sh","env","log"]);
  const IMAGE_EXTS = new Set(["jpg","jpeg","png","gif","webp","svg","bmp","ico"]);

  const getPreviewType = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    if (IMAGE_EXTS.has(ext)) return "image";
    if (ext === "pdf") return "pdf";
    if (TEXT_EXTS.has(ext)) return "text";
    return "none";
  };

  const handlePreview = async (file) => {
    setPreviewFile(file);
    setPreviewText(null);
    const type = getPreviewType(file.original_name);
    if (type === "text") {
      try {
        const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";
        const res = await fetch(`${BASE_URL}/files/${file.id}/download/`);
        const text = await res.text();
        setPreviewText(text);
      } catch {
        setPreviewText("Could not load file content.");
      }
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewText(null);
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

        {/* Tabs */}
        <div className="tab-bar">
          <button
            className={`tab-btn${activeTab === "files" ? " active" : ""}`}
            onClick={() => setActiveTab("files")}
          >
            <FiFile size={15} /> All Files
          </button>
          <button
            className={`tab-btn${activeTab === "duplicates" ? " active" : ""}`}
            onClick={() => setActiveTab("duplicates")}
          >
            <FiCopy size={15} /> Duplicate Groups
            {stats?.duplicate_groups > 0 && (
              <span className="tab-badge">{stats.duplicate_groups}</span>
            )}
          </button>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <input
            type="file"
            id="file-input"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label htmlFor="file-input" className="btn btn-primary" style={{ cursor: uploading ? "not-allowed" : "pointer" }}>
              <FiUpload size={18} />
              {uploading ? `Uploading… ${uploadProgress ?? 0}%` : "Upload file"}
            </label>
            {uploadProgress !== null && (
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
          </div>
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

        {/* Duplicates Table */}
        {activeTab === "duplicates" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SHA-256</th>
                  <th>Size</th>
                  <th>Copies</th>
                  <th>Filenames</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dupLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={`dskel-${i}`} className="skeleton-row">
                      <td><span className="skeleton" style={{ width: 140 }} /></td>
                      <td><span className="skeleton" style={{ width: 60 }} /></td>
                      <td><span className="skeleton" style={{ width: 40 }} /></td>
                      <td><span className="skeleton" style={{ width: "70%" }} /></td>
                      <td><span className="skeleton" style={{ width: 80 }} /></td>
                    </tr>
                  ))
                ) : duplicates.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        <div className="empty-icon"><FiCheckCircle /></div>
                        <p>No duplicate files found.</p>
                        <span className="hint">All stored files are unique.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  duplicates.map((group) => (
                    <>
                      <tr key={group.id} className="dup-group-row">
                        <td>
                          <code className="hash-chip" title={group.sha256}>
                            {group.sha256.slice(0, 12)}…
                          </code>
                        </td>
                        <td>{formatSize(group.size_bytes)}</td>
                        <td>
                          <span className="badge badge-warning">
                            <FiCopy size={11} /> {group.ref_count} copies
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setExpandedDup(expandedDup === group.id ? null : group.id)}
                          >
                            {expandedDup === group.id ? "Hide" : "Show"} filenames
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";
                              window.open(`${BASE_URL}/files/${group.uploads[0].id}/download/`, "_blank");
                            }}
                          >
                            <FiDownload size={13} /> Download
                          </button>
                        </td>
                      </tr>
                      {expandedDup === group.id && group.uploads.map((u) => (
                        <tr key={`dup-upload-${u.id}`} className="dup-upload-row">
                          <td colSpan="2" style={{ paddingLeft: "2.5rem" }}>
                            <FiFile size={13} style={{ marginRight: 6, color: "var(--text-muted)" }} />
                            {u.original_name}
                          </td>
                          <td colSpan="3" style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            {formatDate(u.uploaded_at)}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Files Table */}
        {activeTab === "files" && <div className="table-wrap">
          {selectedIds.size > 0 && (
            <div className="bulk-bar">
              <span className="bulk-count">{selectedIds.size} file{selectedIds.size > 1 ? "s" : ""} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} disabled={bulkWorking}>
                <FiTrash2 size={14} /> Delete selected
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleBulkDownload} disabled={bulkWorking}>
                <FiDownload size={14} /> Download as ZIP
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </button>
            </div>
          )}
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={files.length > 0 && selectedIds.size === files.length}
                    onChange={toggleSelectAll}
                    title="Select all"
                  />
                </th>
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
                    <td><span className="skeleton" style={{ width: 18 }} /></td>
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
                  <td colSpan="7">
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
                  <tr key={file.id} className={selectedIds.has(file.id) ? "row-selected" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(file.id)}
                        onChange={() => toggleSelect(file.id)}
                      />
                    </td>
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
                          className="btn btn-ghost btn-sm"
                          onClick={() => handlePreview(file)}
                          title="Preview"
                        >
                          <FiEye size={14} />
                          Preview
                        </button>
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
        </div>}
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

      {/* Preview Panel */}
      {previewFile && (
        <div className="preview-overlay" onClick={closePreview}>
          <div className="preview-panel" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <span className="preview-filename">
                <FiFile size={16} />
                {previewFile.original_name}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={closePreview} title="Close">
                <FiX size={18} />
              </button>
            </div>
            <div className="preview-body">
              {getPreviewType(previewFile.original_name) === "image" && (
                <img
                  src={`${import.meta.env.VITE_API_URL || "http://localhost:8001/api"}/files/${previewFile.id}/download/`}
                  alt={previewFile.original_name}
                  className="preview-image"
                />
              )}
              {getPreviewType(previewFile.original_name) === "pdf" && (
                <iframe
                  src={`${import.meta.env.VITE_API_URL || "http://localhost:8001/api"}/files/${previewFile.id}/download/`}
                  title={previewFile.original_name}
                  className="preview-iframe"
                />
              )}
              {getPreviewType(previewFile.original_name) === "text" && (
                <pre className="preview-code">
                  {previewText === null ? "Loading…" : previewText}
                </pre>
              )}
              {getPreviewType(previewFile.original_name) === "none" && (
                <div className="preview-unsupported">
                  <FiFileText size={48} />
                  <p>Preview not available for this file type.</p>
                </div>
              )}
            </div>
            <div className="preview-footer">
              <span className="text-muted">{formatSize(previewFile.stored_file.size_bytes)}</span>
              <button className="btn btn-primary btn-sm" onClick={() => handleDownload(previewFile.id)}>
                <FiDownload size={14} /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
