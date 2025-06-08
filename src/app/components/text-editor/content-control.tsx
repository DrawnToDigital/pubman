import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/app/components/ui/dropdown-menu"
import { Button } from '../ui/button'
import { useDescriptionContext } from './description-context';

export default function ContentControl() {
  const { useMarkdown, setUseMarkdown } = useDescriptionContext();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className='text-black w-10 aspect-square border-none rounded-none hover:bg-gray-400 bg-transparent'>
            {useMarkdown ? 'md' : 'HTML'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => setUseMarkdown(true)}
            className={useMarkdown ? 'bg-gray-200' : ''}
          >
            Markdown
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setUseMarkdown(false)}
            className={!useMarkdown ? 'bg-gray-200' : ''}
          >
            HTML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
}