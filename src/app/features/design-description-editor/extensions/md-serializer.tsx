import { defaultMarkdownSerializer, MarkdownSerializer } from "prosemirror-markdown";

const CustomMarkdownSerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    paragraph: defaultMarkdownSerializer.nodes.paragraph,
    heading: defaultMarkdownSerializer.nodes.heading,
    blockquote: defaultMarkdownSerializer.nodes.blockquote,
    codeBlock: defaultMarkdownSerializer.nodes.code_block,
    horizontalRule: (state) => state.write('\n\n---\n\n'),
    hardBreak: defaultMarkdownSerializer.nodes.hard_break,
    bulletList: defaultMarkdownSerializer.nodes.bullet_list,
    orderedList: defaultMarkdownSerializer.nodes.ordered_list,
    listItem: defaultMarkdownSerializer.nodes.list_item,
    table: (state, node) => {
      state.write('\n');
      node.forEach((row, _offset, i) => {
                state.render(row, node, i);
                state.write('\n');
              });
      state.write('\n');
    },
    tableRow: (state, node) => {
      node.forEach((cell, _offset, i) => {
                state.write('| ');
                state.render(cell, node, i);
                state.write(' ');
              });
      state.write('|');
    },
    tableCell: (state, node) => {
      state.renderInline(node);
    },
    tableHeader: (state, node) => {
      state.renderInline(node);
    },
  },
  {
    ...defaultMarkdownSerializer.marks,
    bold: {
      open: '**',
      close: '**',
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    underline: {
      open: '<u>',
      close: '</u>',
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    strike: {
      open: '~~',
      close: '~~',
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    italic: {
      open: '*',
      close: '*',
      mixable: true,
      expelEnclosingWhitespace: true,
    },
  }
);

export default CustomMarkdownSerializer;