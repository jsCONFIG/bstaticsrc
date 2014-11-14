/**
 * staticParse 提供对combie的静态资源进行拆分
 * 支持将拆分后的数据划分到相应的本地目录中，之后走本地缓存
 * 支持直接从本地开发路径下提取资源
 * 支持额外直接走线上资源src配置
 * 支持额外走本地缓存资源src配置
 * !!!!!不支持https请求！！
 * @type {[type]}
 */
var http = require('http');
var path = require('path');
var url  = require('url');
var fs = require('fs');
var dns = require('dns');

var ctype = {
    'html'  : 'text/html; charset=utf-8;',
    'js'    : 'application/x-javascript',
    'css'   : 'text/css',
    'less'  : 'text/less',
    'extra' : 'application/octet-stream'
};

var reg = {
    'filter' : /^\S+\.([a-zA-Z]+)\??\S*$/,

    // 用于提取url访问的资源列表及资源路径
    // !!!!!此处可以修改为各种形式的合并路径展示规则
    // 只需保证，正则match之后的数据为[原路径, path, 文件列表块，带?的query部分]
    // 当前为提取形如"http://a.tbcdn.cn/apps/dts/th3/js/??j.min.js,tabswitch.js"的形式
    'src'    : /^([^\?]+)(\??.*)$/,

    // 用于提取普通的单个资源信息
    'normalSrc' : /^([^\?]+)(\??.*)$/
};

// 读配置信息
var CONFIG = {},

    CONFIG_PATH = path.join(__dirname, 'config.json');

fs.readFile( CONFIG_PATH, function( err, data ){
    if( !err ) {
        CONFIG = JSON.parse( data.toString( 'utf-8' ) || '{}' );
    }
});

// 创建路径，如果已存在则直接返回(同步创建)
var createPath = function ( path ) {
    if( fs.existsSync( CONFIG.STATIC_CACHE_PATH + '/' + path ) ) {
        return;
    }

    path = path.replace( /\\/g, '/' );
    path = path.replace( /^\/(.*)\/$/, '$1' );

    var pathArr = path.split('/');

    for( var i = 1, pL = pathArr.length; i <= pL; i++ ) {
        var tmpPath = CONFIG.STATIC_CACHE_PATH + '/' + pathArr.slice(0, i ).join('/');
        if( !fs.existsSync( tmpPath ) ) {
            fs.mkdirSync( tmpPath );
        }
    }
};

// 处理路径的斜线
var parsePathStr = function ( src, mode ) {
    if( !mode ){
        return ( src || '' ).replace( /\\/g, '/' )
    }
    else {
        return ( src || '' ).replace( /\//g, '\\' );
    }
};

// 创建服务器
http.createServer(function ( req, res ){
    var GLOBAL = {},

        // 实际返回内容
        srcContent = '',

        // 当前url的parse信息
        urlInfo = url.parse( req.url ),

        // src object，用于临时存储数据，保证拼凑的顺序合理
        srcObject = {},

        // 请求发起的域名
        reqHost = req.headers.host,

        // path前缀
        pathPrefix = '',

        // 单次请求完成标志(send是否已执行)
        finishFlag = false;

    // 正则匹配的combine专用url信息
    var srcInfo, dataPos, dataStr;
    
    if( CONFIG.MULTI_FILES_PREFIX && typeof CONFIG.MULTI_FILES_PREFIX == 'string' ) {
        dataStr = req.url;

        // 当前路径中无多文件分割前缀也认为是单个文件
        if( dataStr.indexOf( CONFIG.MULTI_FILES_PREFIX ) != -1 ){

            dataPos = dataStr.lastIndexOf( CONFIG.MULTI_FILES_PREFIX );

            dataStr = dataStr.slice( dataPos + CONFIG.MULTI_FILES_PREFIX.length );

            // 正则匹配信息
            srcInfo = dataStr.match( reg.src );
            
        }
    }
    
    // content-type
    GLOBAL.CONTENT_TYPE = undefined;

    if( srcInfo ) {
        // 资源文件列表，可自定义分隔符，默认为逗号
        GLOBAL.SRC_LIST = srcInfo[1].split( CONFIG.FILE_SPLIT_SYM );

        // 资源文件所在的路径
        GLOBAL.SRC_PATH = req.url.slice(0, dataPos);

        // query值
        GLOBAL.SRC_QUERY = srcInfo[2] || '';

    }

    // 表示单个文件
    else {
        var tmpPos;
        var tmpQuery = ( urlInfo.query ? ('?' + urlInfo.query) : '' );
        GLOBAL.SRC_QUERY = tmpQuery;
        GLOBAL.SRC_PATH = urlInfo.pathname.slice( 0, (tmpPos = urlInfo.path.lastIndexOf( '/' )) + 1 );
        GLOBAL.SRC_LIST = [urlInfo.pathname.slice( tmpPos + 1 )];
    }
    
    // 是否按域名整理资源，开启后，会按照域名创建文件夹
    // 默认开启，如果将静态资源路径指向本地开发路径时，可以关闭此项
    if( CONFIG.AUTO_ASSORT_PATH ) {
        pathPrefix = '/' + req.headers.host;
    }

    // 最终返回的处理方法
    var send = function ( content, contentType ) {
        var srcContent = content || ' ';

        // 头信息设置
        var headObj = {};
        headObj['Content-Length']   = Buffer.byteLength( srcContent );
        headObj['Content-Type']     = contentType || GLOBAL.CONTENT_TYPE || ctype['extra'];

        // 实际发送处理
        res.writeHead( 200, headObj );
        res.end(srcContent);
    };

    // 合并数据，确保单个文件请求时，返回先后顺序不影响合并数据顺序
    var combineSrc = function ( srcPath, contentTypeBak ) {
        // 对顺序内容进行重新合并
        for( var i in srcObject ) {
            if( srcObject.hasOwnProperty( i ) ) {
                srcContent += srcObject[i];
            }
        }
        // 校验content-type
        
        // 解析路径，获取相应的content-type
        var srcInfo = srcPath.match( reg.filter );
        
        // 仅当本地解析正则无法识别时，才使用传入的备用content-type
        var cType = contentTypeBak;
        if( srcInfo ) {
            cType = ctype[ srcInfo[1] ] || contentTypeBak;
        }

        send( srcContent, cType );
        finishFlag = true;
    };

    // 辅助过滤器检查方法
    var checkList = function ( listArr, keyWord ) {
        var flag = false;
        listArr.forEach( function ( listItem, listIndex ) {
            if( !flag ) {
                flag = ( keyWord.indexOf( listItem ) != -1 );
            }
        } );
        return flag;
    };

    // 判断当前路径是否需要监听，需要则返回true，否则返回false
    var isPathNeedMonitor = function ( pathStr ){
        var flag = false;

        // 如果选择性监听或监听全部
        if( CONFIG.MONITOR_ALL ) {

            // 略过目录列表走线上，过滤器通过
            flag = !checkList( CONFIG.SKIP_PATHS, pathStr );
        }

        else {

            // 监听列表走线上，过滤器通过
            flag = checkList( CONFIG.MONITOR_PATHS, pathStr );
        }

        return flag;
    };

    // 剩余待加载的资源列表
    var leftNum = GLOBAL.SRC_LIST.length;

    GLOBAL.SRC_LIST.forEach( function ( item, index ) {
        var needMonitorFlag;

        // 从线上获取，同时缓存到本地
        var getOnline = function () {

            // 单个文件的线上资源路径
            var srcPath = 'http://' + reqHost + GLOBAL.SRC_PATH + item + GLOBAL.SRC_QUERY;

            // dns解析获取数据，避免受本地host干扰
            var dnsSrc, serverHost;

            dns.resolve4( reqHost, function(err, addresses) {
                // 临时内容存储，针对多次"data"事件的内容拼合
                // var tmpContent = [],
                //     contentType;

                serverHost = (addresses && addresses[0]) || req.headers.host;

                serverHost && (dnsSrc = 'http://' + serverHost + GLOBAL.SRC_PATH + item + GLOBAL.SRC_QUERY);

                var headersCopy = JSON.parse(JSON.stringify(req.headers));

                // 拒绝压缩，保证之后的拼接
                headersCopy['accept-encoding'] = '';
                var proxyReq = http.request({
                    'host'      : serverHost || req.headers.host,
                    'port'      : 80,
                    'path'      : req.url,
                    'method'    : req.method,
                    'headers'   : headersCopy,
                    'agent'     : false
                }, function( proxyRes ) {
                    var tmpContent = [],
                        contentType;

                    // 代理返回的content-type值
                    contentType = proxyRes.headers['content-type'];

                    // 无数据
                    if( proxyRes.statusCode == '404' ) {
                        console.log( 'Error: 404 not found for ' + srcPath );

                        leftNum--;
                        if( leftNum <= 0 ) {
                            // 执行合并返回
                            combineSrc( srcPath, contentType );
                        }
                        return;
                    }

                    proxyRes.on( 'data', function ( chunk ) {
                        tmpContent += chunk;
                    });

                    proxyRes.on( 'end', function () {

                        // 仅在需要监听的情况做缓存
                        if( needMonitorFlag ){

                            // 将线上资源缓存到本地
                            var cachePath = CONFIG.STATIC_CACHE_PATH + '/' + pathPrefix + GLOBAL.SRC_PATH;

                            // 修正路径
                            cachePath = cachePath.replace( /\/\//g, '\/' );
                            
                            // 依照请求域名，以同步方式创建文件目录
                            // 例: /a.tbcdn.cn/s/
                            
                            // path处理，保证兼容item中含有路径信息的情况
                            var tmpFilePath = pathPrefix + GLOBAL.SRC_PATH + item;
                            tmpFilePath = tmpFilePath.slice( 0, tmpFilePath.lastIndexOf( '/' ) + 1 );

                            createPath( tmpFilePath );

                            fs.writeFile( cachePath + item, tmpContent, function ( err ){
                                if( err ){
                                    console.log( err );
                                }
                                else {
                                    console.log( pathPrefix + GLOBAL.SRC_PATH + item + ' has saved!');
                                }
                            } ); 
                        }

                        // 先存储，全部结束之后进行合并，保证顺序性
                        srcObject[index] = tmpContent;

                        leftNum--;
                        if( leftNum <= 0 ) {

                            // 执行合并返回
                            combineSrc( srcPath, contentType );
                        }
                    });

                    // 仅当正常返回时才赋值
                    GLOBAL.CONTENT_TYPE = contentType;
                });

                proxyReq.on('error', function(e) {
                    console.log(e);
                });

                // 启动
                req.pipe( proxyReq );
                
            });
        };

        // 尝试从本地读取文件
        var tmpFPath = parsePathStr( pathPrefix + GLOBAL.SRC_PATH + item );
        var filePath = parsePathStr( CONFIG.STATIC_CACHE_PATH + tmpFPath );

        // 判断当前路径是否需要监听
        needMonitorFlag = isPathNeedMonitor( tmpFPath );

        needMonitorFlag && fs.exists( filePath, function ( exist ) {

            // 如果文件存在，则读取本地文件，追加到scrContent上
            if( exist ) {
                fs.readFile( filePath, function ( err, data ) {
                    if( !err ) {
                        srcObject[index] = (data.toString( 'utf-8' ) || '');
                    }

                    leftNum--;
                    if( leftNum <= 0 ) {

                        // 执行合并返回
                        combineSrc( filePath );
                    }
                });
            }

            // 否则，读取线上数据，同时存储在本地
            else {
                getOnline();
            }
        } );

        // 不需监听，直接走线上资源
        if( !needMonitorFlag ) {
            getOnline();
        }
    });

    if( leftNum > 0 || finishFlag ) {
        return;
    }

    send( srcContent );
    
}).listen(80, '0.0.0.0');