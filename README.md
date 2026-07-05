# Shopify Label Parser

This app helps you upload PDF shipping labels or Shopify packing slips, extract the shipping address, preview it in a printable layout, and export it to a Word document.

## What it does

- Upload one or more PDF files
- Extract the shipping address from the document text
- Show a live preview of each label
- Adjust size, position, and spacing for better print alignment
- Export the formatted labels to a Word document

## How to use it

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the app:
   ```bash
   npm run dev
   ```

3. Open the local URL shown in the terminal.

4. Drag and drop a PDF file into the upload area, or click to browse for a file.

5. Review the extracted address in the preview pane.

6. Use the preview controls to:
   - adjust the scale of labels
   - move labels globally or individually
   - change line spacing for better readability

7. Export the final result as a Word document when you are satisfied with the layout.

## Where to get Shopify packing slips

If you are using Shopify, you can generate packing slips from the Shopify admin:

- Go to Orders
- Open the order you want
- Choose Print packing slip
- If needed, print to PDF from your browser so you can upload the file here

You can also generate packing slips from the fulfillment screen for fulfilled orders, depending on your workflow.

## Development

Run the tests:
```bash
npm test
```

Build for production:
```bash
npm run build
```

