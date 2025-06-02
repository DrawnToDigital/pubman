import { Button } from '@/src/app/components/ui/button';
import { useDescriptionContext } from './description-context';

export default function TableControl() {
    const { editor } = useDescriptionContext();
    if (!editor) return null;

    return (
        <div className="grid grid-cols-4 gap-2">
            <Button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                Insert Table
            </Button>
            <Button onClick={() => editor.chain().focus().addColumnBefore().run()}>
                Add Column Before
            </Button>
            <Button onClick={() => editor.chain().focus().addColumnAfter().run()}>
                Add Column After
            </Button>
            <Button onClick={() => editor.chain().focus().deleteColumn().run()}>
                Delete Column
            </Button>
            <Button onClick={() => editor.chain().focus().addRowBefore().run()}>
                Add Row Before
            </Button>
            <Button onClick={() => editor.chain().focus().addRowAfter().run()}>
                Add Row After
            </Button>
            <Button onClick={() => editor.chain().focus().deleteRow().run()}>
                Delete Row
            </Button>
            <Button onClick={() => editor.chain().focus().deleteTable().run()}>
                Delete Table
            </Button>
        </div>
    );
}