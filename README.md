bstaticsrc
==========

基于node的静态资源抓取及解析工具，当前仅支持http请求


####1. 使用方法

    // 配置config.json文件
    
    // 启动server
    node server.js

###2. config.json配置说明

  STATIC_PROXY: 静态资源代理地址，使用默认配置即可
  
  STATIC_CACHE_PATH: 缓存路径
  
  FILE_SPLIT_SYM: 多个文件combine的分隔符，默认为“,”
  
  AUTO_ASSORT_PATH: 是否整理缓存路径，默认为true，将按域名创建路径
  
  MONITOR_PATHS: 监听文件地址，可输入关键词即可，将使用indexOf检索，仅在MONITOR_ALL为false的情况有效
  
  MONITOR_ALL: 是否监听全部，默认为true，开启后，MONITOR_PATHS的内容将无效
  
  SKIP_PATHS: 略过的监听路径列表，规则同MONITOR_PATHS，仅在MONITOR_ALL为true的情况有效
