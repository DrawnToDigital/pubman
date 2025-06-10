import React, { useState } from 'react';
import { QuoteIcon, ChevronDownIcon } from 'lucide-react';
import ControlButton from './control-button';
import TableControl from './table-control';
import { useDescriptionContext } from './description-context';
import { Editor } from '@tiptap/react';

const secondaryControls = [
    {
    name: "blockquote",
    icon: <QuoteIcon size={16} />,
    label: "Block quote",
    command: (editor: Editor) => editor.chain().focus().toggleBlockquote().run(),
    canExecute: (editor: Editor) => editor.can().chain().focus().toggleBlockquote().run(),
    isActive: (editor: Editor) => editor.isActive("blockquote"),
    },
    // {
    //     name: 'image',
    //     label: 'Insert Image',
    //     icon: <ImageIcon size={16} />,
    //     command: () => console.log('Insert Image'),
    // },
];

export default function DropdownToolbar() {
    const [isSecondaryToolbarVisible, setSecondaryToolbarVisible] = useState(false);
    const { editor } = useDescriptionContext();
    if (!editor) return null;
    
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