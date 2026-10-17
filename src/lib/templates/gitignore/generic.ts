/** Conservative fallback when no supported manifest is present. */
export const GENERIC_GITIGNORE = `# Operating system files
.DS_Store
Thumbs.db

# Logs and temporary files
*.log
*.tmp
*.swp

# Local environment files
.env
.env.*
!.env.example
`;
