bstaticsrc v0.0.5
==========

[![Bstaticsrc](http://img.shields.io/npm/v/bstaticsrc.svg)](https://www.npmjs.org/package/bstaticsrc) [![Bstaticsrc](http://img.shields.io/npm/dm/bstaticsrc.svg)](https://www.npmjs.org/package/bstaticsrc)

基于node的静态资源抓取及解析工具，特别适用于静态资源使用cdn的情况。启动服务后，设置相应的host，将根据配置文件里的设置，自动解析并缓存相应的数据到本地，之后的静态资源请求，将优先本地缓存文件。默认支持形如“http://a.tbcdn.cn/apps/dts/th3/js/??j.min.js,tabswitch.js” 的combine资源解析，当前仅支持http请求，https请求的支持正在开发中。

####提供功能

  1). 多功能的本地开发服务器；

  2). 网页静态资源结构解析；

  3). 本地开发调试combine工具；

  4). 简单的combine资源解析；
  
  5). 网站静态资源下载工具；

####1. 安装/下载

    npm install bstaticsrc

####2. 使用方法

    // 配置config.json文件
    
    // 启动server
    node server.js

####3. config.json配置说明
  
  STATIC_CACHE_PATH: 缓存路径，Windows形如：D:\\bstaticsrc\\cache，Mac形如：/Users/bottle/Documents/bstaticsrc
  
  FILE_SPLIT_SYM: 多个文件combine的分隔符，默认为“,”，支持如：a.js,b.js格式

  MULTI_FILES_PREFIX: URL路径与资源列表之间的分隔符，默认为“??”，支持如：http://a.com/p1/??a.js,b.js格式
  
  AUTO_ASSORT_PATH: 是否整理缓存路径，默认为true，将按域名创建路径
  
  MONITOR_PATHS: 监听文件地址，可输入关键词即可，将使用indexOf检索，仅在MONITOR_ALL为false的情况有效
  
  MONITOR_ALL: 是否监听全部，默认为true，开启后，MONITOR_PATHS的内容将无效
  
  SKIP_PATHS: 略过的监听路径列表，规则同MONITOR_PATHS，仅在MONITOR_ALL为true的情况有效

  ALIAS_HOST: 别名host设置，类似于系统中hosts的设置，可配合该设置做combine工具使用(如开发机不支持打包，仅提供资源的情况)。例：{"js.t.sinajs.cn" : "10.210.215.97"}
  
####4. 示例：

    1.设置host: 127.0.0.1 a.tbcdn.cn;
    2.配置config.json的缓存路径："STATIC_CACHE_PATH";
    3.node server.js 启动监听
    4.访问http://ebook.taobao.com/

####5. 更新点：

    1). 增加"ALIAS_HOST"配置项
