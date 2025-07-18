import React, { createContext, useContext, useState } from 'react';
import { Editor } from '@tiptap/react';
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import CustomTableTab from '../extensions/custom-tab-table';
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Blockquote from '@tiptap/extension-blockquote';

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
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: 'border-collapse border border-gray-300 w-full',
    },
  }),
  TableRow.configure({
    HTMLAttributes: {
      class: 'border border-gray-300 relative',
    },
  }),
  TableHeader.configure({
    HTMLAttributes: {
      class: 'border border-gray-300 bg-gray-100 text-left p-2',
    },
  }),
  TableCell.configure({
    HTMLAttributes: {
      class: 'border border-gray-300 p-2 relative',
    },
  }),
  CustomTableTab,
  Blockquote,
]

interface DescriptionContextProps {
  editor: Editor | null;
  content: string;
  useMarkdown: boolean;
  setUseMarkdown: (value: boolean) => void;
  isSecondaryToolbarVisible: boolean;
  setSecondaryToolbarVisible: (value: boolean) => void;
}

const DescriptionContext = createContext<DescriptionContextProps | undefined>(undefined);

export const DescriptionProvider = ({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) => {
  const [useMarkdown, setUseMarkdown] = useState(true);
  const [isSecondaryToolbarVisible, setSecondaryToolbarVisible] = useState(false);
  const editor = useEditor({
    extensions: extensions,
    content: content,
    immediatelyRender: false,
  })

  return (
    <DescriptionContext.Provider value={{
      editor,
      content,
      useMarkdown,
      setUseMarkdown,
      isSecondaryToolbarVisible,
      setSecondaryToolbarVisible,
    }}>
      {children}
    </DescriptionContext.Provider>
  );
};

export const useDescriptionContext = () => {
  const context = useContext(DescriptionContext);
  if (!context) {
    throw new Error('useDescriptionContext must be used within a DescriptionProvider');
  }
  return context;
};