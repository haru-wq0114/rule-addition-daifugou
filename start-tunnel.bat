@echo off
chcp 65001 >nul
setlocal

set CLOUDFLARED=cloudflared.exe

:: cloudflaredが存在しなければダウンロード
if not exist "%CLOUDFLARED%" (
    echo [1/2] cloudflared をダウンロード中...
    curl -L -o "%CLOUDFLARED%" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    if errorlevel 1 (
        echo ダウンロードに失敗しました。手動でダウンロードしてください:
        echo https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
        pause
        exit /b 1
    )
    echo ダウンロード完了!
)

echo.
echo [2/2] Cloudflare Tunnel を起動中...
echo     ※ 表示されるURLをスマホでアクセスしてください
echo     ※ 先にサーバーを起動しておいてください (npm run dev)
echo.

"%CLOUDFLARED%" tunnel --url http://localhost:3000
