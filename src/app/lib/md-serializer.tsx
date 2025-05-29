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