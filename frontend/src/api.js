const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

function authHeaders(extra = {}) {
  const token = localStorage.getItem("access_token");
  return token
    ? { Authorization: `Bearer ${token}`, ...extra }
    : { ...extra };
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) throw new Error("No refresh token");
  const res = await fetch(`${BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) throw new Error("Session expired");
  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  return data.access;
}

async function apiFetch(url, options = {}) {
  let res = await fetch(url, { ...options, headers: { ...authHeaders(), ...options.headers } });
  if (res.status === 401) {
    try {
      await refreshAccessToken();
      res = await fetch(url, { ...options, headers: { ...authHeaders(), ...options.headers } });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      throw new Error("Session expired. Please log in again.");
    }
  }
  return res;
}

export async function login(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Invalid username or password");
  }
  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  return data;
}

export async function register(username, password) {
  const res = await fetch(`${BASE_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Registration failed");
  }
  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader("content-type") || "";
      const isJson = contentType.includes("application/json");
      if (xhr.status >= 200 && xhr.status < 300) {
        if (!isJson) {
          reject(new Error("Server returned non-JSON response. Check if backend is running correctly."));
          return;
        }
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error("Failed to parse server response."));
        }
      } else {
        let errorMessage = `Upload failed: ${xhr.status} ${xhr.statusText}`;
        try {
          if (isJson) {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch (e) {}
        reject(new Error(errorMessage));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    xhr.open("POST", `${BASE_URL}/files/upload/`);
    const token = localStorage.getItem("access_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  });
}

export async function listUploads(q = "", page = 1, pageSize = 10, order = "-uploaded_at", filters = {}, searchMode = "filename") {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  params.set("order", order);
  if (filters.file_type)   params.set("file_type", filters.file_type);
  if (filters.date_from)   params.set("date_from", filters.date_from);
  if (filters.date_to)     params.set("date_to", filters.date_to);
  if (filters.size_min)    params.set("size_min", String(filters.size_min));
  if (filters.size_max)    params.set("size_max", String(filters.size_max));
  if (filters.folder)      params.set("folder", String(filters.folder));
  if (searchMode === "content") params.set("search_mode", "content");
  const url = `${BASE_URL}/files/?${params.toString()}`;
  const res = await apiFetch(url);

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let errorMessage = `Failed to load files: ${res.status} ${res.statusText}`;
    try {
      if (isJson) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        const text = await res.text();
        console.error("API Error (non-JSON):", res.status, text.substring(0, 200));
      }
    } catch (e) {
      console.error("Error parsing response:", e);
    }
    throw new Error(errorMessage);
  }

  if (!isJson) {
    const text = await res.text();
    console.error("Non-JSON response:", text.substring(0, 200));
    throw new Error("Server returned non-JSON response. Check if backend is running correctly.");
  }

  return res.json();
}

export async function getStats() {
  const res = await apiFetch(`${BASE_URL}/stats/`);
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  if (!res.ok) {
    let errorMessage = `Failed to load stats: ${res.status} ${res.statusText}`;
    try {
      if (isJson) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      }
    } catch (e) {}
    throw new Error(errorMessage);
  }
  if (!isJson) throw new Error("Server returned non-JSON response.");
  return res.json();
}

export async function bulkDelete(ids) {
  const res = await apiFetch(`${BASE_URL}/files/bulk-delete/`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`Bulk delete failed: ${res.status}`);
  return res.json();
}

export async function bulkDownloadZip(ids) {
  const res = await apiFetch(`${BASE_URL}/files/download-zip/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`ZIP download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vault-export.zip";
  a.click();
  URL.revokeObjectURL(url);
}

export async function getDuplicates() {
  const res = await apiFetch(`${BASE_URL}/duplicates/`);
  if (!res.ok) throw new Error(`Failed to load duplicates: ${res.status}`);
  return res.json();
}

export async function downloadFileBlob(uploadId) {
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";
  const res = await apiFetch(`${BASE_URL}/files/${uploadId}/download/`);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  return res.blob();
}

export async function getTags() {
  const res = await apiFetch(`${BASE_URL}/tags/`);
  if (!res.ok) throw new Error(`Failed to load tags: ${res.status}`);
  return res.json();
}

export async function createTag(name, color = "#3b82f6") {
  const res = await apiFetch(`${BASE_URL}/tags/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to create tag: ${res.status}`);
  }
  return res.json();
}

export async function deleteTag(tagId) {
  const res = await apiFetch(`${BASE_URL}/tags/${tagId}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete tag: ${res.status}`);
  return res.json();
}

export async function addTagToFile(uploadId, tagId) {
  const res = await apiFetch(`${BASE_URL}/files/${uploadId}/tags/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag_id: tagId }),
  });
  if (!res.ok) throw new Error(`Failed to add tag: ${res.status}`);
  return res.json();
}

export async function removeTagFromFile(uploadId, tagId) {
  const res = await apiFetch(`${BASE_URL}/files/${uploadId}/tags/${tagId}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to remove tag: ${res.status}`);
  return res.json();
}

export async function getFolders() {
  const res = await apiFetch(`${BASE_URL}/folders/`);
  if (!res.ok) throw new Error(`Failed to load folders: ${res.status}`);
  return res.json();
}

export async function createFolder(name) {
  const res = await apiFetch(`${BASE_URL}/folders/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to create folder: ${res.status}`);
  }
  return res.json();
}

export async function deleteFolder(folderId) {
  const res = await apiFetch(`${BASE_URL}/folders/${folderId}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete folder: ${res.status}`);
  return res.json();
}

export async function moveFile(uploadId, folderId) {
  const res = await apiFetch(`${BASE_URL}/files/${uploadId}/move/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_id: folderId }),
  });
  if (!res.ok) throw new Error(`Failed to move file: ${res.status}`);
  return res.json();
}

export async function deleteFile(uploadId) {
  const res = await apiFetch(`${BASE_URL}/files/${uploadId}/`, {
    method: "DELETE",
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let errorMessage = `Delete failed: ${res.status} ${res.statusText}`;
    try {
      if (isJson) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        const text = await res.text();
        console.error("Delete Error (non-JSON):", res.status, text.substring(0, 200));
      }
    } catch (e) {
      console.error("Error parsing response:", e);
    }
    throw new Error(errorMessage);
  }
  
  if (!isJson) {
    return { message: "File deleted successfully" };
  }
  
  return res.json();
}
