"use strict";

const rd = require('rd');
const vfs = require('vinyl-fs');
const path = require('path');
const gulpWebp = require('gulp-webp');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const util = require(path.join(__dirname, '../lib/util'));
const fs = require('fs');
const async = require('async');

module.exports = function (projectPath, callback) {

    var webpScript = '<script>function webpsupport(a){var c=window.localStorage;if(typeof a!="function"){a=function(){}}if(c!=undefined&&c._tmtwebp!=undefined&&c._tmtwebp==0){a();return false}else{if(c!=undefined&&c._tmtwebp!=undefined&&c._tmtwebp==1){a(1);return true}else{var f=new Image();f.onload=f.onerror=function(){if(f.height!=2){if(c!=undefined){c._tmtwebp=0}a();return false}else{if(c!=undefined){c._tmtwebp=1}a(1);return true}};f.src="data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA"}}};;(function(){function b(t){var f=document.getElementsByTagName("link");for(var e=0,d=f.length;e<d;e++){if(t){f[e].href=f[e].getAttribute("data-href").replace(".css",".webp.css");}else{f[e].href=f[e].getAttribute("data-href")}}}webpsupport(b);})();</script></head>';
    let webpMap = {};    //为了筛选webp而构建的对象
    let imgArr = [];     //筛选出来需要转换成 webp 的图片
    let imgMap = {};     //返回给全局作 preload 判断使用{"img_name": 1, "img_name": 0} 1 为可优化成 webp
    let reg = null;

    function render_webp(src) {
        if (!fs.existsSync(src)) return;

        rd.eachFileSync(src, function (file, stats) {
            var extname = path.extname(file);
            var basename = path.basename(file, extname);
            if (!(basename in webpMap)) {
                webpMap[basename] = {};
                webpMap[basename]['size'] = stats.size;
                webpMap[basename]['extname'] = extname;
            } else {
                if ((webpMap[basename]['size'] > stats.size) && (extname === '.webp')) {
                    imgArr.push(basename + webpMap[basename]['extname']);
                    imgMap[basename + webpMap[basename]['extname']] = 1;
                } else {
                    imgMap[basename + webpMap[basename]['extname']] = 0;
                }
            }
        });
    }

    function compileSprite(cb) {
        vfs.src(path.join(projectPath, './tmp/sprite/**/*'))
            .pipe(gulpWebp())
            .pipe(vfs.dest(path.join(projectPath, './tmp/sprite')))
            .on('end', function () {
                cb && cb();
            })
    }

    function compileImg(cb) {
        vfs.src(path.join(projectPath, './tmp/img/**/*'))
            .pipe(gulpWebp())
            .pipe(vfs.dest(path.join(projectPath, './tmp/img')))
            .on('end', function () {
                cb && cb();
            });
    }

    function find2Webp(cb) {
        render_webp(path.join(projectPath, './tmp/sprite'));
        render_webp(path.join(projectPath, './tmp/img'));
        if (imgArr.length) {
            reg = eval('/(' + imgArr.join('|') + ')/ig');
        }
        cb();
    }

    function compileCss(cb) {
        vfs.src([path.join(projectPath, './tmp/css/**/*.css'), path.join(projectPath, '!./tmp/css/**/*.webp.css')])
            .pipe(rename({suffix: '.webp'}))
            .pipe(replace(reg, function (match) {
                if (match) {
                    return match.substring(0, match.lastIndexOf('.')) + '.webp';
                }
            }))
            .pipe(vfs.dest(path.join(projectPath, './tmp/css')))
            .on('end', function(){
                cb && cb();
            });
    }

    function insertWebpJs(cb) {
        var preload_script = '<script>window.imgMap = ' + JSON.stringify(imgMap) + '</script>';

        vfs.src(path.join(projectPath, './tmp/html/**/*.html'))
            .pipe(replace('data-href', 'href'))
            .pipe(replace(/(link.*?)href/ig, '$1data-href'))
            .pipe(replace('</head>', webpScript))
            .pipe(replace('</head>', preload_script))
            .pipe(vfs.dest(path.join(projectPath, './tmp/html')))
            .on('end', function(){
                cb && cb();
            });
    }

    async.series([
        function (next) {
            compileSprite(next);
        },
        function (next) {
            compileImg(next);
        },
        function(next){
            find2Webp(next);
        },
        function(next){
            compileCss(next);
        },
        function(next){
            insertWebpJs(next);
        }
    ], function (err) {
        if(err){
            throw new Error(err);
        }

        console.log('compile webp success.');

        callback && callback();
    });
}
