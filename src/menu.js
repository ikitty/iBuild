"use strict";

const Menu = remote.Menu;

var template = [
    {
        label: '文件',
        submenu: [
            {
                label: '关联项目',
                accelerator: 'CmdOrCtrl+O',
                click: function (item, focusedWindow) {
                    let projectPath = remote.dialog.showOpenDialog({ properties: [ 'openDirectory' ]});
                    if(projectPath && projectPath.length){
                        openProject(projectPath[0]);
                    }
                }
            },
            {
                label: '刷新',
                accelerator: 'CmdOrCtrl+R',
                click: function(item, focusedWindow) {
                    if (focusedWindow)
                        focusedWindow.reload();
                }
            }
        ]
    },
    {
        label: '编辑',
        submenu: [
            {
                label: '撤销',
                accelerator: 'CmdOrCtrl+Z',
                role: 'undo'
            },
            {
                label: '重做',
                accelerator: 'Shift+CmdOrCtrl+Z',
                role: 'redo'
            },
            {
                type: 'separator'
            },
            {
                label: '剪切',
                accelerator: 'CmdOrCtrl+X',
                role: 'cut'
            },
            {
                label: '复制',
                accelerator: 'CmdOrCtrl+C',
                role: 'copy'
            },
            {
                label: '粘贴',
                accelerator: 'CmdOrCtrl+V',
                role: 'paste'
            }
        ]
    },
    {
        label: '窗口',
        role: 'window',
        submenu: [
            {
                label: '最小化',
                accelerator: 'CmdOrCtrl+M',
                role: 'minimize'
            },
            {
                label: '调试模式',
                accelerator: 'Option+CmdOrCtrl+I',
                click: function () {
                    remote.getCurrentWindow().webContents.toggleDevTools();
                }
            }
        ]
    },
    {
        label: '帮助',
        role: 'help',
        submenu: [
            {
                label: 'About',
                click: function () {
                    showAbout();
                }
            }
        ]
    }
];

if (process.platform === 'darwin') {
    var name = remote.app.getName();
    template.unshift({
        label: name,
        submenu: [
            {
                label: 'About',
                click: function (item, focusedWindow) {
                    showAbout();
                }
            },
            {
                label: '偏好设置',
                accelerator: 'CmdOrCtrl+,',
                click: function () {
                    settingFn();
                }
            },
            {
                label: '检查更新…',
                accelerator: '',
                click: function () {
                    alert('coming soon...')
                    // checkForUpdate(true);
                }
            },
            {
                label: '退出',
                accelerator: 'Command+Q',
                click: function () {
                    stopWatch();
                    remote.app.quit();
                }
            }
        ]
    });
}else if(process.platform === 'win32'){
    let helpItem = template[template.length-1];
    
    helpItem.submenu.push({
        label: '检查更新',
        accelerator: '',
        click: function () {
            alert('coming soon...')
            // checkForUpdate(true);
        }
    });
}

var menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
