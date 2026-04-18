import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { trpc } from "../lib/trpc";
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  TYPE_CONFIG,
  type Status,
  type Priority,
  type ItemType,
} from "../lib/constants";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ItemView() {
  const { slug, id } = useParams({ from: "/w/$slug/i/$id" });

  const itemQuery = trpc.item.get.useQuery({ id });
  const backlinksQuery = trpc.link.listBacklinks.useQuery({ itemId: id });
  const commentsQuery = trpc.comment.list.useQuery({ itemId: id });
  const tagsQuery = trpc.tag.getItemTags.useQuery({ itemId: id });
  const allTagsQuery = trpc.tag.list.useQuery(
    { workspaceId: itemQuery.data?.workspaceId! },
    { enabled: !!itemQuery.data?.workspaceId }
  );

  const updateItem = trpc.item.update.useMutation({
    onSuccess: () => itemQuery.refetch(),
  });
  const createComment = trpc.comment.create.useMutation({
    onSuccess: () => {
      commentsQuery.refetch();
      setCommentText("");
    },
  });
  const deleteComment = trpc.comment.delete.useMutation({
    onSuccess: () => commentsQuery.refetch(),
  });
  const addTag = trpc.tag.addToItem.useMutation({
    onSuccess: () => {
      tagsQuery.refetch();
      setShowTagPicker(false);
    },
  });
  const removeTag = trpc.tag.removeFromItem.useMutation({
    onSuccess: () => tagsQuery.refetch(),
  });

  const [commentText, setCommentText] = useState("");
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
  });

  useEffect(() => {
    if (itemQuery.data?.content && editor && !editor.isDestroyed) {
      editor.commands.setContent(itemQuery.data.content);
    }
  }, [itemQuery.data?.content, editor]);

  useEffect(() => {
    if (itemQuery.data?.title) {
      setTitleValue(itemQuery.data.title);
    }
  }, [itemQuery.data?.title]);

  const saveContent = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const content = editor.getHTML();
    updateItem.mutate({ id, content });
  }, [editor, id, updateItem]);

  // Auto-save on blur
  useEffect(() => {
    if (!editor) return;
    editor.on("blur", saveContent);
    return () => {
      editor.off("blur", saveContent);
    };
  }, [editor, saveContent]);

  function saveTitle() {
    if (titleValue.trim() && titleValue !== itemQuery.data?.title) {
      updateItem.mutate({ id, title: titleValue.trim() });
    }
    setEditingTitle(false);
  }

  if (!itemQuery.data) {
    return <div className="p-8 text-gray-500">Loading...</div>;
  }

  const item = itemQuery.data;
  const status = (item.status || "todo") as Status;
  const priority = (item.priority || "none") as Priority;
  const itemType = (item.type || "task") as ItemType;

  const currentTags = tagsQuery.data ?? [];
  const allTags = allTagsQuery.data ?? [];
  const currentTagIds = new Set(currentTags.map((t: any) => t.id));
  const availableTags = allTags.filter((t: any) => !currentTagIds.has(t.id));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link
          to="/w/$slug"
          params={{ slug }}
          className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
        >
          &larr; Back
        </Link>
        <div className="h-4 w-px bg-gray-300" />
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_CONFIG[itemType].bg}`}>
          {TYPE_CONFIG[itemType].label}
        </span>
        {editingTitle ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setTitleValue(item.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
            className="text-lg font-bold flex-1 border-b-2 border-blue-500 outline-none bg-transparent"
          />
        ) : (
          <h1
            className="text-lg font-bold cursor-pointer hover:text-blue-600 flex-1"
            onClick={() => setEditingTitle(true)}
            title="Click to edit title"
          >
            {item.title}
          </h1>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex">
        {/* Left: main content */}
        <div className="flex-1 p-6 max-w-3xl">
          {/* Editor */}
          <div className="rounded-lg border bg-white p-4 min-h-[300px] shadow-sm">
            <EditorContent editor={editor} className="prose max-w-none" />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={saveContent}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>

          {/* Comments section */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Comments
            </h3>
            <div className="space-y-3 mb-4">
              {commentsQuery.data?.length === 0 && (
                <p className="text-sm text-gray-400">No comments yet.</p>
              )}
              {commentsQuery.data?.map((comment: any) => (
                <div
                  key={comment.id}
                  className="rounded-lg border bg-white p-3 group"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                    <button
                      onClick={() => deleteComment.mutate({ id: comment.id })}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs ml-2 shrink-0"
                      title="Delete comment"
                    >
                      &times;
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {timeAgo(comment.createdAt)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && commentText.trim()) {
                    createComment.mutate({ itemId: id, content: commentText.trim() });
                  }
                }}
                className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  if (commentText.trim()) {
                    createComment.mutate({ itemId: id, content: commentText.trim() });
                  }
                }}
                disabled={!commentText.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-80 border-l bg-white p-5 space-y-6 shrink-0">
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => updateItem.mutate({ id, status: e.target.value as any })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ color: STATUS_CONFIG[status].color }}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k} style={{ color: v.color }}>
                  {v.label}
                </option>
              ))}
            </select>
            <div className="mt-1">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[status].bg}`}>
                {STATUS_CONFIG[status].label}
              </span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => updateItem.mutate({ id, priority: e.target.value as any })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <div className="mt-1">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CONFIG[priority].bg}`}>
                {PRIORITY_CONFIG[priority].label}
              </span>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={item.dueDate ? item.dueDate.slice(0, 10) : ""}
              onChange={(e) =>
                updateItem.mutate({ id, dueDate: e.target.value || undefined })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {currentTags.length === 0 && (
                <span className="text-xs text-gray-400">No tags</span>
              )}
              {currentTags.map((tag: any) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: tag.color ? `${tag.color}20` : "#e5e7eb",
                    color: tag.color || "#374151",
                  }}
                >
                  {tag.name}
                  <button
                    onClick={() => removeTag.mutate({ itemId: id, tagId: tag.id })}
                    className="hover:opacity-70"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            {showTagPicker ? (
              <div className="rounded-md border bg-gray-50 p-2">
                {availableTags.length === 0 ? (
                  <p className="text-xs text-gray-400">No more tags available.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {availableTags.map((tag: any) => (
                      <button
                        key={tag.id}
                        onClick={() => addTag.mutate({ itemId: id, tagId: tag.id })}
                        className="rounded-full px-2 py-0.5 text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: tag.color ? `${tag.color}20` : "#e5e7eb",
                          color: tag.color || "#374151",
                        }}
                      >
                        + {tag.name}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowTagPicker(false)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTagPicker(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Tag
              </button>
            )}
          </div>

          {/* Backlinks */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Backlinks
            </label>
            {backlinksQuery.data?.length === 0 && (
              <p className="text-xs text-gray-400">No backlinks yet.</p>
            )}
            {backlinksQuery.data?.map((bl: any) => (
              <Link
                key={bl.item.id}
                to="/w/$slug/i/$id"
                params={{ slug, id: bl.item.id }}
                className="block rounded p-2 hover:bg-gray-50 text-sm text-gray-700"
              >
                {bl.item.title}
              </Link>
            ))}
            <p className="mt-2 text-xs text-gray-400">
              Use [[Title]] in content to create links.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
