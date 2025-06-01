import { Editor } from "@tiptap/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/app/components/ui/dropdown-menu"
import { Button } from '../ui/button'


interface HeaderControlProps {
  editor: Editor;
}

export function HeaderControl({ editor }: HeaderControlProps) {
    return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className='text-black w-10 aspect-square border-none rounded-none hover:bg-gray-400 bg-transparent'>
              {editor.isActive('heading', { level: 1 })
              ? 'H1'
              : editor.isActive('heading', { level: 2 })
              ? 'H2'
              : editor.isActive('heading', { level: 3 })
              ? 'H3'
              : 'Text'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={editor.isActive('paragraph') ? 'bg-gray-200' : ''}
            >
              Text
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
            >
              H1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
            >
              H2
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}
            >
              H3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    )
}