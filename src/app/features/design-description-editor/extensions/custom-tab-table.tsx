import { Extension } from '@tiptap/core'
import { TextSelection } from 'prosemirror-state'

const NODE_TYPES = [
  'table',
  'tableCell',
  'tableHeader',
  'tableRow',
];

const CustomTableTab = Extension.create({
  name: 'customTableTab',

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
      
        // Check if inside a table
        const table = $from.node(-1);
        if (!table || !NODE_TYPES.includes(table.type.name)) {
          return false;
        }
      
        // Get the table node and position
        const tableNode = $from.node(-3);
        const tablePos = $from.before($from.depth - 3);
      
        // Find the last row in the table
        const lastRowIndex = tableNode.childCount - 1; // Index of the last row
        const lastRow = tableNode.child(lastRowIndex);
      
        // Find the last cell in the last row
        const lastCellIndex = lastRow.childCount - 1; // Index of the last cell
      
        // Calculate the position of the last cell
        let lastCellPos = tablePos + 1; // Start of the table content
        for (let i = 0; i < lastRowIndex; i++) {
          lastCellPos += tableNode.child(i).nodeSize; // Add the size of each row before the last row
        }
        for (let i = 0; i < lastCellIndex; i++) {
          lastCellPos += lastRow.child(i).nodeSize; // Add the size of each cell before the last cell
        }
      
        if ($from.pos < lastCellPos) {
          return false; // Not in last cell, keep default behavior
        }
      
        // Get the position immediately after the table
        const afterTablePos = tablePos + tableNode.nodeSize;
      
        // Check if there is already content beneath the table
        const nextNode = state.doc.nodeAt(afterTablePos);
      
        if (nextNode) {
          // Set the selection to the start of the next node
          editor.commands.setTextSelection(afterTablePos);
        } else {
          // Insert a paragraph after the table and move cursor there
          editor
            .chain()
            .focus()
            .insertContentAt(afterTablePos, {
              type: 'paragraph',
            })
            .command(({ tr, dispatch }) => {
              if (dispatch) {
                const newParagraphPos = afterTablePos + 1;
                tr.setSelection(TextSelection.create(tr.doc, newParagraphPos));
                dispatch(tr);
              }
              return true;
            })
            .run();
        }
      
        return true;
      },
    };
  },
});

export default CustomTableTab;
