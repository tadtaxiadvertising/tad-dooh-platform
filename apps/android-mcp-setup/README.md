# Setup MCP Android Studio — OpenRouter Free

## Archivos preparados
- `openrouter-mcp.json` → config del plugin MCP para Android Studio
- `system-prompt.md` → prompt inicial para la sesión MCP

## Pasos

1. Android Studio → Settings → Tools → AI Assistants → MCP Servers
2. Pegar contenido de `openrouter-mcp.json`
3. Conectar; si pide confirmación, aceptar
4. Abrir el panel MCP y pegar el contenido de `system-prompt.md` como primer mensaje

## Notas
- El servidor corre via `npx @physics91/openrouter-mcp start`
- Si el plugin no encuentra `cmd`, reemplazar `cmd` por la ruta completa: `C:\Windows\System32\cmd.exe`
- Modelo gratuito por defecto: `google/gemma-4-26b-a4b-it:free`

## Conexión desde herramientas externas (Opcional)
Hermes / otros agentes pueden delegar tareas al IDE por este MCP únicamente si el IDE expone la sesión.
El IDE es el cliente; Hermes no se conecta *a* este MCP.
