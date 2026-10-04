# Security

Iris Notch talks to an agent that may have access to a terminal, files and e-mail. Please report security problems **privately** through GitHub's "Report a vulnerability" (Security tab), not in public issues.

Design choices worth knowing:

- Keys live in the Windows Credential Manager and are never returned to the web UI.
- From the island only **once** and **deny** can be sent as approvals.
- The update check only reads `releases/latest` from GitHub. The app never downloads or runs code on its own.
- The local voice (Piper) runs as a child process that talks to the app through its standard input and output: it opens no network port.
- Custom animations in `%APPDATA%\Iris Notch\animazioni` are plain JSON descriptions read by a small interpreter: they can move the eyes and draw shapes, and cannot run code.

See also [PRIVACY.md](PRIVACY.md).
