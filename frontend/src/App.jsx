import { useState, useEffect, useCallback } from "react";
import { uploadFile, listUploads, deleteFile, getStats, getDuplicates, bulkDelete, bulkDownloadZip, login, register, logout, getTags, createTag, deleteTag, addTagToFile, removeTagFromFile, getFolders, createFolder, deleteFolder, moveFile } from "./api";
import {
  FiUpload,
  FiSearch,
  FiDownload,
  FiTrash2,
  FiFile,
  FiFileText,
  FiImage,
  FiVideo,
  FiMusic,
  FiArchive,
  FiCode,
  FiCopy,
  FiDatabase,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiAlertCircle,
  FiInbox,
  FiEye,
  FiX,
  FiFilter,
  FiSliders,
  FiTag,
  FiPlus,
  FiFolder,
  FiFolderPlus,
  FiMoreVertical,
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
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSizeMin, setFilterSizeMin] = useState("");
  const [filterSizeMax, setFilterSizeMax] = useState("");
  const [filterSizeUnit, setFilterSizeUnit] = useState("MB");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("access_token"));
  const [authTab, setAuthTab] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [allTags, setAllTags] = useState([]);
  const [tagDropdownOpenId, setTagDropdownOpenId] = useState(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [tagWorking, setTagWorking] = useState(false);
  const [folders, setFolders] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [moveDropdownOpenId, setMoveDropdownOpenId] = useState(null);
  const [folderWorking, setFolderWorking] = useState(false);
  const [searchMode, setSearchMode] = useState("filename");

  const loadFolders = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getFolders();
      setFolders(data);
    } catch (err) {
      console.error("Folders error:", err);
    }
  }, [isAuthenticated]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setFolderWorking(true);
    try {
      const folder = await createFolder(newFolderName.trim());
      setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName("");
      setShowNewFolder(false);
      addToast(`Folder "${folder.name}" created.`);
    } catch (err) {
      addToast("Failed to create folder: " + err.message, "error");
    } finally {
      setFolderWorking(false);
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Delete folder "${folderName}"? Files inside will become unorganized.`)) return;
    setFolderWorking(true);
    try {
      await deleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (activeFolderId === folderId) setActiveFolderId(null);
      addToast(`Folder "${folderName}" deleted.`);
    } catch (err) {
      addToast("Failed to delete folder: " + err.message, "error");
    } finally {
      setFolderWorking(false);
    }
  };

  const handleMoveFile = async (uploadId, folderId) => {
    setFolderWorking(true);
    try {
      const updated = await moveFile(uploadId, folderId);
      setFiles((prev) => prev.map((f) => (f.id === uploadId ? updated : f)));
      setMoveDropdownOpenId(null);
      await loadFolders();
    } catch (err) {
      addToast("Failed to move file: " + err.message, "error");
    } finally {
      setFolderWorking(false);
    }
  };

  const loadTags = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getTags();
      setAllTags(data);
    } catch (err) {
      console.error("Tags error:", err);
    }
  }, [isAuthenticated]);

  const handleAddTag = async (uploadId, tagId) => {
    setTagWorking(true);
    try {
      const updated = await addTagToFile(uploadId, tagId);
      setFiles((prev) => prev.map((f) => (f.id === uploadId ? updated : f)));
      setTagDropdownOpenId(null);
    } catch (err) {
      addToast("Failed to add tag: " + err.message, "error");
    } finally {
      setTagWorking(false);
    }
  };

  const handleRemoveTag = async (uploadId, tagId) => {
    setTagWorking(true);
    try {
      await removeTagFromFile(uploadId, tagId);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadId ? { ...f, tags: f.tags.filter((t) => t.id !== tagId) } : f
        )
      );
    } catch (err) {
      addToast("Failed to remove tag: " + err.message, "error");
    } finally {
      setTagWorking(false);
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setTagWorking(true);
    try {
      const tag = await createTag(newTagName.trim(), newTagColor);
      setAllTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTagName("");
      setNewTagColor("#3b82f6");
      addToast(`Tag "${tag.name}" created.`);
    } catch (err) {
      addToast("Failed to create tag: " + err.message, "error");
    } finally {
      setTagWorking(false);
    }
  };

  const handleDeleteTag = async (tagId, tagName) => {
    if (!window.confirm(`Delete tag "${tagName}"? It will be removed from all files.`)) return;
    setTagWorking(true);
    try {
      await deleteTag(tagId);
      setAllTags((prev) => prev.filter((t) => t.id !== tagId));
      setFiles((prev) =>
        prev.map((f) => ({ ...f, tags: f.tags.filter((t) => t.id !== tagId) }))
      );
      addToast(`Tag "${tagName}" deleted.`);
    } catch (err) {
      addToast("Failed to delete tag: " + err.message, "error");
    } finally {
      setTagWorking(false);
    }
  };

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

  const unitMultiplier = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };

  const loadFiles = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const filters = {
        file_type: filterType,
        date_from: filterDateFrom,
        date_to: filterDateTo,
        size_min: filterSizeMin ? Math.round(filterSizeMin * unitMultiplier[filterSizeUnit]) : "",
        size_max: filterSizeMax ? Math.round(filterSizeMax * unitMultiplier[filterSizeUnit]) : "",
        folder: activeFolderId === "none" ? "none" : activeFolderId ?? "",
      };
      const data = await listUploads(searchQuery, page, pageSize, order, filters, searchMode);
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
  }, [searchQuery, page, pageSize, order, isAuthenticated, filterType, filterDateFrom, filterDateTo, filterSizeMin, filterSizeMax, filterSizeUnit, activeFolderId, searchMode]);


  useEffect(() => {
    if (!isAuthenticated) return;
    loadStats();
  }, [loadStats, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === "duplicates") loadDuplicates();
  }, [activeTab, loadDuplicates, isAuthenticated]);

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

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (!moveDropdownOpenId) return;
    const close = () => setMoveDropdownOpenId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [moveDropdownOpenId]);

  useEffect(() => {
    if (!tagDropdownOpenId) return;
    const close = () => setTagDropdownOpenId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [tagDropdownOpenId]);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const username = e.target.username.value.trim();
    const password = e.target.password.value;
    try {
      await login(username, password);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const username = e.target.username.value.trim();
    const password = e.target.password.value;
    try {
      await register(username, password);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setSelectedIds(new Set());
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

  const getCategoryIcon = (category) => {
    switch (category) {
      case "image":    return <FiImage size={16} style={{ color: "#22c55e", flexShrink: 0 }} />;
      case "video":    return <FiVideo size={16} style={{ color: "#a855f7", flexShrink: 0 }} />;
      case "audio":    return <FiMusic size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />;
      case "document": return <FiFileText size={16} style={{ color: "#3b82f6", flexShrink: 0 }} />;
      case "archive":  return <FiArchive size={16} style={{ color: "#ef4444", flexShrink: 0 }} />;
      case "code":     return <FiCode size={16} style={{ color: "#06b6d4", flexShrink: 0 }} />;
      default:         return <FiFile size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />;
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <FiDatabase size={32} />
            <span>File Vault</span>
          </div>
          <div className="auth-tabs">
            <button
              className={`auth-tab-btn${authTab === "login" ? " active" : ""}`}
              onClick={() => { setAuthTab("login"); setAuthError(""); }}
            >
              Sign in
            </button>
            <button
              className={`auth-tab-btn${authTab === "register" ? " active" : ""}`}
              onClick={() => { setAuthTab("register"); setAuthError(""); }}
            >
              Register
            </button>
          </div>

          {authTab === "login" ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label>Username</label>
                <input name="username" type="text" placeholder="Enter username" required autoFocus />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input name="password" type="password" placeholder="Enter password" required />
              </div>
              {authError && <div className="auth-error">{authError}</div>}
              <button className="btn btn-primary" type="submit" disabled={authLoading}>
                {authLoading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label>Username</label>
                <input name="username" type="text" placeholder="Choose a username" required autoFocus />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input name="password" type="password" placeholder="At least 6 characters" required />
              </div>
              {authError && <div className="auth-error">{authError}</div>}
              <button className="btn btn-primary" type="submit" disabled={authLoading}>
                {authLoading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

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
        {isAuthenticated && (
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Sign out">
            <FiX size={16} /> Sign out
          </button>
        )}
      </header>

      <div className="app-body">
        {/* Folder Sidebar */}
        <aside className="folder-sidebar">
          <div className="sidebar-title">Folders</div>
          <nav className="folder-nav">
            <button
              className={`folder-nav-item${activeFolderId === null ? " active" : ""}`}
              onClick={() => setActiveFolderId(null)}
            >
              <FiFile size={14} /> All Files
            </button>
            <button
              className={`folder-nav-item${activeFolderId === "none" ? " active" : ""}`}
              onClick={() => setActiveFolderId("none")}
            >
              <FiInbox size={14} /> Unorganized
            </button>
            <div className="folder-divider" />
            {folders.map((folder) => (
              <div key={folder.id} className="folder-nav-row">
                <button
                  className={`folder-nav-item${activeFolderId === folder.id ? " active" : ""}`}
                  onClick={() => setActiveFolderId(folder.id)}
                >
                  <FiFolder size={14} /> {folder.name}
                  <span className="folder-count">{folder.file_count}</span>
                </button>
                <button
                  className="folder-nav-delete"
                  onClick={() => handleDeleteFolder(folder.id, folder.name)}
                  title="Delete folder"
                >
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </nav>
          {showNewFolder ? (
            <form className="new-folder-form" onSubmit={handleCreateFolder}>
              <input
                type="text"
                placeholder="Folder name…"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                maxLength={100}
              />
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button className="btn btn-primary btn-sm" type="submit" disabled={folderWorking || !newFolderName.trim()}>
                  Add
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button className="btn btn-ghost btn-sm sidebar-add-btn" onClick={() => setShowNewFolder(true)}>
              <FiFolderPlus size={15} /> New Folder
            </button>
          )}
        </aside>

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
              placeholder={searchMode === "content" ? "Search inside files…" : "Search by filename…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <button
            className={`btn btn-ghost btn-sm${searchMode === "content" ? " active" : ""}`}
            onClick={() => setSearchMode((m) => m === "filename" ? "content" : "filename")}
            title="Toggle filename / content search"
          >
            <FiFileText size={15} />
            {searchMode === "content" ? "Content" : "Filename"}
          </button>
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
          <button
            className={`btn btn-ghost btn-sm${showFilters ? " active" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <FiSliders size={16} />
            Filters
            {(filterType || filterDateFrom || filterDateTo || filterSizeMin || filterSizeMax) && (
              <span className="tab-badge">●</span>
            )}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowTagManager(true)}
          >
            <FiTag size={16} />
            Tags
            {allTags.length > 0 && <span className="tab-badge">{allTags.length}</span>}
          </button>
        </div>

        {showFilters && (
          <div className="filter-panel">
            <div className="filter-row">
              <div className="filter-group">
                <label>File Type</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="">All types</option>
                  <option value="image">Images</option>
                  <option value="document">Documents</option>
                  <option value="video">Videos</option>
                  <option value="audio">Audio</option>
                  <option value="archive">Archives</option>
                  <option value="code">Code / Text</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="filter-group">
                <label>From date</label>
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              </div>
              <div className="filter-group">
                <label>To date</label>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              </div>
              <div className="filter-group">
                <label>Min size</label>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <input type="number" min="0" placeholder="0" value={filterSizeMin} onChange={(e) => setFilterSizeMin(e.target.value)} style={{ width: 80 }} />
                  <select value={filterSizeUnit} onChange={(e) => setFilterSizeUnit(e.target.value)}>
                    <option>KB</option><option>MB</option><option>GB</option>
                  </select>
                </div>
              </div>
              <div className="filter-group">
                <label>Max size</label>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <input type="number" min="0" placeholder="∞" value={filterSizeMax} onChange={(e) => setFilterSizeMax(e.target.value)} style={{ width: 80 }} />
                  <select value={filterSizeUnit} onChange={(e) => setFilterSizeUnit(e.target.value)}>
                    <option>KB</option><option>MB</option><option>GB</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => {
                setFilterType(""); setFilterDateFrom(""); setFilterDateTo("");
                setFilterSizeMin(""); setFilterSizeMax("");
              }}>
                <FiX size={14} /> Clear
              </button>
            </div>
          </div>
        )}

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
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {getCategoryIcon(file.stored_file.file_category)}
                          {file.original_name}
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", alignItems: "center" }}>
                          {file.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="tag-chip"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                              <button
                                className="tag-chip-remove"
                                onClick={() => handleRemoveTag(file.id, tag.id)}
                                title={`Remove tag "${tag.name}"`}
                              >
                                <FiX size={10} />
                              </button>
                            </span>
                          ))}
                          <div style={{ position: "relative" }}>
                            <button
                              className="btn-tag-add"
                              onClick={() => setTagDropdownOpenId(tagDropdownOpenId === file.id ? null : file.id)}
                              title="Add tag"
                            >
                              <FiPlus size={11} />
                            </button>
                            {tagDropdownOpenId === file.id && (
                              <div className="tag-dropdown">
                                {allTags.filter((t) => !file.tags.some((ft) => ft.id === t.id)).length === 0 ? (
                                  <div className="tag-dropdown-empty">All tags applied</div>
                                ) : (
                                  allTags
                                    .filter((t) => !file.tags.some((ft) => ft.id === t.id))
                                    .map((tag) => (
                                      <button
                                        key={tag.id}
                                        className="tag-dropdown-item"
                                        onClick={() => handleAddTag(file.id, tag.id)}
                                      >
                                        <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                                        {tag.name}
                                      </button>
                                    ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
                        <div style={{ position: "relative" }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => { e.stopPropagation(); setMoveDropdownOpenId(moveDropdownOpenId === file.id ? null : file.id); }}
                            title="Move to folder"
                          >
                            <FiFolder size={14} />
                            Move
                          </button>
                          {moveDropdownOpenId === file.id && (
                            <div className="tag-dropdown" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="tag-dropdown-item"
                                onClick={() => handleMoveFile(file.id, null)}
                              >
                                <FiInbox size={13} /> Unorganized
                              </button>
                              {folders.map((folder) => (
                                <button
                                  key={folder.id}
                                  className="tag-dropdown-item"
                                  onClick={() => handleMoveFile(file.id, folder.id)}
                                >
                                  <FiFolder size={13} /> {folder.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
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
      </div>

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

      {/* Tag Manager Modal */}
      {showTagManager && (
        <div className="preview-overlay" onClick={() => setShowTagManager(false)}>
          <div className="tag-manager-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <span className="preview-filename"><FiTag size={16} /> Tag Manager</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowTagManager(false)}><FiX size={18} /></button>
            </div>
            <div className="tag-manager-body">
              <form className="tag-create-form" onSubmit={handleCreateTag}>
                <input
                  type="text"
                  placeholder="New tag name…"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  maxLength={50}
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  title="Pick tag color"
                  className="color-picker"
                />
                <button className="btn btn-primary btn-sm" type="submit" disabled={tagWorking || !newTagName.trim()}>
                  <FiPlus size={14} /> Create
                </button>
              </form>
              <div className="tag-list">
                {allTags.length === 0 && (
                  <div className="tag-dropdown-empty">No tags yet. Create one above.</div>
                )}
                {allTags.map((tag) => (
                  <div key={tag.id} className="tag-list-item">
                    <span className="tag-chip" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteTag(tag.id, tag.name)}
                      disabled={tagWorking}
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
