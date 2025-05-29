import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Link from '@tiptap/extension-link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React, { useEffect } from 'react'
import Toolbar from './toolbar';
import DOMPurify from 'dompurify';
import CustomMarkdownSerializer from '@/src/app/lib/md-serializer';

const extensions = [
  StarterKit.configure({
    bulletList: false,
    orderedList: false,
  }),
  Underline,
  Strike,
  BulletList.configure({
    HTMLAttributes: {
      class: 'list-disc pl-[1.5em]',
    },
  }),
  OrderedList.configure({
    HTMLAttributes: {
      class: 'list-decimal pl-[1.5em]',
    },
  }),
  ListItem,
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: {
      class: 'text-blue-500 underline',
    },
  }),
]

interface TextEditorProps {
  content?: string;
  onContentChange: (content: string) => void;
}

const TextEditor = ({ content, onContentChange }: TextEditorProps) => {
  const [useMarkdown, setUseMarkdown] = React.useState(true);

  const editor = useEditor({
    extensions: extensions,
    content: content || "",
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      let description;
      if (useMarkdown) {
        description = CustomMarkdownSerializer.serialize(editor.state.doc);
      } else {
        const content = editor.getHTML();
        description = DOMPurify.sanitize(content);
      }

      onContentChange(description);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, onContentChange, useMarkdown]);

  return (
    <div className="border rounded-md space-y-4">
      <Toolbar editor={editor} useMarkdown={useMarkdown} setUseMarkdown={setUseMarkdown} />
      <EditorContent
        className="flex flex-col h-full overflow-y-auto max-w-none mb-4 p-4 min-h-[200px] max-h-[400px] "
        editor={editor}
      />
    </div>
  )
}

export default TextEditor