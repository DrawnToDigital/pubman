import { Editor } from "@tiptap/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/app/components/ui/dropdown-menu"
import { Button } from '../ui/button'


interface ContentControlProps {
  editor: Editor;
  useMarkdown: boolean;
  setUseMarkdown: (useMarkdown: boolean) => void;
}

export default function ContentControl({
  editor,
  useMarkdown,
  setUseMarkdown
}: ContentControlProps) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className='text-black w-10 aspect-square border-none rounded-none hover:bg-gray-400 bg-transparent'>
            {useMarkdown ? 'MD' : 'HTML'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => setUseMarkdown(true)}
            className={editor.isActive('paragraph') ? 'bg-gray-200' : ''}
          >
            Markdown
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setUseMarkdown(false)}
            className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
          >
            HTML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
}