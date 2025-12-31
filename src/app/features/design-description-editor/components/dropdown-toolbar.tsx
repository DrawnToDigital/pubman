import React from 'react';
import { QuoteIcon, ChevronDownIcon } from 'lucide-react';
import ControlButton from './control-button';
import TableControl from './table-control';
import { useDescriptionContext } from '../context/description-context';
import { Editor } from '@tiptap/react';

export default function DropdownToolbar() {
    const { editor, isSecondaryToolbarVisible, setSecondaryToolbarVisible } = useDescriptionContext();
    if (!editor) return null;

    const secondaryControls = [
        {
        name: "blockquote",
        icon: <QuoteIcon size={16} />,
        label: "Block quote",
        command: (editor: Editor) => {
            editor.chain().focus().toggleBlockquote().run()
            setSecondaryToolbarVisible(false);
        },
        canExecute: (editor: Editor) => editor.can().chain().focus().toggleBlockquote().run(),
        isActive: (editor: Editor) => editor.isActive("blockquote"),
        },
    ];
    
    return (
        <div className="relative">
            <ControlButton
                label="Toggle Toolbar"
                icon={<ChevronDownIcon size={16} />}
                command={() => setSecondaryToolbarVisible(!isSecondaryToolbarVisible)}
                canExecute={() => true}
                isActive={() => isSecondaryToolbarVisible}
                className={"rounded-tr-md"}
            />
            {isSecondaryToolbarVisible && (
                <div className="absolute top-full left-0 flex gap-2 bg-white shadow-md border rounded-md p-2 z-10">
                    <TableControl />
                    {secondaryControls.map((control) => (
                        <ControlButton
                            key={control.name}
                            label={control.label}
                            icon={control.icon}
                            command={() => control.command(editor)}
                            canExecute={() => control.canExecute(editor)}
                            isActive={() => control.isActive(editor)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}