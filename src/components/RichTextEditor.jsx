import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Heading,
  Link,
  List,
  BlockQuote,
  Indent,
  Table,
  TableToolbar,
  Undo,
} from "ckeditor5";

import "ckeditor5/ckeditor5.css";


export default function RichTextEditor({ value, onChange, placeholder }) {
  return (
    <div className="rich-text-editor">
      <CKEditor
        editor={ClassicEditor}
        data={value || ""}
        config={{
          licenseKey: "GPL",
          plugins: [
            Essentials,
            Paragraph,
            Bold,
            Italic,
            Underline,
            Heading,
            Link,
            List,
            BlockQuote,
            Indent,
            Table,
            TableToolbar,
            Undo,
          ],
          toolbar: [
            "undo",
            "redo",
            "|",
            "heading",
            "|",
            "bold",
            "italic",
            "underline",
            "|",
            "bulletedList",
            "numberedList",
            "|",
            "link",
            "blockQuote",
            "insertTable",
            "|",
            "outdent",
            "indent",
          ],
          table: {
            contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
          },
          placeholder: placeholder || "",
        }}
        onChange={(event, editor) => {
          onChange?.(editor.getData());
        }}
      />
    </div>
  );
}
