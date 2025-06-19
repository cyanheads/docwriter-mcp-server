# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-06-18

### Added

- **Core Functionality**: Introduced a suite of tools for programmatic LaTeX document generation:
  - `docwriter_create_latex_document`: Creates a new `.tex` file from a template (`simple_report` or `ieee_article`).
  - `docwriter_update_document_block`: Updates a named content block within a document.
  - `docwriter_apply_latex_diff`: Applies a `diff` patch to a document for fine-grained changes.
  - `docwriter_compile_latex_to_pdf`: Compiles a `.tex` file into a PDF.
  - `docwriter_list_latex_documents`: Lists all available documents.
- **Templates**: Added `simple_report.tex` and `ieee_article.tex` templates with predefined content blocks.
- **Configuration**: Added `DOCWRITER_DATA_PATH` environment variable to specify the root directory for documents.
- **Documentation**: Added `PROJECT-SPEC.md` detailing the server's architecture and tool specifications.

### Changed

- **Project Renaming**: The project has been rebranded from `mcp-ts-template` to `docwriter-mcp-server` to reflect its new purpose.
- **Dependencies**: Updated all dependencies to their latest versions, including `@modelcontextprotocol/sdk` to `^1.13.0`.
- **README**: Completely rewrote `README.md` to describe the new functionality of the `docwriter-mcp-server`.

### Removed

- **MCP Client**: Removed the entire MCP client implementation (`src/mcp-client/`).
- **Services**: Removed all previous services, including DuckDB, OpenRouter, and Supabase integrations.
- **Example Tools**: Removed the `echoTool`, `catFactFetcher`, and `imageTest` tools.
