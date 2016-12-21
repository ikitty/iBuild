"use strict";

const electron = nodeRequire('electron');
const remote = electron.remote;
const ipc = electron.ipcRenderer;
const shell = electron.shell;
const dialog = remote.dialog;
const BrowserWindow = remote.BrowserWindow;

const path = nodeRequire('path');
const fs = nodeRequire('fs');
const del = nodeRequire('del');
const gulp = nodeRequire('gulp');
const extract = nodeRequire('extract-zip');
const _ = nodeRequire('lodash');
const async = nodeRequire('async');


const dev = nodeRequire(path.join(__dirname, './src/_tasks/dev.js'));
const dist = nodeRequire(path.join(__dirname, './src/_tasks/dist.js'));

const Common = nodeRequire(path.join(__dirname, './src/common'));
const packageJson = nodeRequire(path.join(__dirname, './package.json'));

//变量声明
let $welcome = $('#welcomePart');
let $example = $('#btnTry');

let $newProject = $('#js-new-project');
let $projectList = $('#js-project-list');
let $buildDevButton = $('#js-build-dev');

let $logStatus = $('#logMsg');

let $setting = $('#settingWrap');
let $settingButton = $('#js-setting-button');
let $settingClose = $('#js-setting-close');

let $workspaceSection = $('#js-workspace');
let $formWorkspace = $('#js-form-workspace');
let $formGamename = $('#formGamename');

let changeTimer = null;
let $curProject = null;
let once = false;

let curConfigPath = Common.CONFIGPATH;
let config = nodeRequire(curConfigPath);
let bsObj = {};
let checkHandler = null;
let newProjectSucess = false;

//define project list template
let getListTmp = (name,path ) => (
        `<li class="list_item" data-project="${name}" title="${path}">
            <span class="icon icon-finder" data-finder="true" title="打开项目文件夹"></span>
            <div class="list_content">
                <span class="projects_name">${name}</span>
                <div class="projects_path">${path}</div>
            </div>
        </li>`
)


init();

function init() {
    $('.jsProjectName').text(packageJson.name) ;
    // checkForUpdate();

    let storage = Common.getStorage();

    if (!storage) {
        $welcome.removeClass('hide');

        storage = {};
        storage.name = Common.NAME;

        let workspace = path.join(remote.app.getPath(Common.DEFAULT_PATH), Common.WORKSPACE);

        fs.mkdir(workspace, function (err) {
            if (err) {
                throw new Error(err);
            }

            $formWorkspace.val(workspace);

            storage.workspace = workspace;
            Common.setStorage(storage);

            console.log('Create workspace OK.');
        });
    } else {
        checkLocalProjects();
        initData();
    }
}

//每次启动的时候检查本地项目是否还存在
function checkLocalProjects() {
    let storage = Common.getStorage();

    if (storage) {
        if (storage.workspace) {

            if (!Common.dirExist(storage.workspace)) {
                console.log('本地工作目录已不存在');
                storage.projects = {};
            }

            if (storage.projects) {

                let projects = storage.projects;

                _.forEach(projects, function (project, key) {
                    if (!Common.dirExist(project.path)) {
                        delete projects[key];
                    }
                });
                storage.projects = projects;
            }
            Common.setStorage(storage);
        }
    }
}

//初始化数据
function initData() {
    let storage = Common.getStorage();
    let title = '';

    if (storage) {
        if (storage['workspace']) {
            $formWorkspace.val(storage['workspace']);
        }

        if (!_.isEmpty(storage['projects'])) {
            let html = '';
            for (let i in storage['projects']) {
                html += getListTmp(i, storage['projects'][i]['path'])
            }
            $projectList.html(html);

            //当前活动项目
            $curProject = $projectList.find('.list_item').eq(0);
            $curProject.addClass('list_hover');

        } else {
            $welcome.removeClass('hide');
        }
    }
}


//导入demo
$example.on('click', function () {
    let storage = Common.getStorage();

    if (storage && storage['workspace']) {
        let projectName = Common.EXAMPLE_NAME;
        let projectPath = path.join(storage['workspace'], Common.EXAMPLE_NAME);

        if (storage.projects && storage.projects[projectName]) {
            //已经打开,直接切换
        } else {

            extract(Common.TEMPLAGE_EXAMPLE, {dir: storage['workspace']}, function (err) {
                if (err) {
                    throw new Error(err);
                }

                let listTmp = getListTmp(projectName, projectPath)
                let $projectHtml = $(listTmp)

                $projectList.append($projectHtml);
                $projectList.scrollTop($projectList.get(0).scrollHeight);

                if (!storage['projects']) {
                    storage['projects'] = {};
                }

                storage['projects'][projectName] = {};
                storage['projects'][projectName]['path'] = projectPath;
                Common.setStorage(storage);

                console.log('created demo OK.');
            });
        }
    }

    $welcome.addClass('hide');
});


//关联本地项目文件夹
$('#btnApplyProject').on('change', function () {
    if (this && this.files.length) {
        let projectPath = this.files[0].path;
        openProject(projectPath);
    } else {
        alert('选择目录出错');
    }
});

//拖拽本地文件夹
$welcome[0].ondragover = $welcome[0].ondragleave = $welcome[0].ondragend = $welcome[0].ondrop = function(e){
    e.preventDefault();
    return false;
};

$projectList[0].ondragover = function () {
    return false;
};
$projectList[0].ondragleave = $projectList[0].ondragend = function () {
    return false;
};
$projectList[0].ondrop = function (e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];

    var stat = fs.statSync(file.path);
    if (stat.isDirectory()) {
        openProject(file.path);
    }
    return false;
};

//关联本地文件夹
function openProject(projectPath) {
    let storage = Common.getStorage();
    let projectName = path.basename(projectPath);

    if (storage && storage['workspace']) {
        if (!storage['projects']) {
            storage['projects'] = {};
        }

        if (storage['projects'][projectName]) {
            alert('项目已存在');
        } else {
            storage['projects'][projectName] = {};
            storage['projects'][projectName]['path'] = projectPath;
            Common.setStorage(storage);

            insertOpenProject(projectPath);
        }
    }
}

//往list中加入关联的项目
function insertOpenProject(projectPath) {
    $welcome.addClass('hide');

    let projectName = path.basename(projectPath);
    let $projectHtml = $(getListTmp(projectName, projectPath));

    $projectList.append($projectHtml);

    $projectList.scrollTop($projectList.get(0).scrollHeight);


    let storage = Common.getStorage();
    if (storage) {
        if (!storage['projects']) {
            storage['projects'] = {};
        }
        if (!storage['projects'][projectName]) {
            storage['projects'][projectName] = {};
        }

        storage['projects'][projectName]['path'] = projectPath;
        Common.setStorage(storage);
    }
}

//删除项目
$('.jsRemoveProject').on('click', function () {
    delProject(function () {
        $('.tasks').css('top', -100)
    });
});

function delProject(cb) {
    if (!$curProject.length) {
        return;
    }

    let projectName = $curProject.data('project');
    let index = $curProject.index();

    killBs();

    $curProject.remove();

    if (index > 0) {
        $curProject = $('.list_item').eq(index - 1);
    } else {
        $curProject = $('.list_item').eq(index);
    }

    $curProject.trigger('click');


    let storage = Common.getStorage();

    if (storage && storage['projects'] && storage['projects'][projectName]) {
        delete storage['projects'][projectName];
        Common.setStorage(storage);
    }

    if (_.isEmpty(storage['projects'])) {
        $welcome.removeClass('hide');
    }

    console.log('del project OK.');
    cb && cb();
}

function killBs() {
    var projectPath = $curProject.attr('title');
    if (bsObj[projectPath]) {
        try {
            bsObj[projectPath].exit();
            console.log('Watching exit.');
        } catch (err) {
            console.log(err);
        }
    }

    bsObj[$curProject.attr('title')] = null;
    setNormal();
}

//新建项目
$newProject.on('click', function () {
    if (!newProjectSucess) {
        newProjectSucess = true;
        newProjectFn();
    }
});

function newProjectFn() {
    if (!$welcome.hasClass('hide')) {
        $welcome.addClass('hide');
    }
    let $projectHtml = $(`<li class="list_item" data-project="" title="">
                              <span class="icon icon-finder" data-finder="true"></span>
                              <div class="list_content">
                                  <span class="projects_name" contenteditable></span>
                                  <div class="projects_path"></div>
                              </div>
                        </li>`);

    $projectList.append($projectHtml);

    $projectList.scrollTop($projectList.get(0).scrollHeight);

    let $input = $projectHtml.find('.projects_name');


    $input.get(0).focus();
    $input.hover();

    editName($projectHtml, $input);
}

var keyboard = false;
let blurTimer = null;
function editName($project, $input) {
    let text;
    let hasText = false;

    $input.keypress(function (event) {
            let $this = $(this);
            let _this = this;
            text = $.trim($this.text());

            if (event.which === 13 && !hasText) {
                keyboard = true;
                if (text !== '') {
                    setProjectInfo($project, $this, text);
                    hasText = true;
                    keyboard = false;
                } else {
                    alert('请输入项目名')

                    setTimeout(function () {
                        $this.html('');
                        if(Common.PLATFORM !== 'win32'){
                            _this.focus();
                        }
                    }, 10)
                }
            }

        })
        .blur(function () {

            let $this = $(this);
            let _this = this;

            //解决当用新建按钮来失焦时的重复执行问题
            clearTimeout(blurTimer);

            blurTimer = setTimeout(function () {
                text = $.trim($this.text());

                if (text) {
                    hasText = false;
                    keyboard = false;
                }

                if (!hasText && !keyboard) {

                    setTimeout(function () {

                        if (text !== '') {
                            setProjectInfo($project, $this, text);

                            hasText = true;
                        } else {
                            alert('请输入项目名');
                            if(Common.PLATFORM !== 'win32'){
                                _this.focus();
                            }
                        }
                    }, 100);
                }
            }, 100);
        });
}

//设置新建项目信息
function setProjectInfo($project, $input, text) {
    let storage = Common.getStorage();
    let projectPath;

    if (storage && storage['workspace']) {
        projectPath = path.join(storage['workspace'], text);

        if (!Common.dirExist(projectPath)) {
            $input.attr('contenteditable', false);
            $curProject = $project.remove();

            newProject(projectPath, function (projectPath) {
                newProjectReply(projectPath);
            });

        } else {
            alert(text + ' 项目已存在');
            $input.text('');
            editName($project, $input);
        }
    }

}

function newProject(projectPath, callback) {
    let workspace = path.dirname(projectPath);

    if (!Common.dirExist(workspace)) {
        try {
            fs.mkdirSync(path.join(workspace));
        } catch (err) {
            throw new Error(err);
        }
    }

    //创建项目目录
    if (Common.dirExist(projectPath)) {
        throw new Error('project already exists');
    } else {
        try {
            fs.mkdirSync(path.join(projectPath));
        } catch (err) {
            throw new Error(err);
        }
    }

    extract(Common.TEMPLAGE_PROJECT, {dir: projectPath}, function (err) {
        if (err) {
            throw new Error(err);
        }
        callback(projectPath);
    });
}

function newProjectReply(projectPath) {
    let projectName = path.basename(projectPath);
    let storage = Common.getStorage();

    if (storage && storage['workspace']) {
        if (!storage['projects']) {
            storage['projects'] = {};
        }

        if (storage['projects'][projectName]) {
            alert('项目已存在');
        } else {
            storage['projects'][projectName] = {};
            storage['projects'][projectName]['path'] = projectPath;
            Common.setStorage(storage);

            $curProject.data('project', projectName);
            $curProject.attr('title', projectPath);
            $curProject.find('.projects_path').text(projectPath);

            $projectList.append($curProject);
        }

        $projectList.scrollTop($projectList.get(0).scrollHeight);

        console.log('new Project OK.');
        newProjectSucess = false;
    }
}

let taskTimer = null;

//绑定任务按钮事件
$('#js-tasks').find('.jsTaskBtn').on('click', function () {
    let $this = $(this);
    clearTimeout(taskTimer);

    taskTimer = setTimeout(function () {
        let taskName = $this.data('task');

        runTask(taskName, $this);
    }, 200);

});

function runTask(taskName, context) {
    $logStatus.text('开始运行');

    let projectPath = $curProject.attr('title');
    if (taskName === 'dev') {
        if ($buildDevButton.data('devwatch')) {
            killBs();
            $logStatus.text('完成');

        } else {
            dev(projectPath, function (data) {
            }, function (bs) {
                bsObj[projectPath] = bs;
                setWatching();
                $logStatus.text('监听中...');
            });
        }

    }

    if (taskName === 'dist') {
        context.text('执行中');
        dist(projectPath, function (data) {
        }, function () {
            setTimeout(function () {
                $logStatus.text('编译完成');
                console.log('编译完成');
                context.text('编译')
            }, 500);
        });
    }
}

//=================================================================
//======================= Setting =================================
//=================================================================
$settingButton.on('click', function () {
    settingFn();
});

//init setting data
function settingFn() {
    curConfigPath = Common.CONFIGPATH;
    initConfig();

    if ($setting.hasClass('hide')) {
        $setting.removeClass('hide');
        $workspaceSection.removeClass('hide');
    } else {
        $setting.addClass('hide');
    }
}

$settingClose.on('click', function () { $setting.addClass('hide'); });

//update setting
$setting.on('change', 'input', function () {
    clearTimeout(changeTimer);

    let $this = $(this);

    if ($this.data('workspace')) {
        let storage = Common.getStorage();
        let originWorkspace = storage.workspace;
        storage.workspace = $.trim($this.val());

        gulp.src(path.join(originWorkspace, '/**/*'))
            .pipe(gulp.dest(storage.workspace))
            .on('end', function () {
                async.series([
                    function (next) {
                        shell.moveItemToTrash(originWorkspace);
                        next();
                    },
                    function (next) {
                        let projects = storage.projects;
                        async.eachSeries(projects, function (project, callback) {
                            project.path = project.path.replace(originWorkspace, storage.workspace);
                            callback();
                        }, function () {
                            Common.setStorage(storage);
                            next();
                        });
                    }
                ], function (error) {
                    if (error) { throw new Error(error); }
                    initData();
                    console.log('workspace update success.');
                });
            });

    } else {
        updateConfig($this);
    }
});

function initConfig() {
    config = Common.requireUncached(curConfigPath);
    for (let i in config) {
        let $el = $(`input[name=${i}]`);
        if ($el && $el.length) {
            if ($el.attr('type') === 'text') {
                $el.val(config[i]);
            } else {
                $el.prop('checked', config[i]);
            }
        }
    }
}

function updateConfig($this) {
    let name = $this.attr('name');
    let val = $.trim($this.val());
    let checked = $this.prop('checked');
    let type = $this.attr('type');
    if (type === 'text' && !val ) {
        alert('所有选项都不能为空');
        return  ;
    }
    config[name] = type === 'text' ? val : checked;

    changeTimer = setTimeout(function () {
        fs.writeFile(curConfigPath, JSON.stringify(config, null, 4), function (err) {
            if (err) { throw new Error(err); }
            console.log('update config success.');
        })
    }, 1000);
}

//设置单个项目
$('.jsSetCurrent').on('click', function () {
    settingCurrentProject();
})

function settingCurrentProject() {
    let projectPath = $curProject.attr('title');
    curConfigPath = path.join(projectPath, Common.CONFIGNAME);

    if (!Common.fileExist(curConfigPath)) {
        gulp.src(Common.CONFIGPATH)
            .pipe(gulp.dest(projectPath))
            .on('end', function () {
                console.log('create custom config.json OK');
                initConfig();
            });
    } else {
        initConfig();
    }

    $workspaceSection.addClass('hide');
    $setting.removeClass('hide');
}


//项目列表绑定点击事件
//todo 节流
$projectList.on('click, mouseover', '.list_item', function () {
    let $this = $(this);
    $('.list_item').removeClass('list_hover');
    $this.addClass('list_hover');
    $curProject = $this;

    $('#js-tasks').css('top', $this.offset().top)

    if ($this.data('watch')) {
        setWatching();
    } else {
        setNormal();
    }

});

function setNormal() {
    $buildDevButton.removeClass('tasks_btn_watching').text('开发');
    $buildDevButton.data('devwatch', false);

    $curProject.removeClass('list_item_watching');
    $curProject.data('watch', false);
}

function setWatching() {
    $buildDevButton.addClass('tasks_btn_watching').text('正在监听');
    $buildDevButton.data('devwatch', true);

    $curProject.addClass('list_item_watching');
    $curProject.data('watch', true);
}

$buildDevButton.hover(function () {
    let $this = $(this);
    if ($this.hasClass('tasks_btn_watching')) {
        $this.text('停止监听');
    }
}, function () {
    let $this = $(this);
    if ($this.hasClass('tasks_btn_watching')) {
        $this.text('正在监听');
    }
});

function showAbout() {
    let win = new BrowserWindow({
        width: 350,
        height: 350,
        resizable: false,
        title: 'About'
    });

    let aboutPath = 'file://' + __dirname + '/about.html';
    win.loadURL(aboutPath);

    win.on('closed', function () {
        win = null;
    });
}

//打开项目所在目录
$projectList.on('click', '[data-finder=true]', function () {
    let $this = $(this);
    let projectPath = $this.parents('.list_item').attr('title');
    if (projectPath) {
        shell.showItemInFolder(projectPath);
    }
});


function stopWatch() {
    if(bsObj){
        _.forEach(bsObj, function (item) {
            if (item) {
                item.exit();
            }
        });
    }
}


//===========================================
// Update
//===========================================
function checkForUpdate(action) {
    checkHandler = $.ajax({
        method: 'GET',
        url: Common.CHECKURL,
        dataType: 'json',
        cache: false,
        success: function (data) {
            if (data && data.release && data.release > packageJson.version) {
                ipc.send('checkForUpdate', 1)
            } else {
                action && ipc.send('checkForUpdate', 0);
            }
        }
    });
}

ipc.on('checkForUpdateReply', function (event, index, status) {
    if (status) {
        if (index !== 1) {
            shell.openExternal(Common.DOWNLOADURL);
        }
    }
});
