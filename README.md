# Docwriter MCP Server 📄✍️

[![TypeScript](https://img.shields.io/badge/TypeScript-^5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol SDK](https://img.shields.io/badge/MCP%20SDK-^1.13.0-green.svg)](https://github.com/modelcontextprotocol/typescript-sdk)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-Active-green.svg)](https://github.com/cyanheads/docwriter-mcp-server/issues)
[![GitHub](https://img.shields.io/github/stars/cyanheads/docwriter-mcp-server?style=social)](https://github.com/cyanheads/docwriter-mcp-server)

**A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for programmatic creation, modification, and compilation of structured LaTeX documents.**

This server provides a suite of tools for an AI agent or other MCP client to manage the lifecycle of a document on the local filesystem, from bootstrapping from a template to applying fine-grained updates and compiling the final PDF output.

## 📋 Table of Contents

- [✨ Key Features](#-key-features)
- [🏁 Quick Start](#-quick-start)
- [⚙️ Configuration](#️-configuration)
- [🏗️ Project Structure](#️-project-structure)
- [🧩 Tool Specifications](#-tool-specifications)
- [📜 License](#-license)

## ✨ Key Features

| Feature Area | Description |
| :--- | :--- |
| **📄 Document Creation** | Bootstrap new `.tex` documents from predefined templates (`simple_report`, `ieee_article`). |
| **📝 Block-Based Updates** | Safely update structured content within named blocks (e.g., `abstract`, `introduction`). |
| **⚙️ Advanced Patching** | Apply fine-grained changes using standard `diff` patches for precise control. |
| **🔄 PDF Compilation** | Compile `.tex` files into PDFs, with multi-pass support for resolving cross-references. |
| **🔐 Security** | Includes input sanitization to mitigate LaTeX injection vulnerabilities. |
| **📂 Filesystem Backend** | Stores and manages all documents and compiled outputs on the local filesystem. |

## 🏁 Quick Start

### 📦 Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/cyanheads/docwriter-mcp-server.git
    cd docwriter-mcp-server
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Install LaTeX:**
    This server requires a working LaTeX distribution (like TeX Live, MiKTeX) to be installed on the system where the server runs. The `pdflatex` command must be available in the system's PATH.

4.  **Build the project:**
    ```bash
    npm run build
    ```

### 🚀 Usage

-   **Via Stdio (Default):**
    ```bash
    npm start
    ```
-   **Via Streamable HTTP:**
    ```bash
    npm run start:http
    ```

This starts a **Streamable HTTP** server (default: `http://127.0.0.1:3010`) which uses Server-Sent Events for the server-to-client streaming component.

## ⚙️ Configuration

Configure the server's behavior using these environment variables. You can create a `.env` file in the project root to manage them.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DOCWRITER_DATA_PATH` | **Required.** The root directory for storing `.tex` files and compiled PDFs. | `./data` |
| `MCP_TRANSPORT_TYPE` | Server transport: `stdio` or `http`. | `stdio` |
| `MCP_HTTP_PORT` | Port for the HTTP server. | `3010` |
| `MCP_LOG_LEVEL` | Server logging level (`debug`, `info`, `warning`, `error`). | `debug` |
| `MCP_AUTH_SECRET_KEY` | **Required for HTTP transport.** Secret key for signing/verifying auth tokens (JWT). | (none) |

## 🏗️ Project Structure

- **`src/`**: The heart of the application.
  - `src/config/`: Handles loading environment variables.
  - `src/mcp-server/`: Contains the MCP server implementation.
    - `src/mcp-server/tools/`: The core logic for each of the document-writing tools.
  - `src/utils/`: Core utilities for logging, error handling, and security.
  - `src/index.ts`: The main entry point for the application.
- **`templates/`**: Contains the LaTeX templates (`simple_report.tex`, `ieee_article.tex`).
- **`PROJECT-SPEC.md`**: The detailed project specification document.
- **`package.json`**: Defines project metadata, dependencies, and npm scripts.

## 🧩 Tool Specifications

This server exposes the following tools. For detailed schemas and logic, please refer to `PROJECT-SPEC.md`.

1.  **`docwriter_create_latex_document`**: Creates a new `.tex` file from a template.
2.  **`docwriter_update_document_block`**: Updates a named content block within a document.
3.  **`docwriter_apply_latex_diff`**: Applies a `diff` patch to a document for fine-grained changes.
4.  **`docwriter_compile_latex_to_pdf`**: Compiles a `.tex` file into a PDF.
5.  **`docwriter_list_latex_documents`**: Lists all available documents.

## 📜 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
Built with ❤️ and the <a href="https://modelcontextprotocol.io/">Model Context Protocol</a>
</div>
