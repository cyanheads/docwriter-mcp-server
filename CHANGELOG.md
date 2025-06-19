# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2025-06-19

### Changed

- **Tool Descriptions**: Updated all tool descriptions and parameter descriptions to be more descriptive and provide clearer guidance on their usage and expectations.
- **LaTeX Templates**: Significantly enhanced all LaTeX templates (`simple_report`, `ieee_article`, `research_report`) with better structure, more packages (like `biblatex`), and more detailed placeholder content.
- **Compilation Logic**: Improved the `compileLatexToPdf` tool to automatically detect and process bibliographies using Biber, making it more robust for academic and research documents.
- **Dockerfile**: Updated the Dockerfile to include a multi-stage build that installs a TeX Live distribution, ensuring the environment is capable of compiling the LaTeX documents.

## [1.0.2] - 2025-06-18

### Changed

- **Documentation**: Significantly updated `README.md` with a more comprehensive overview, feature list, and setup instructions.
- **Developer Guidance**: Enhanced `.clinerules` to provide more detailed architectural principles, tool specifications, and security mandates for developers.
- **Code Quality**: Refactored tool logic and registration to improve logging, error handling, and consistency with the architectural standards.
- **Project Specification**: Updated `PROJECT-SPEC.md` to align with the latest tool implementations.

## [1.0.1] - 2025-06-18

### Added

- **New Template**: Added `research_report.tex` template for comprehensive research papers.
- **New Tools**:
  - `docwriter_search_replace`: A tool for simple, global text replacements in documents.
  - `docwriter_update_document_block`: A tool for structured updates of named content blocks.
  - `docwriter_compile_latex_to_pdf`: A tool to compile `.tex` files into PDFs.
  - `docwriter_list_latex_documents`: A tool to list all available documents.

### Changed

- **Dependencies**: Updated dependencies, including adding `diff-match-patch`.
- **Tool Refinements**: Refined the `createLatexDocument` tool to support the new `research_report` template and use a `filename` parameter instead of `documentId`.

### Removed

- **Legacy Tools**: Removed the `catFactFetcher` and `echoTool` as they are no longer relevant to the project's scope.
- **Unused Dependency**: Removed `sanitize-latex` in favor of a more robust internal sanitization utility.

## [1.0.0] - 2025-06-18

### Added

- **Core Functionality**: Introduced the `docwriter-mcp-server`, a server for managing and generating LaTeX documents using the Model Context Protocol (MCP). Setup structure from `mcp-ts-template`.
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
