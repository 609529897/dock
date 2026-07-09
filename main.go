package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:            "开发码头",
		Width:            1100,
		Height:           720,
		MinWidth:         850,
		MinHeight:        500,
		BackgroundColour: &options.RGBA{R: 26, G: 26, B: 26, A: 255},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
    OnStartup:  app.Startup,
    OnShutdown: app.Shutdown,
    DragAndDrop: &options.DragAndDrop{
      EnableFileDrop: true,
    },
    Mac: &mac.Options{
			TitleBar:             mac.TitleBarHiddenInset(),
			WebviewIsTransparent: true,
			Appearance:           mac.NSAppearanceNameDarkAqua,
		},
		Bind: []interface{}{
			app,
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
