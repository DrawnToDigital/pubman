import { AlignJustifyIcon, List, ListOrderedIcon, ListPlusIcon } from "lucide-react";
import { Editor } from "@tiptap/react";
import ControlButton from "./control-button";
import LinkControl from "./link-control";
import HeaderControl from "./header-control";
import ContentControl from "./content-control";
import DropdownToolbar from "./dropdown-toolbar";
import { useDescriptionContext } from './description-context';

const simpleControls = [
  {
    name: "bold",
    icon: <strong>B</strong>,
    label: "Bold",
    command: (editor: Editor) => editor.chain().focus().toggleBold().run(),
    canExecute: (editor: Editor) => editor.can().chain().focus().toggleBold().run(),
    isActive: (editor: Editor) => editor.isActive("bold"),
    className: "hover:rounded-tl-md",
  },
  {
    name: "italic",
    icon: <em>I</em>,
    label: "Italic",
    command: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
    canExecute: (editor: Editor) => editor.can().chain().focus().toggleItalic().run(),
    isActive: (editor: Editor) => editor.isActive("italic"),
  },
  {
    name: "underline",
    icon: <u>U</u>,
    label: "Underline",
    command: (editor: Editor) => editor.chain().focus().toggleUnderline().run(),
    canExecute: (editor: Editor) => editor.can().chain().focus().toggleUnderline().run(),
    isActive: (editor: Editor) => editor.isActive("underline"),
  },
  {
    name: "strike",
    icon: <del>S</del>,
    label: "Strikethrough",
    command: (editor: Editor) => editor.chain().focus().toggleStrike().run(),
    canExecute: (editor: Editor) => editor.can().chain().focus().toggleStrike().run(),
    isActive: (editor: Editor) => editor.isActive("strike"),
  },
  {
    name: "bulletList",
    icon: <List size={16} />,
    label: "Bullet List",
    command: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
    canExecute: (editor: Editor) => editor.can().chain().focus().toggleBulletList().run(),
    isActive: (editor: Editor) => editor.isActive("bulletList"),
  },
  {
    name: "orderedList",
    icon: <ListOrderedIcon size={16} />,
    label: "Ordered List",
    command: (editor: Editor) => editor.chain().focus().toggleOrderedList().run(),
    canExecute: (editor: Editor) => editor.can().chain().focus().toggleOrderedList().run(),
    isActive: (editor: Editor) => editor.isActive("orderedList"),
  },
  {
    name: "hardBreak",
    icon: <ListPlusIcon size={16} />,
    label: "Paragraph Break",
    command: (editor: Editor) => editor.chain().focus().setHardBreak().run(),
    canExecute: (editor: Editor) => editor.can().chain().focus().setHardBreak().run(),
    isActive: (editor: Editor) => editor.isActive("hardBreak"),
  },
  {
    name: "horizontalRule",
    icon: <AlignJustifyIcon size={16} />,
    label: "Line Break",
    command: (editor: Editor) => editor.chain().focus().setHorizontalRule().run(),
    canExecute: (editor: Editor) => editor.can().chain().focus().setHorizontalRule().run(),
    isActive: (editor: Editor) => editor.isActive("horizontalRule"),
  },
];

export default function Toolbar() {
  const { editor } = useDescriptionContext();
  if (!editor) return null;

  return (
    <div className="flex w-full gap-1 mb-2 border-b sticky rounded-t-md top-0 bg-white z-10">
      {simpleControls.map((control) => (
        <ControlButton
          key={control.name}
          label={control.label}
          icon={control.icon}
          command={() => control.command(editor)}
          canExecute={() => control.canExecute(editor)}
          isActive={() => control.isActive(editor)}
          className={control.className}
        />
      ))}
      <ContentControl />
      <HeaderControl />
      <LinkControl />
      <DropdownToolbar />
    </div>
  );
}