# Project Specification: docwriter-mcp-server

**Version:** 1.5 (Revised)
**Date:** June 18, 2025

## 1. Executive Summary

The `docwriter-mcp-server` is a Model Context Protocol (MCP) server designed for the programmatic creation, modification, and compilation of structured LaTeX documents. It will provide a suite of tools for an AI agent or other MCP client to manage the lifecycle of a document on the local filesystem, from bootstrapping from a template with pre-defined content blocks to applying fine-grained updates and compiling the final PDF output.

The core architectural principle is the separation of state (the document file) and operations (the tools). Each LaTeX document is treated as a `.tex` file on disk, while all actions that create or modify these documents are implemented as stateless Tools.

## 2. Core Concepts & Architecture

- **Documents as Files**: Each LaTeX document is a `.tex` file stored in a dedicated directory on the local filesystem. A unique filename serves as its identifier.
- **Actions as Tools**: All operations—create, update, compile—are exposed as distinct, stateless tools. These tools operate directly on the document files.
- **Local Filesystem Backend**: A local directory path, configured via an environment variable, will be used to store all `.tex` content and compiled outputs.
- **Server Environment**: The server runtime environment must have access to a LaTeX distribution (specifically `pdflatex`) to perform compilation. It will also require libraries for diffing and patching and any necessary LaTeX class files (e.g., `IEEEtran.cls`).
- **Configuration**: The server will be configured via environment variables. A required `DOCWRITER_DATA_PATH` variable will specify the root directory for all file operations, defaulting to `./data`.
- **Security Model**: The server operates in a single-user context. Authorization is managed by the filesystem permissions of the running server process. Input sanitization is critical (see Security section).

### 2.1. Advanced Template System with Content Blocks

The server uses a powerful template system that defines named, replaceable content blocks.

- **Location**: All LaTeX templates are stored as `.tex` files within a `/templates` directory located at the root of the server project.
- **Block Syntax**: A content block is defined by a pair of special LaTeX comments. The content between these markers is the block's default or placeholder content.
  - **Start Marker**: `%% -- BLOCK: block_name_goes_here -- %%`
  - **End Marker**: `%% -- ENDBLOCK: block_name_goes_here -- %%`
- **Available Templates**:
  - `simple_report.tex`:
    - Contains placeholders for `{{TITLE}}` and `{{AUTHOR}}`.
    - Defines content blocks: `abstract`, `introduction`, `conclusion`.
  - `ieee_article.tex`:
    - Contains placeholders for `{{TITLE}}` and `{{AUTHOR}}`.
    - Defines content blocks: `abstract`, `introduction`, `related_work`, `methodology`, `results`, `conclusion`.

## 3. Tool Specifications

### Tool 1: `docwriter_create_latex_document`

Bootstraps a new, structured document from a template.

- **Description**: Creates a new `.tex` file from a template, populating metadata placeholders. The full content of the template file, including all defined content blocks, is returned.
- **Input Schema (Zod)**:
  ```javascript
  z.object({
    title: z.string().describe("The main title for the document."),
    author: z.string().describe("The name of the primary author."),
    documentId: z
      .string()
      .optional()
      .describe(
        "An optional unique ID for the document. If not provided, a UUID will be generated.",
      ),
    template: z
      .enum(["simple_report", "ieee_article"])
      .default("simple_report")
      .describe(
        "The base template to use. The tool will return the full content of the template file, including all defined content blocks so you have a complete document structure.",
      ),
  });
  ```
- **Logic Flow**:
  1.  Generate a unique `documentId` (if not provided).
  2.  Load the specified template file.
  3.  Replace `{{TITLE}}` and `{{AUTHOR}}` placeholders.
  4.  Save the new content to a file at `{DOCWRITER_DATA_PATH}/{documentId}.tex`.
- **Success Output**:
  ```json
  {
    "status": "created",
    "documentId": "xyz-123-abc",
    "documentContent": "...the full .tex content of the newly created file..."
  }
  ```
- **Error Conditions**: `TEMPLATE_NOT_FOUND`, `FILE_SYSTEM_ERROR`, `DOCUMENT_ALREADY_EXISTS`.

### Tool 2: `docwriter_update_document_block`

Updates the content of a specific, named block within a document.

- **Description**: Replaces the entire content of a named block (e.g., 'abstract', 'introduction') within an existing document. This is the preferred method for structured updates.
- **Input Schema (Zod)**:
  ```javascript
  z.object({
    documentId: z.string().describe("The ID of the document to update."),
    blockName: z
      .string()
      .describe("The name of the block to update (e.g., 'abstract')."),
    content: z.string().describe("The new LaTeX content for the block."),
  });
  ```
- **Logic Flow**:
  1.  Read the document content from `{DOCWRITER_DATA_PATH}/{documentId}.tex`.
  2.  Use a regular expression to find the content between `%% -- BLOCK: {blockName} -- %%` and `%% -- ENDBLOCK: {blockName} -- %%`.
  3.  Sanitize the input `content` to prevent security vulnerabilities.
  4.  Replace the found content with the sanitized new content.
  5.  Save the updated full content back to the file.
- **Success Output**:
  ```json
  {
    "status": "updated",
    "documentId": "xyz-123-abc",
    "blockUpdated": "abstract"
  }
  ```
- **Error Conditions**: `DOCUMENT_NOT_FOUND`, `BLOCK_NOT_FOUND`, `INPUT_VALIDATION_FAILED`.

### Tool 3: `docwriter_apply_latex_diff`

Applies a structured patch to a document for advanced modifications.

- **Description**: Modifies a `.tex` file by applying a diff patch. This is suitable for complex, fine-grained changes that are not block-based.
- **Input Schema (Zod)**:
  ```javascript
  z.object({
    documentId: z.string().describe("The ID of the document to update."),
    diff: z
      .string()
      .describe(
        "A diff patch in the Unified Diff Format to apply to the document content.",
      ),
  });
  ```
- **Logic Flow**:
  1.  Read the document content from `{DOCWRITER_DATA_PATH}/{documentId}.tex`.
  2.  Use a library (e.g., `diff-match-patch`) to apply the provided diff patch.
  3.  If the patch applies cleanly, save the new content back to the file.
- **Success Output**:
  ```json
  {
    "status": "patched",
    "documentId": "xyz-123-abc"
  }
  ```
- **Error Conditions**: `DOCUMENT_NOT_FOUND`, `PATCH_FAILED`.

### Tool 4: `docwriter_compile_latex_to_pdf`

Compiles a LaTeX document and provides a path to the resulting PDF.

- **Description**: Compiles a `.tex` document into a PDF. This is a potentially long-running operation that handles complex documents requiring multiple passes.
- **Input Schema (Zod)**:
  ```javascript
  z.object({
    documentId: z.string().describe("The ID of the document to compile."),
  });
  ```
- **Logic Flow**:
  1.  Execute `pdflatex` within the data directory with a timeout.
  2.  Run the compilation process multiple times (e.g., 2-3 passes) to ensure all cross-references (ToC, citations, figures) are correctly resolved.
  3.  Capture the output logs (`.log` file) for debugging.
  4.  After a successful compilation, perform a cleanup to remove auxiliary files (`.aux`, `.toc`, etc.), retaining only the `.tex` and `.pdf`.
- **Success Output**:
  ```json
  {
    "status": "compiled",
    "pdfPath": "{DOCWRITER_DATA_PATH}/{documentId}.pdf",
    "log": "Compilation successful..."
  }
  ```
- **Error Conditions**: `DOCUMENT_NOT_FOUND`, `COMPILATION_FAILED`, `COMPILATION_TIMEOUT`.

### Tool 5: `docwriter_list_latex_documents`

Lists all documents in the data directory.

- **Description**: Retrieves a list of all `.tex` documents from the data directory.
- **Input Schema (Zod)**:
  ```javascript
  z.object({});
  ```
- **Logic Flow**:
  1.  Read the list of files from the `DOCWRITER_DATA_PATH` directory.
  2.  Filter the list to include only files ending in `.tex`.
  3.  Return the list of document IDs (filenames without the extension).
- **Success Output**:
  ```json
  {
    "documents": [
      "my-first-report",
      "ieee-article-on-mcp",
      "c4a1b2d3-e4f5-g6h7-i8j9-k0l1m2n3o4p5"
    ]
  }
  ```
- **Error Conditions**: `FILE_SYSTEM_ERROR`.

## 4. Security & Authorization

### 4.1. Filesystem Permissions

The server operates in a single-user mode. All filesystem operations are performed with the permissions of the user running the server process. It is assumed that the server process has the necessary read/write permissions for the directory specified by `DOCWRITER_DATA_PATH`. This model does not provide multi-user isolation.

### 4.2. Input Sanitization

**This is a critical security requirement.** All user-provided content must be sanitized to prevent LaTeX injection attacks. A malicious user could otherwise attempt to read arbitrary files from the server (e.g., `\input{/etc/passwd}`) or execute shell commands if `\write18` is enabled.

- **Implementation**: Before writing any user-provided content to a `.tex` file, it must be processed by a sanitization function. This function should be designed to neutralize or reject dangerous LaTeX commands.
- **Reference**: The existing sanitization utility at `src/utils/security/sanitization.ts` should be reviewed and extended to handle LaTeX-specific threats.

## 5. Implementation Notes & Dependencies

- **Framework**: `mcp-ts-template` (https://github.com/cyanheads/mcp-ts-template)
- **Configuration**: The server will require the `DOCWRITER_DATA_PATH` environment variable to be set. This can be managed via a `.env` file and a configuration loader.
- **LaTeX Compilation**: A wrapper around the `pdflatex` command-line tool. The `node-latex` package is a possible option, or direct execution via Node.js's `child_process`. The server environment (e.g., Docker container) must have a full TeX Live distribution installed.
- **Diffing**: `diff-match-patch` or a similar library for applying patches.
- **Filesystem**: All file operations will use Node.js's built-in `fs` module.

## 6. Future Enhancements

- **Advanced Templates**: Support for more complex document templates (e.g., CVs, presentations).
- **BibTeX Support**: A tool to upload a `.bib` file and associate it with a document for citation management.
