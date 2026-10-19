@echo off
title DEFUSE.GG 1-Click Installer
echo ===================================================
echo       DEFUSE.GG CS2 TRACKER AUTO-INSTALLER
echo ===================================================
echo.

set CONFIG_NAME=gamestate_integration_tracker.cfg
set CS2_CFG_PATH=C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg

if not exist "%CS2_CFG_PATH%" (
    echo [*] Default path not found. Searching Steam registry...
    for /f "tokens=2*" %%A in ('reg query "HKCU\Software\Valve\Steam" /v "SteamPath" 2^>nul') do set STEAM_PATH=%%B
    if defined STEAM_PATH (
        set CS2_CFG_PATH=%STEAM_PATH%/steamapps/common/Counter-Strike Global Offensive/game/csgo/cfg
    )
)

if exist "%CS2_CFG_PATH%" (
    echo [*] CS2 Config Directory Found at: "%CS2_CFG_PATH%"
    
    (
        echo "CS2 Global Stat Tracker Integration"
        echo {
        echo     "uri" "https://defusegg.vercel.app/api/upload-stats"
        echo     "timeout" "5.0"
        echo     "buffer"  "0.1"
        echo     "throttle" "2.0"
        echo     "heartbeat" "10.0"
        echo     "auth"
        echo     {
        echo         "token" "CS2_TRACKER_TOKEN_2026"
        echo     }
        echo     "data"
        echo     {
        echo         "provider"              "1"
        echo         "map"                   "1"
        echo         "round"                 "1"
        echo         "player_id"             "1"
        echo         "player_state"          "1"
        echo         "allplayers_id"         "1"
        echo         "allplayers_state"      "1"
        echo         "allplayers_match_stats" "1"
        echo     }
        echo }
    ) > "%CS2_CFG_PATH%\%CONFIG_NAME%"

    echo.
    echo [SUCCESS] CS2 Stat Tracker configuration installed!
    echo Launch CS2 and play a casual match. Your stats will sync automatically to defusegg.vercel.app.
) else (
    echo [ERROR] CS2 installation folder could not be located.
    echo Copy gamestate_integration_tracker.cfg manually into your csgo/cfg folder.
)

echo.
pause
