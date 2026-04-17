import React, { useCallback, useEffect } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { trpc } from "../lib/trpc";

export function ItemView() {
  const { slug, id } = useParams({ from: "/w/$slug/i/$id" });
  const itemQuery = trpc.item.get.useQuery({ id });
  const backlinksQuery = trpc.link.listBacklinks.useQuery({ itemId: id });
  const updateItem = trpc.item.update.useMutation();

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    onUpdate: ({ editor }) => {
      // Debounced save handled via effect
    },
  });

  useEffect(() => {
    if (itemQuery.data?.content && editor && !editor.isDestroyed) {
      editor.commands.setContent(itemQuery.data.content);
    }
  }, [itemQuery.data?.content, editor]);

  const saveContent = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const content = editor.getHTML();
    updateItem.mutate({ id, content });
  }, [editor, id, updateItem]);

  // Auto-save on blur
  useEffect(() => {
    if (!editor) return;
    editor.on("blur", saveContent);
    return () => { editor.off("blur", saveContent); };
  }, [editor, saveContent]);

  if (!itemQuery.data) {
    return <div className="p-8">Loading...</div>;
  }

  const item = itemQuery.data;

  return (
    <div className="flex min-h-screen">
      {/* Main content */}
      <main className="flex-1 p-8 max-w-3xl mx-auto">
        <Link to="/w/$slug" params={{ slug }} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          &larr; Back to items
        </Link>
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-block rounded px-2 py-0.5 text-xs ${
            item.type === "task" ? "bg-blue-100 text-blue-700" :
            item.type === "note" ? "bg-green-100 text-green-700" :
            "bg-purple-100 text-purple-700"
          }`}>
            {item.type}
          </span>
          <h1 className="text-2xl font-bold">{item.title}</h1>
        </div>

        <div className="rounded border bg-white p-4 min-h-[300px]">
          <EditorContent editor={editor} className="prose max-w-none" />
        </div>

        <div className="mt-2 flex justify-end">
          <button
            onClick={saveContent}
            className="rounded bg-blue-600 px-4 py-1 text-sm text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </main>

      {/* Backlinks panel */}
      <aside className="w-72 border-l bg-white p-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Backlinks</h3>
        {backlinksQuery.data?.length === 0 && (
          <p className="text-sm text-gray-400">No backlinks yet.</p>
        )}
        {backlinksQuery.data?.map((bl) => (
          <Link
            key={bl.item.id}
            to="/w/$slug/i/$id"
            params={{ slug, id: bl.item.id }}
            className="block rounded p-2 hover:bg-gray-50 text-sm"
          >
            {bl.item.title}
          </Link>
        ))}
        <p className="mt-4 text-xs text-gray-400">
          Use [[Title]] in content to create links.
        </p>
      </aside>
    </div>
  );
}
