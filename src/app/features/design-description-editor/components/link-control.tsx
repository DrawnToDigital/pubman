import { useState } from "react";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { Dialog, DialogTrigger, DialogTitle, DialogContent, DialogDescription } from "@radix-ui/react-dialog";
import { DialogHeader } from "@/src/app/components/ui/dialog";
import { LinkIcon } from "lucide-react";
import ControlButton from "@/src/app/features/design-description-editor/components/control-button";
import log from "electron-log/renderer";
import { useDescriptionContext } from '@/src/app/features/design-description-editor/context/description-context';

const sanitizeUrl = (url: string) => {
    if (!url) return '';
    try {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        const parsedUrl = new URL(url);
        return parsedUrl.href;
    } catch (e) {
        log.error("Invalid URL for Design Description:", url, e);
        return '';
    }
}

export default function LinkControl() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [linkUrl, setLinkUrl] = useState('')
    const [linkText, setLinkText] = useState('')
    const [needText, setNeedText] = useState(false)
    const { editor } = useDescriptionContext();
    if (!editor) return null;

    const openLinkDialog = () => {
        if (!editor) return
        
        editor.chain().focus().extendMarkRange('link').run()
        const previousUrl = editor.getAttributes('link').href || ''
        setLinkUrl(previousUrl)
        const { empty } = editor.state.selection;
        setNeedText(empty ? true : false)
        setIsDialogOpen(true)
    }

    const applyLink = () => {
        if (!editor) return

        const sanitizedUrl = sanitizeUrl(linkUrl);

        if (sanitizedUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
        } else {
            if (needText && linkText) {
                // Insert the linkText and set the link if needText is true
                editor.chain().focus()
                    .insertContent({
                        type: 'text',
                        text: linkText,
                        marks: [
                        {
                            type: 'link',
                            attrs: {
                            href: sanitizedUrl,
                            },
                        },
                        ],
                    })
                    .run();
            } else {
                // Just set the link on the selected text
                editor.chain().focus().extendMarkRange('link').setLink({ href: sanitizedUrl }).run();
            }
        }

        setIsDialogOpen(false)
        setLinkUrl('')
        setLinkText('')
    }

    return (
        <div className="relative flex items-center">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <ControlButton
                        label="Add Link"
                        icon={<LinkIcon size={16} />}
                        command={() => openLinkDialog()}
                        canExecute={() => editor.can().chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()}
                        isActive={() => isDialogOpen || editor.isActive('link')}
                    />
                </DialogTrigger>
                <DialogContent
                    className="absolute top-full mt-2 left-0 w-64 bg-white shadow-lg rounded-md p-4 z-50"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            applyLink();
                        }
                    }}>
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Add Link</DialogTitle>
                        <DialogDescription>Enter a valid URL.</DialogDescription>
                    </DialogHeader>
                    {needText && <Input
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                        placeholder="Link text..."
                    />}
                    <Input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={applyLink}>Apply</Button>
                    </div>
                </DialogContent>
            </Dialog>
    </div>
    )
}