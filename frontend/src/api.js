const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

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

export async function listUploads(q = "", page = 1, pageSize = 10, order = "-uploaded_at") {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  params.set("order", order);
  const url = `${BASE_URL}/files/?${params.toString()}`;
  const res = await fetch(url);

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
  const res = await fetch(`${BASE_URL}/stats/`);
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
  const res = await fetch(`${BASE_URL}/files/bulk-delete/`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`Bulk delete failed: ${res.status}`);
  return res.json();
}

export async function bulkDownloadZip(ids) {
  const res = await fetch(`${BASE_URL}/files/download-zip/`, {
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
  const res = await fetch(`${BASE_URL}/duplicates/`);
  if (!res.ok) throw new Error(`Failed to load duplicates: ${res.status}`);
  return res.json();
}

export async function deleteFile(uploadId) {
  const res = await fetch(`${BASE_URL}/files/${uploadId}/`, {
    method: "DELETE"
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
