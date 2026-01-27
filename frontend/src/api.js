const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/files/upload/`, {
    method: "POST",
    body: formData
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let errorMessage = `Upload failed: ${res.status} ${res.statusText}`;
    try {
      if (isJson) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        const text = await res.text();
        console.error("Upload Error (non-JSON):", res.status, text.substring(0, 200));
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

export async function listUploads(q = "") {
  const url = q ? `${BASE_URL}/files/?q=${encodeURIComponent(q)}` : `${BASE_URL}/files/`;
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
