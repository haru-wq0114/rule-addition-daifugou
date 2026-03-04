@echo off
chcp 65001 >nul
setlocal

set CLOUDFLARED=cloudflared.exe

:: cloudflaredが存在しなければダウンロード
if not exist "%CLOUDFLARED%" (
    echo [1/3] cloudflared をダウンロード中...
    curl -L -o "%CLOUDFLARED%" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    if errorlevel 1 (
        echo ダウンロードに失敗しました。
        pause
        exit /b 1
    )
    echo ダウンロード完了!
)

echo.
echo ========================================
echo   ルール追加大富豪 - 公開サーバー起動
echo ========================================
echo.
echo [2/3] ゲームサーバーを起動中...

:: サーバーをバックグラウンドで起動
start "GameServer" /min cmd /c "npx ts-node -r tsconfig-paths/register --project tsconfig.server.json server.ts"

:: サーバー起動を少し待つ
echo     サーバーの起動を待機中...
timeout /t 8 /nobreak >nul

echo [3/3] Cloudflare Tunnel を起動中...
echo.
echo ※※※ 下に表示される https://xxxxx.trycloudflare.com のURLを共有してください ※※※
echo ※※※ このウィンドウを閉じるとサーバーが停止します                         ※※※
echo.

"%CLOUDFLARED%" tunnel --url http://localhost:3000
