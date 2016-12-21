"use strict";

const _ = require('lodash');
const async = require('async');
const gulp = require('gulp');
const fs = require('fs');
const del = require('del');
const path = require('path');
const gulpif = require('gulp-if');

const g_replace = require('gulp-replace')

const less = require('gulp-less');
const util = require(path.join(__dirname, './lib/util'));
const uglify = require('gulp-uglify');
const usemin = require('gulp-usemin');
const lazyImageCSS = require('gulp-lazyimagecss');  // 自动为图片样式添加 宽/高/background-size 属性
const minifyCSS = require('gulp-cssnano');
const imagemin = require('weflow-imagemin');
// const tmtsprite = require('gulp-tmtsprite');   // 雪碧图合并
const pngquant = require('imagemin-pngquant');

const postcss = require('gulp-postcss');  // CSS 预处理
const postcssPxtorem = require('postcss-pxtorem'); // 转换 px 为 rem
const postcssAutoprefixer = require('autoprefixer');
const posthtml = require('gulp-posthtml');
const posthtmlPx2rem = require('posthtml-px2rem');

const RevAll = require('weflow-rev-all');   // reversion
const revDel = require('gulp-rev-delete-original');
// const sass = require('gulp-sass');
const Common = require(path.join(__dirname, '../common'));

let webp = require(path.join(__dirname, './common/webp'));
let changed = require(path.join(__dirname, './common/changed'))();

function dist(projectPath, log, callback) {
    let projectConfigPath = path.join(projectPath, Common.CONFIGNAME);
    let config = null;

    if (Common.fileExist(projectConfigPath)) {
        config = Common.requireUncached(projectConfigPath);
    } else {
        config = Common.requireUncached(path.join(__dirname, '../../' + Common.CONFIGNAME));
    }

    let lazyDir = config.lazyDir || ['../slice'];

    //todo tips for set config 
    let imgPrefix = `//game.gtimg.cn/images/${config.gameName}/act/${path.basename(projectPath)}/`

    let postcssOption = [];

    if (config.supportREM) {
        postcssOption = [
            postcssAutoprefixer({browsers: ['last 9 versions']}),
            postcssPxtorem({
                root_value: '20', 
                prop_white_list: [],
                minPixelValue: 2 
            })
        ]
    } else {
        postcssOption = [
            postcssAutoprefixer({browsers: ['last 9 versions']})
        ]
    }

    let paths = {
        src: {
            dir: path.join(projectPath, './src'),
            img: path.join(projectPath, './src/img/**/*.{JPG,jpg,png,gif,svg}'),
            slice: path.join(projectPath, './src/slice/**/*.png'),
            js: path.join(projectPath, './src/js/**/*.js'),
            media: path.join(projectPath, './src/media/**/*'),
            less: path.join(projectPath, './src/css/style-*.less'),
            sass: path.join(projectPath, './src/css/style-*.scss'),
            html: [path.join(projectPath, './src/html/**/*.html'), path.join(projectPath, '!./src/html/_*/**.html')],
            htmlAll: path.join(projectPath, './src/html/**/*')
        },
        tmp: {
            dir: path.join(projectPath, './tmp'),
            dirAll: path.join(projectPath, './tmp/**/*'),
            css: path.join(projectPath, './tmp/css'),
            cssAll: path.join(projectPath, './tmp/css/style-*.css'),
            img: path.join(projectPath, './tmp/img'),
            html: path.join(projectPath, './tmp/html'),
            js: path.join(projectPath, './tmp/js'),
            sprite: path.join(projectPath, './tmp/sprite'),
            spriteAll: path.join(projectPath, './tmp/sprite/**/*')
        },
        dist: {
            dir: path.join(projectPath, './dist'),
            css: path.join(projectPath, './dist/css'),
            img: path.join(projectPath, './dist/img'),
            html: path.join(projectPath, './dist/html'),
            sprite: path.join(projectPath, './dist/sprite')
        }
    };

    // 清除 dist 目录
    function delDist(cb) {
        del(paths.dist.dir, {force: true}).then(function () {
            console.log('Clear Dist') ;
            cb();
        })
    }

    function condition(file) {
        return path.extname(file.path) === '.png';
    }

    //编译 less
    function compileLess(cb) {
        gulp.src(paths.src.less, {base: paths.src.dir})
            .pipe(less())
            .on('error', function (error) {
                console.log(error.message);
                log(error.message);
            })
            //.pipe(lazyImageCSS({imagePath: lazyDir}))
            // .pipe(tmtsprite({margin: 4}))
            //.pipe(gulpif(condition, gulp.dest(paths.tmp.sprite), gulp.dest(paths.tmp.css)))
            .pipe( gulp.dest(paths.tmp.dir))
            .on('end', function () {
                console.log('compileLess success.');
                log('compileLess success.');
                cb && cb();
            })
    }

    //编译 sass
    function compileSass(cb) {
        gulp.src(paths.src.sass)
            //.pipe(sass())
            .on('error', function (error) {
                console.log(error.message);
                log(error.message);
            })
            //.pipe(lazyImageCSS({imagePath: lazyDir}))
            // .pipe(tmtsprite({margin: 4}))
            //.pipe(gulpif(condition, gulp.dest(paths.tmp.sprite), gulp.dest(paths.tmp.css)))
            .on('end', function () {
                console.log('compileSass success.');
                log('compileSass success.');
                cb && cb();
            })
    }

    //自动补全
    function compileAutoprefixer(cb) {
        gulp.src(paths.tmp.cssAll)
            .pipe(postcss(postcssOption))
            .pipe(gulp.dest(paths.tmp.css))
            .on('end', function () {
                console.log('compileAutoprefixer success.');
                log('compileAutoprefixer success.');
                cb && cb();
            });
    }

    //CSS 压缩
    function miniCSS(cb) {
        //todo sprite img 
        //todo repalce img src
        //todo imgin
        console.log(config.gameName) ;

        gulp.src(paths.tmp.cssAll)
            //todo modify img to images
            .pipe(g_replace('(../img/', '(' + imgPrefix ))
            .pipe(minifyCSS({
                safe: true,
                reduceTransforms: false,
                advanced: false,
                compatibility: 'ie7',
                keepSpecialComments: 0
            }))
            .pipe(gulp.dest(paths.tmp.css))
            .on('end', function () {
                console.log('miniCSS success.');
                log('miniCSS success.');
                cb && cb();
            });
    }

    //图片压缩
    function imageminImg(cb) {
        gulp.src(paths.src.img, {base: paths.src.dir})
            //.pipe(imagemin({
                //use: [pngquant()]
            //}))
            .pipe(gulp.dest(paths.tmp.dir))
            .on('end', function () {
                console.log('imageminImg success.');
                log('imageminImg success.');
                cb && cb();
            });
    }

    //雪碧图压缩
    function imageminSprite(cb) {
        gulp.src(paths.tmp.spriteAll)
            //.pipe(imagemin({
                //use: [pngquant()]
            //}))
            .pipe(gulp.dest(paths.tmp.sprite))
            .on('end', function () {
                console.log('imageminSprite success.');
                log('imageminSprite success.');
                cb && cb();
            });
    }

    //复制媒体文件
    function copyMedia(cb) {
        gulp.src(paths.src.media, {base: paths.src.dir})
            .pipe(gulp.dest(paths.dist.dir))
            .on('end', function () {
                console.log('copyMedia success.');
                log('copyMedia success.');
                cb && cb();
            });
    }

    //JS 压缩
    function uglifyJs(cb) {
        gulp.src(paths.src.js, {base: paths.src.dir})
            .pipe(uglify())
            .pipe(gulp.dest(paths.tmp.dir))
            .on('end', function () {
                console.log('uglifyJs success.');
                log('uglifyJs success.');
                cb && cb();
            });
    }

    //html 编译
    function compileHtml(cb) {
        gulp.src(paths.src.html, {base: paths.src.dir})
            .pipe(gulpif(
                config.supportREM,
                posthtml(
                    posthtmlPx2rem({
                        rootValue: 20,
                        minPixelValue: 2
                    })
                ))
            )
            .pipe(gulp.dest(paths.tmp.dir))
            .pipe(usemin())
            .pipe(gulp.dest(paths.tmp.dir))
            .on('end', function () {
                console.log('compileHtml success.');
                log('compileHtml success.');
                cb && cb();
            });
    }

    //新文件名(md5)
    function reversion(cb) {
        var revAll = new RevAll({
            fileNameManifest: 'manifest.json',
            dontRenameFile: ['.html', '.php']
        });

        if (config['reversion']) {
            gulp.src(paths.tmp.dirAll)
                .pipe(revAll.revision())
                .pipe(gulp.dest(paths.tmp.dir))
                .pipe(revDel({
                    exclude: /(.html|.htm)$/
                }))
                .pipe(revAll.manifestFile())
                .pipe(gulp.dest(paths.tmp.dir))
                .on('end', function () {
                    console.log('reversion success.');
                    log('reversion success.');
                    cb && cb();
                })
        } else {
            cb && cb();
        }
    }

    //webp 编译
    function supportWebp(cb) {
        if (config['supportWebp']) {
            console.log('ready to webp');
            webp(projectPath, cb);
        } else {
            cb();
        }
    }

    // 清除 tmp 目录
    function delTmp(cb) {
        del(paths.tmp.dir, {force: true}).then(function (delpath) {
            cb();
        })
    }

    function findChanged(cb) {
        if (!config['supportChanged']) {
            gulp.src(paths.tmp.dirAll, {base: paths.tmp.dir})
                .pipe(gulp.dest(paths.dist.dir))
                .on('end', function () {
                    delTmp(cb);
                })
        } else {
            var diff = changed(paths.tmp.dir);
            var tmpSrc = [];

            if (!_.isEmpty(diff)) {

                //如果有reversion
                if (config['reversion'] && config['reversion']['available']) {
                    var keys = _.keys(diff);

                    //先取得 reversion 生成的manifest.json
                    var reversionManifest = require(path.join(paths.tmp.dir, './manifest.json'));

                    if (reversionManifest) {
                        reversionManifest = _.invert(reversionManifest);

                        reversionManifest = _.pick(reversionManifest, keys);

                        reversionManifest = _.invert(reversionManifest);

                        _.forEach(reversionManifest, function (item, index) {
                            tmpSrc.push(path.join(paths.tmp.dir, item));
                            console.log('[changed:] ' + util.colors.blue(index));
                        });

                        //将新的 manifest.json 保存
                        fs.writeFileSync(path.join(paths.tmp.dir, './manifest.json'), JSON.stringify(reversionManifest));

                        tmpSrc.push(path.join(paths.tmp.dir, './manifest.json'));
                    }
                } else {
                    _.forEach(diff, function (item, index) {
                        tmpSrc.push(path.join(paths.tmp.dir, index));
                        console.log('[changed:] ' + util.colors.blue(index));
                    });
                }

                gulp.src(tmpSrc, {base: paths.tmp.dir})
                    .pipe(gulp.dest(paths.dist.dir))
                    .on('end', function () {
                        delTmp(cb);
                    })

            } else {
                console.log('Nothing changed!');
                delTmp(cb);
            }
        }

    }

    async.series([
        function (next) {
            delDist(next);
        },
        function (next) {
            compileLess(next);
        },
        //function (next) {
            //compileSass(next);
        //},
        function (next) {
            compileAutoprefixer(next);
        },
        function (next) {
            miniCSS(next);
        },
        function (cb) {
            imageminImg(cb);
        },
        //function (cb) {
            //imageminSprite(cb);
        //},
        //function (cb) {
            //copyMedia(cb);
        //},
        function (cb) {
            uglifyJs(cb);
        },

        function (next) {
            compileHtml(next);
        },
        //function (next) {
            //reversion(next);
        //},
        function (next) {
            supportWebp(next);
        },
        function (next) {
            findChanged(next);
        }
    ], function (error) {
        if (error) {
            throw new Error(error);
        }

        callback && callback();
    });

}

module.exports = dist;
