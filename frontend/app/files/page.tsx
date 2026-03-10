"use client";

import { useEffect, useState } from "react";
import { LayoutShell } from "@/components/layout-shell";
import { UploadDropzone } from "@/components/upload-dropzone";
import { api } from "@/lib/api";

type FileRow = {
  id: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  folder_id: string | null;
  created_at: string;
};

type FolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
};

function getFileExtension(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return name.slice(dotIndex).toLowerCase();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function isTextLikeFile(file: FileRow): boolean {
  const mime = (file.mime_type || "").toLowerCase();
  const ext = getFileExtension(file.name);
  const textExtensions = [
    ".txt",
    ".md",
    ".csv",
    ".log",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".html",
    ".css",
    ".sql",
    ".sh",
  ];
  return (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("javascript") ||
    mime.includes("csv") ||
    textExtensions.includes(ext)
  );
}

function isImageFile(file: FileRow): boolean {
  const mime = (file.mime_type || "").toLowerCase();
  const ext = getFileExtension(file.name);
  return mime.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".ico"].includes(ext);
}

function isVideoFile(file: FileRow): boolean {
  const mime = (file.mime_type || "").toLowerCase();
  const ext = getFileExtension(file.name);
  return mime.startsWith("video/") || [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"].includes(ext);
}

function isAudioFile(file: FileRow): boolean {
  const mime = (file.mime_type || "").toLowerCase();
  const ext = getFileExtension(file.name);
  return mime.startsWith("audio/") || [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"].includes(ext);
}

function isPdfFile(file: FileRow): boolean {
  const mime = (file.mime_type || "").toLowerCase();
  const ext = getFileExtension(file.name);
  return mime.includes("pdf") || ext === ".pdf";
}

function isPreviewSupported(file: FileRow): boolean {
  return isImageFile(file) || isVideoFile(file) || isAudioFile(file) || isPdfFile(file) || isTextLikeFile(file);
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState("");
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  async function loadFiles() {
    const [fileRows, folderRows] = await Promise.all([
      api<FileRow[]>("/files"),
      api<FolderRow[]>("/folders"),
    ]);
    setFiles(fileRows);
    setFolders(folderRows);
  }

  useEffect(() => {
    loadFiles().catch(() => {
      setFiles([]);
      setFolders([]);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const currentFolder = folders.find((f) => f.id === currentFolderId);
  const currentPath = currentFolder?.path || "/";
  const breadcrumbs = currentPath.split("/").filter(Boolean);

  const visibleFolders = folders.filter((f) => f.parent_id === currentFolderId);
  const visibleFiles = files.filter((f) => f.folder_id === currentFolderId);

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolder.trim()) return;
    await api("/folders", {
      method: "POST",
      body: JSON.stringify({ name: newFolder, parent_id: currentFolderId }),
    });
    setNewFolder("");
    await loadFiles();
  }

  async function renameFile(id: string) {
    const name = prompt("New file name");
    if (!name) return;
    await api(`/files/${id}/rename`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    await loadFiles();
  }

  async function deleteFile(id: string) {
    if (!confirm("Delete this file?")) return;
    await api(`/files/${id}`, { method: "DELETE" });
    await loadFiles();
  }

  async function deleteFolder(id: string) {
    if (!confirm("Delete this folder?")) return;
    await api(`/folders/${id}`, { method: "DELETE" });
    if (currentFolderId === id) setCurrentFolderId(null);
    await loadFiles();
  }

  function downloadFile(file: FileRow) {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"}/files/${file.id}/download`;
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    const token = localStorage.getItem("access_token");
    if (token) {
      // For download we need to add auth header, but <a> doesn't support it
      // So we fetch and create blob URL instead
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })
        .then((r) => r.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          link.href = blobUrl;
          link.click();
          URL.revokeObjectURL(blobUrl);
        });
    } else {
      link.click();
    }
  }

  async function openPreview(file: FileRow) {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewText("");

    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const token = localStorage.getItem("access_token");
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"}/files/${file.id}/download`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load preview");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);

      if (isTextLikeFile(file)) {
        const content = await blob.text();
        setPreviewText(content.slice(0, 200000));
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewText("");
    setPreviewError("");
    setPreviewFile(null);
  }

  function navigateUp() {
    if (!currentFolder) return;
    setCurrentFolderId(currentFolder.parent_id);
  }

  return (
    <LayoutShell>
      <div className="space-y-4">
        <UploadDropzone onUploaded={loadFiles} folderId={currentFolderId} />

        {/* Breadcrumb Navigation */}
        <div className="glass flex items-center gap-2 rounded-2xl p-4">
          <button
            onClick={() => setCurrentFolderId(null)}
            className={`rounded-lg px-3 py-1 text-sm transition ${
              currentFolderId === null ? "bg-accent/20 font-medium text-accent" : "hover:bg-card/70"
            }`}
          >
            Home
          </button>
          {breadcrumbs.map((crumb, i) => {
            const folderForCrumb = folders.find((f) => f.path === "/" + breadcrumbs.slice(0, i + 1).join("/"));
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="opacity-50">/</span>
                <button
                  onClick={() => setCurrentFolderId(folderForCrumb?.id || null)}
                  className="rounded-lg px-3 py-1 text-sm transition hover:bg-card/70"
                >
                  {crumb}
                </button>
              </div>
            );
          })}
        </div>

        <form onSubmit={createFolder} className="glass flex gap-2 rounded-2xl p-4">
          <input
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            placeholder="Create folder"
            className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2"
          />
          <button className="rounded-xl bg-accent/80 px-4 py-2 text-white">Create Folder</button>
        </form>

        <section className="glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {currentFolder ? currentFolder.name : "My Files"}
            </h2>
            {currentFolder && (
              <button onClick={navigateUp} className="rounded-lg border border-border px-3 py-1 text-sm transition hover:bg-card/70">
                ← Back
              </button>
            )}
          </div>

          <div className="space-y-2">
            {/* Folders */}
            {visibleFolders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card/30 p-3"
              >
                <div className="flex flex-1 cursor-pointer items-center gap-3" onClick={() => setCurrentFolderId(folder.id)}>
                  <div className="text-2xl">📁</div>
                  <div>
                    <p className="font-medium">{folder.name}</p>
                    <p className="text-xs opacity-60">{folder.path}</p>
                  </div>
                </div>
                <button
                  className="rounded-lg border border-border px-3 py-1 text-sm transition hover:bg-red-500/20"
                  onClick={() => deleteFolder(folder.id)}
                >
                  Delete
                </button>
              </div>
            ))}

            {/* Files */}
            {visibleFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm cursor-pointer transition hover:bg-accent/5"
                onDoubleClick={() => void openPreview(file)}
              >
                <div className="flex flex-1 items-center gap-3">
                  <div className="text-2xl">
                    {isImageFile(file) ? "🖼️" : 
                    isVideoFile(file) ? "🎥" :
                    isAudioFile(file) ? "🎵" :
                    isPdfFile(file) ? "📄" : 
                     isTextLikeFile(file) ? "📝" : "📎"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs opacity-70">{formatBytes(file.size_bytes)} • {file.mime_type}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isPreviewSupported(file) && (
                    <button
                      className="rounded-lg border border-border px-3 py-1 transition hover:bg-accent/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        void openPreview(file);
                      }}
                    >
                      Open
                    </button>
                  )}
                  {isPreviewSupported(file) && (
                    <button
                      className="rounded-lg border border-border px-3 py-1 transition hover:bg-accent/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        void openPreview(file);
                      }}
                      title="Of dubbelklik om te openen"
                    >
                      Bekijk
                    </button>
                  )}
                  <button
                    className="rounded-lg border border-border px-3 py-1 transition hover:bg-accent/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(file);
                    }}
                  >
                    Download
                  </button>
                  <button
                    className="rounded-lg border border-border px-3 py-1 transition hover:bg-accent/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      renameFile(file.id);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="rounded-lg border border-border px-3 py-1 transition hover:bg-red-500/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(file.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {visibleFolders.length === 0 && visibleFiles.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm opacity-60">
                This folder is empty
              </p>
            )}
          </div>
        </section>

        {/* File Preview Modal */}
        {previewFile && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={closePreview}
          >
            <div
              className="glass max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">{previewFile.name}</h2>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-border bg-card px-4 py-2 text-sm transition hover:bg-accent/10"
                    onClick={() => downloadFile(previewFile)}
                  >
                    Download
                  </button>
                  <button
                    className="rounded-xl border border-border bg-card px-4 py-2 text-sm transition hover:bg-accent/10"
                    onClick={closePreview}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-black/20 p-4">
                {previewLoading && <p className="text-sm opacity-70">Loading preview...</p>}
                {!previewLoading && previewError && <p className="text-sm text-red-400">{previewError}</p>}

                {!previewLoading && !previewError && previewUrl && isImageFile(previewFile) && (
                  <img
                    src={previewUrl}
                    alt={previewFile.name}
                    className="mx-auto max-h-[70vh] w-auto rounded-lg"
                  />
                )}
                {!previewLoading && !previewError && previewUrl && isVideoFile(previewFile) && (
                  <video
                    controls
                    className="mx-auto max-h-[70vh] w-auto rounded-lg"
                    src={previewUrl}
                  />
                )}
                {!previewLoading && !previewError && previewUrl && isAudioFile(previewFile) && (
                  <audio
                    controls
                    className="w-full"
                    src={previewUrl}
                  />
                )}
                {!previewLoading && !previewError && previewUrl && isPdfFile(previewFile) && (
                  <iframe
                    src={previewUrl}
                    className="h-[70vh] w-full rounded-lg"
                    title={previewFile.name}
                  />
                )}

                {!previewLoading && !previewError && previewText && isTextLikeFile(previewFile) && (
                  <div className="max-h-[70vh] overflow-auto rounded-lg bg-card">
                    <pre className="whitespace-pre-wrap font-mono text-xs p-4 leading-relaxed">
                      {previewText}
                    </pre>
                    {previewText.length === 200000 && (
                      <p className="text-xs opacity-60 p-2 border-t border-border">
                        File is too large. Showing first 200KB. <button onClick={() => downloadFile(previewFile)} className="underline hover:opacity-100">Download full file</button>
                      </p>
                    )}
                  </div>
                )}

                {!previewLoading && !previewError && !previewText && previewUrl && !isImageFile(previewFile) && !isVideoFile(previewFile) && !isAudioFile(previewFile) && !isPdfFile(previewFile) && (
                  <div className="space-y-2">
                    <p className="text-sm opacity-70">Preview for this file type is limited.</p>
                    <button
                      className="rounded-lg border border-border px-3 py-1 text-sm transition hover:bg-accent/10"
                      onClick={() => downloadFile(previewFile)}
                    >
                      Download file
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
