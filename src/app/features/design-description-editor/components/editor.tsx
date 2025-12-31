import { EditorContent } from '@tiptap/react'
import React, { useEffect } from 'react'
import Toolbar from './toolbar';
import DOMPurify from 'dompurify';
import CustomMarkdownSerializer from '@/src/app/features/design-description-editor/extensions/md-serializer';
import { useFormContext } from 'react-hook-form';
import { useDescriptionContext } from '../context/description-context';

const TextEditor = () => {
  const { setValue } = useFormContext();
  const { editor, useMarkdown } = useDescriptionContext();

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

      setValue("description", description);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, useMarkdown, setValue]);

  return (
    <div className="border rounded-md space-y-4">
      <Toolbar />
      <EditorContent
        className="flex flex-col h-full overflow-y-auto max-w-none mb-4 p-4 min-h-[200px] max-h-[400px] "
        editor={editor}
      />
    </div>
  )
}

export default TextEditor