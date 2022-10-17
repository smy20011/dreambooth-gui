# Dreambooth Gui

Provides a easy-to-use gui for users to train Dreambooth with custom images. This
Gui supports any NVIDIA card with >10GB vram.

## Highlights

1. Automatically decide training params that fit your available varm.
2. Easy to use Gui for you to select images.
3. Support prior preservation training with class images.
4. Automatically cache models.

## Install (Windows)

1. Download and install docker from https://www.docker.com/
2. Setup WSL2 for windows. https://learn.microsoft.com/en-us/windows/wsl/install
3. If you find 'WSL 2 installation is incomplete' when starting docker, you can follow this video to fix it. https://www.youtube.com/watch?v=Ffzud5xLH4c
4. [Download](https://github.com/smy20011/dreambooth-gui/releases/download/v0.1.1/dreambooth-gui_0.1.1_x64_en-US.msi) and install dreambooth-gui_*_x64_en-US.msi
 from [release page](https://github.com/smy20011/dreambooth-gui/releases/).
5. Run the dreambooth-gui as administrator.

## Install (Linux)

1. Download and install docker from https://www.docker.com/
2. Download AppImage from [release page](https://github.com/smy20011/dreambooth-gui/releases/).
3. Run `chmod +x dreambooth-gui_*amd64.AppImage`
4. Run `sudo dreambooth-gui_*amd64.AppImage`