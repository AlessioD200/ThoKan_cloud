"use client";

import { useEffect, useState } from "react";
import { LayoutShell } from "@/components/layout-shell";
import { UploadDropzone } from "@/components/upload-dropzone";
import { api, apiRaw, getApiBase } from "@/lib/api";

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

function isOfficeWordFile(file: FileRow): boolean {
  const ext = getFileExtension(file.name);
  return ext === ".docx" || ext === ".doc";
}

function isOfficeExcelFile(file: FileRow): boolean {
  const ext = getFileExtension(file.name);
  return ext === ".xlsx" || ext === ".xls";
}

function isOfficePowerPointFile(file: FileRow): boolean {
  const ext = getFileExtension(file.name);
  return ext === ".pptx" || ext === ".ppt";
}

function isOfficeFile(file: FileRow): boolean {
  return isOfficeWordFile(file) || isOfficeExcelFile(file) || isOfficePowerPointFile(file);
}

function isPreviewSupported(file: FileRow): boolean {
  return isImageFile(file) || isVideoFile(file) || isAudioFile(file) || isPdfFile(file) || isTextLikeFile(file) || isOfficeFile(file);
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState("");
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [previewOfficeUrl, setPreviewOfficeUrl] = useState<string | null>(null);
  const [officePreviewFailed, setOfficePreviewFailed] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [openActionFileId, setOpenActionFileId] = useState<string | null>(null);
  const [userNotice, setUserNotice] = useState("");
  const [userError, setUserError] = useState("");

  async function loadFiles() {
    try {
      setUserError("");
      setUserNotice("Bestanden worden geladen...");
      const [fileRows, folderRows] = await Promise.all([
        api<FileRow[]>("/files"),
        api<FolderRow[]>("/folders"),
      ]);
      setFiles(fileRows);
      setFolders(folderRows);
      setUserNotice("Bestandslijst bijgewerkt.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Laden mislukt";
      setUserError(`Bestanden laden mislukt: ${message}`);
      setUserNotice("");
      throw err;
    }
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
    try {
      setUserError("");
      setUserNotice("Map wordt aangemaakt...");
      await api("/folders", {
        method: "POST",
        body: JSON.stringify({ name: newFolder, parent_id: currentFolderId }),
      });
      setNewFolder("");
      await loadFiles();
      setUserNotice("Map aangemaakt.");
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Map aanmaken mislukt");
    }
  }

  async function renameFile(id: string) {
    const name = prompt("New file name");
    if (!name) return;
    try {
      setUserError("");
      setUserNotice("Bestand wordt hernoemd...");
      await api(`/files/${id}/rename`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await loadFiles();
      setUserNotice("Bestand hernoemd.");
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Hernoemen mislukt");
    }
  }

  async function deleteFile(id: string) {
    if (!confirm("Delete this file?")) return;
    try {
      setUserError("");
      setUserNotice("Bestand wordt verwijderd...");
      await api(`/files/${id}`, { method: "DELETE" });
      await loadFiles();
      setUserNotice("Bestand verwijderd.");
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Verwijderen mislukt");
    }
  }

  async function deleteFolder(id: string) {
    if (!confirm("Delete this folder?")) return;
    try {
      setUserError("");
      setUserNotice("Map wordt verwijderd...");
      await api(`/folders/${id}`, { method: "DELETE" });
      if (currentFolderId === id) setCurrentFolderId(null);
      await loadFiles();
      setUserNotice("Map verwijderd.");
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Map verwijderen mislukt");
    }
  }

  async function downloadFile(file: FileRow) {
    const url = `${getApiBase()}/files/${file.id}/download`;
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    try {
      setUserError("");
      setUserNotice(`Download voorbereiden: ${file.name}...`);
      const response = await apiRaw(`/files/${file.id}/download`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      link.click();
      URL.revokeObjectURL(blobUrl);
      setUserNotice(`Download gestart: ${file.name}`);
    } catch {
      setUserError(`Download mislukt voor ${file.name}.`);
      setUserNotice("Fallback download wordt geprobeerd...");
      link.click();
    }
  }

  async function openPreview(file: FileRow) {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewText("");
    setPreviewOfficeUrl(null);
    setOfficePreviewFailed(false);
    setOpenActionFileId(null);
    setUserError("");
    setUserNotice(`Preview wordt geopend voor ${file.name}...`);

    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (isOfficeFile(file)) {
        setUserNotice("Office-document gedetecteerd. We openen een online viewer...");
        const token = localStorage.getItem("access_token");
        if (!token) {
          throw new Error("Session expired. Please log in again.");
        }
        const officeSource = `${getApiBase()}/files/${file.id}/download?token=${encodeURIComponent(token)}`;
        const officeViewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(officeSource)}`;
        setPreviewOfficeUrl(officeViewer);
        setPreviewUrl(null);
        setUserNotice("Office viewer geopend. Als dit niet werkt is je server waarschijnlijk niet publiek bereikbaar.");
        return;
      }

      setUserNotice("Bestand ophalen voor preview...");
      const response = await apiRaw(`/files/${file.id}/download`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);

      if (isTextLikeFile(file)) {
        setUserNotice("Tekstbestand gedetecteerd. Inhoud wordt getoond...");
        const content = await blob.text();
        setPreviewText(content.slice(0, 200000));
      }
      setUserNotice(`Preview klaar: ${file.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Load failed";
      setPreviewError(message);
      setUserError(`Preview mislukt voor ${file.name}: ${message}`);
      setPreviewUrl(null);
      setPreviewOfficeUrl(null);
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
    setPreviewOfficeUrl(null);
    setOfficePreviewFailed(false);
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

        {userNotice && (
          <div className="glass rounded-xl p-3 text-sm opacity-90">
            {userNotice}
          </div>
        )}
        {userError && (
          <div className="glass rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {userError}
          </div>
        )}

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
                className="relative flex items-center justify-between rounded-xl border border-border p-3 text-sm cursor-pointer transition hover:bg-accent/5"
                onDoubleClick={() => void openPreview(file)}
              >
                <div className="flex flex-1 items-center gap-3">
                  <div className="text-2xl">
                    {isImageFile(file) ? "🖼️" : 
                    isVideoFile(file) ? "🎥" :
                    isAudioFile(file) ? "🎵" :
                    isPdfFile(file) ? "📄" : 
                    isOfficeWordFile(file) ? "📝" :
                    isOfficeExcelFile(file) ? "📊" :
                    isOfficePowerPointFile(file) ? "📽️" :
                     isTextLikeFile(file) ? "📝" : "📎"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs opacity-70">{formatBytes(file.size_bytes)} • {file.mime_type}</p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    className="rounded-lg border border-border px-3 py-1 text-lg leading-none transition hover:bg-accent/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenActionFileId((prev) => (prev === file.id ? null : file.id));
                    }}
                    aria-label="Bestandsacties"
                    title="Bestandsacties"
                  >
                    ⋯
                  </button>

                  {openActionFileId === file.id && (
                    <div
                      className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-border bg-card p-1 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isPreviewSupported(file) && (
                        <button
                          className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-accent/10"
                          onClick={() => void openPreview(file)}
                        >
                          Openen
                        </button>
                      )}
                      <button
                        className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-accent/10"
                        onClick={() => {
                          void downloadFile(file);
                          setOpenActionFileId(null);
                        }}
                      >
                        Download
                      </button>
                      <button
                        className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-accent/10"
                        onClick={() => {
                          void renameFile(file.id);
                          setOpenActionFileId(null);
                        }}
                      >
                        Hernoemen
                      </button>
                      <button
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/20"
                        onClick={() => {
                          void deleteFile(file.id);
                          setOpenActionFileId(null);
                        }}
                      >
                        Verwijderen
                      </button>
                    </div>
                  )}
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

                {!previewLoading && !previewError && previewOfficeUrl && isOfficeFile(previewFile) && (
                  <div className="space-y-3">
                    <p className="text-xs opacity-70">
                      Office preview gebruikt een externe viewer. Als je een fout ziet, controleer of je server publiek bereikbaar is.
                    </p>
                    <button
                      className="rounded-lg border border-border px-3 py-1 text-sm font-medium transition hover:bg-accent/10"
                      onClick={() => void downloadFile(previewFile)}
                    >
                      Open lokaal via download
                    </button>
                    {officePreviewFailed && (
                      <p className="text-sm text-red-300">
                        Office viewer kon niet laden. Gebruik "Open lokaal via download".
                      </p>
                    )}
                    <iframe
                      src={previewOfficeUrl}
                      className="h-[70vh] w-full rounded-lg"
                      title={previewFile.name}
                      onError={() => {
                        setOfficePreviewFailed(true);
                        setUserError("Office preview kon niet laden. Download wordt aanbevolen.");
                        setUserNotice("");
                      }}
                    />
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
