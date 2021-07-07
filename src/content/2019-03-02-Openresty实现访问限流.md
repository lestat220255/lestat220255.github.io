---
title: Openresty实现访问限流
date: 2019-03-02T22:39:11.923Z
draft: false
path: /blog/Openresty实现访问限流
description: 自己动手实现一个基于nginx+lua+redis的限制client访问频率+自动拉黑的限流方案
tags: ['openresty']
---


## 基本概念
![](https://ws1.sinaimg.cn/large/005NqLEEgy1g0oepurdfuj30b406tjsd.jpg)  

- Nginx：高性能、高并发的Web服务器，拥有丰富的第三方模块。
- Lua：一种轻量级、可嵌入式的脚本语言。
- Ngx_lua：Nginx的一个模块，将Lua嵌入到Nginx中，这样就可以使用Lua编写应用脚本，部署到Nginx中运行，即Nginx变成了一个Web容器，这样开发人员就可以使用Lua语言开发高性能Web应用了。

**引用官网的一个描述:**
> OpenResty® 的目标是让你的Web服务直接跑在 Nginx 服务内部，充分利用 Nginx 的非阻塞 I/O 模型，不仅仅对 HTTP 客户端请求,甚至于对远程后端诸如 MySQL、PostgreSQL、Memcached 以及 Redis 等都进行一致的高性能响应。

## 应用场景
- 在 Lua 中混合处理不同 Nginx 模块输出（proxy, drizzle, postgres, Redis, memcached 等）。
- 在请求真正到达上游服务之前，Lua 中处理复杂的准入控制和安全检查。
- 比较随意的控制应答头（通过 Lua）。
- 从外部存储中获取后端信息，并用这些信息来实时选择哪一个后端来完成业务访问。
- 在内容 handler 中随意编写复杂的 web 应用，同步编写异步访问后端数据库和其他存储。
- 在 rewrite 阶段，通过 Lua 完成非常复杂的处理。
- 在 Nginx 子查询、location 调用中，通过 Lua 实现高级缓存机制。
- 对外暴露强劲的 Lua 语言，允许使用各种 Nginx 模块，自由拼合没有任何限制。该模块的脚本有充分的灵活性，同时提供的性能水平与本地 C 语言程序无论是在 CPU 时间方面以及内存占用差距非常小。所有这些都要求 LuaJIT 2.x 是启用的。其他脚本语言实现通常很难满足这一性能水平。

## LuaNginxModule的执行阶段
![](https://ws1.sinaimg.cn/large/005NqLEEgy1g0oeyqe5ujj30rx0pawfh.jpg)
- set_by_lua*: 流程分支处理判断变量初始化
- rewrite_by_lua*: 转发、重定向、缓存等功能(例如特定请求代理到外网)
- access_by_lua*: IP 准入、接口权限等情况集中处理(例如配合 iptable 完成简单防火墙)
- content_by_lua*: 内容生成
- header_filter_by_lua*: 响应头部过滤处理(例如添加头部信息)
- body_filter_by_lua*: 响应体过滤处理(例如完成应答内容统一成大写)
- log_by_lua*: 会话完成后本地异步完成日志记录(日志可以记录在本地，还可以同步到其他机器)

## 限流的实现

> 由于近期工作中所负责的项目是开发App和一个前后端分离的管理系统的数据接口(统一采用jwt作为身份认证方式),且第一期已经接近尾声,因此除了做一些php代码层面的缓存优化之外,想到了需要学习一下除了bloomfilter之外的防止缓存穿透的办法(直接在web服务器层面通过redis动态限制访问频率,优点,性能损耗小,全程没有php参与),碰巧网上看到了Openresty,又是基于nginx(熟悉的配方),又能解决当下遇到的问题(神奇的味道),于是经过了几天的学习,也参考了一些其他博客中类似的实现,现记录下本人目前动态限流的实现过程

1. openresty下的nginx目录大致这样一个结构(只需看有注释的位置)
   
   ```bash
    |-- client_body_temp
    |-- conf
    |   |-- fastcgi.conf
    |   |-- fastcgi.conf.default
    |   |-- fastcgi_params
    |   |-- fastcgi_params.default
    |   |-- koi-utf
    |   |-- koi-win
    |   |-- mime.types
    |   |-- mime.types.default
    |   |-- nginx.conf #主配置文件
    |   |-- nginx.conf.default
    |   |-- scgi_params
    |   |-- scgi_params.default
    |   |-- uwsgi_params
    |   |-- uwsgi_params.default
    |   `-- win-utf
    |-- fastcgi_temp
    |-- html
    |   |-- 50x.html
    |   `-- index.html
    |-- logs
    |   |-- access.log -> /dev/stdout
    |   |-- error.log -> /dev/stderr
    |   `-- nginx.pid
    |-- lua
    |   |-- lua-cjson
    |   `-- lua-resty-redis
    |-- proxy_temp
    |-- sbin
    |   |-- nginx
    |   `-- stap-nginx
    |-- scgi_temp
    |-- src #自定义lua脚本目录
    |   |-- access_flow_control.lua
    |   |-- access_limit.lua
    |   |-- access_limit_by_specific_rules.lua #将使用的动态限流脚本
    |   `-- handle_logs.lua
    |-- tapset
    |   |-- nginx.stp
    |   `-- ngx_lua.stp
    `-- uwsgi_temp
   ```

2. 在`nginx.conf`中加入如下配置
   ```conf
    resolver 127.0.0.11 ipv6=off;#由于当前openresty安装在docker内,因此为了lua脚本中的hostname能被正确解析,添加此配置
    lua_code_cache off;#关闭lua代码缓存,每次代码更新后无需重启nginx即可生效
    server_tokens off;#隐藏openresty版本号
   ```

3. 在`conf.d/default.conf`中的相应`location`的`access`阶段挂载lua脚本
    ```conf
    location ~ \.php$ {
        #lua_need_request_body on;
        access_by_lua_file src/access_limit_by_specific_rules.lua;#在到达php处理前首先由挂载的lua脚本处理
        fastcgi_pass   php72:9000;
        fastcgi_index  index.php;
        fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
        include        fastcgi_params;
    }
    ```
4. `access_limit_by_specific_rules.lua`:
   
   ```lua
    -- local cjson = require "cjson"

    local function close_redis(red)
        if not red then
            return
        end
        --释放连接(连接池实现)
        local pool_max_idle_time = 10000 --毫秒
        local pool_size = 100 --连接池大小
        local ok, err = red:set_keepalive(pool_max_idle_time, pool_size)

        if not ok then
            ngx.log(ngx.ERR, "set redis keepalive error : ", err)
        end
    end

    -- ip最大频率
    local ipMaxFreq = 9
    -- token最大频率
    local tokenMaxFreq = 9
    -- 超过阈值后被ban时间
    local banExpire = 600

    --[[
        初始化redis
    ]]
    local redis = require "resty.redis"
    local red = redis:new()
    red:set_timeout(1000)
    local host = 'redis'
    local port = 6379
    local ok, err = red:connect(host,port)
    if not ok then
        return close_redis(red)
    end

    -- 请注意这里 auth 的调用过程
    -- local count
    -- count, err = red:get_reused_times()
    -- if 0 == count then
    --     ok, err = red:auth("password")
    --     if not ok then
    --         ngx.say("failed to auth: ", err)
    --         return
    --     end
    -- elseif err then
    --     ngx.say("failed to get reused times: ", err)
    --     return
    -- end

    --[[
        优先判断是否存在token
    ]]
    --token名称,此处根据实际情况修改
    local token = "Authorization"

    clientToken = ngx.req.get_headers()[token]

    --[[
        获取客户端真实IP
    ]]
    local clientIP = ngx.req.get_headers()["X-Real-IP"]
    if clientIP == nil then
        clientIP = ngx.req.get_headers()["x_forwarded_for"]
    end
    if clientIP == nil then
        clientIP = ngx.var.remote_addr
    end

    -- 获取所有cookie，这里获取到的是一个字符串，如果不存在则返回nil
    -- local clientHttpCookie = ngx.var.http_cookie

    -- 获取单个cookie，_后面的cookie的name，如果不存在则返回nil
    local clientCookie = ngx.var.http_cookie

    if clientToken ~= nil then
        local incrKey = "user:"..clientToken..":freq"
        local tokenBlockKey = "userToken:"..clientToken..":block"
        local ipBlockKey = "userIp:"..clientIP..":block"

        --[[
            判断是否被ban
        ]]
        local is_block,err = red:get(tokenBlockKey) -- check if token is blocked
        if tonumber(is_block) == 1 then
            ngx.exit(ngx.HTTP_FORBIDDEN)
            return close_redis(red)
        end

        local is_block,err = red:get(ipBlockKey) -- check if ip is blocked
        if tonumber(is_block) == 1 then
            ngx.exit(ngx.HTTP_FORBIDDEN)
            return close_redis(red)
        end

        --[[
        每秒访问频率+1
        ]]
        res, err = red:incr(incrKey)

        --[[
            上一步操作成功,则为当前key设置过期时间
        ]]
        if res == 1 then
            res, err = red:expire(incrKey,1)
        end

        --[[
            每秒请求数大于阈值,屏蔽指定值(秒)
        ]]
        if res > tokenMaxFreq then
            -- ban token
            res, err = red:set(tokenBlockKey,1)
            res, err = red:expire(tokenBlockKey,banExpire)

            -- ban ip
            res, err = red:set(ipBlockKey,1)
            res, err = red:expire(ipBlockKey,banExpire)

            -- ngx.log(ngx.ERR, tokenBlockKey)
            -- ngx.log(ngx.ERR, ipBlockKey)
        end
    elseif clientCookie ~= nil then
        local incrKey = "user:"..clientCookie..":freq"
        local cookieBlockKey = "userToken:"..clientCookie..":block"
        local ipBlockKey = "userIp:"..clientIP..":block"

        --[[
            判断是否被ban
        ]]
        local is_block,err = red:get(cookieBlockKey) -- check if token is blocked
        if tonumber(is_block) == 1 then
            ngx.exit(ngx.HTTP_FORBIDDEN)
            return close_redis(red)
        end

        local is_block,err = red:get(ipBlockKey) -- check if ip is blocked
        if tonumber(is_block) == 1 then
            ngx.exit(ngx.HTTP_FORBIDDEN)
            return close_redis(red)
        end

        --[[
        每秒访问频率+1
        ]]
        res, err = red:incr(incrKey)

        --[[
            上一步操作成功,则为当前key设置过期时间
        ]]
        if res == 1 then
            res, err = red:expire(incrKey,1)
        end

        --[[
            每秒请求数大于阈值,屏蔽指定值(秒)
        ]]
        if res > tokenMaxFreq then
            -- ban cookie
            res, err = red:set(cookieBlockKey,1)
            res, err = red:expire(cookieBlockKey,banExpire)

            -- ban ip
            res, err = red:set(ipBlockKey,1)
            res, err = red:expire(ipBlockKey,banExpire)

            -- ngx.log(ngx.ERR, cookieBlockKey)
            -- ngx.log(ngx.ERR, ipBlockKey)
        end
    else
        local incrKey = "user:"..clientIP..":freq"
        local blockKey = "userIp:"..clientIP..":block"

        --[[
            判断是否被ban
        ]]
        local is_block,err = red:get(blockKey) -- check if ip is blocked
        if tonumber(is_block) == 1 then
            ngx.exit(ngx.HTTP_FORBIDDEN)
            return close_redis(red)
        end

        --[[
            每秒访问频率+1
        ]]
        res, err = red:incr(incrKey)

        --[[
            上一步操作成功,则为当前key设置过期时间
        ]]
        if res == 1 then
            res, err = red:expire(incrKey,1)
        end

        --[[
            每秒请求数大于阈值,屏蔽指定值(秒)
        ]]
        if res > ipMaxFreq then
            res, err = red:set(blockKey,1)
            res, err = red:expire(blockKey,banExpire)
        end
    end

    --[[
        关闭redis
    ]]
    close_redis(red)
   ```
   > **以上代码处理了请求可能携带token/cookie或直接访问的情况;对直接访问的请求通过ip识别身份(但一个ip可能对应多个client),因此配置一个较高的每秒频率,超过频率后对ip进行全局forbidden至指定时间;对携带token/cookie访问的请求通过token/cookie识别身份(通常是同一个client),设置一个较低的频率,超过频率后对该token/cookie和其所在ip进行全局forbidden至指定时间**

5. 完成配置后,重启服务器
   ```
    nginx -s reload
   ```

## 效果对比
   
   > 注意ab test的一个坑,用于测试的文件需要保证每一次返回的html长度一致,否则ab test会判定为`length failure`,影响最终结果(当然也可以忽略它),[参考](https://stackoverflow.com/questions/579450/load-testing-with-ab-fake-failed-requests-length)

   1 . 频率限制前,`ab -n 100 -c 10 localhost/index.php`
   
   ```bash
    ➜  ~ ab -n 100 -c 10 localhost/index.php   
    This is ApacheBench, Version 2.3 <$Revision: 1843412 $>
    Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
    Licensed to The Apache Software Foundation, http://www.apache.org/

    Benchmarking localhost (be patient).....done


    Server Software:        openresty
    Server Hostname:        localhost
    Server Port:            80

    Document Path:          /index.php
    Document Length:        3 bytes

    Concurrency Level:      10
    Time taken for tests:   0.106 seconds
    Complete requests:      100
    Failed requests:        0
    Total transferred:      16300 bytes
    HTML transferred:       300 bytes
    Requests per second:    941.97 [#/sec] (mean)
    Time per request:       10.616 [ms] (mean)
    Time per request:       1.062 [ms] (mean, across all concurrent requests)
    Transfer rate:          149.94 [Kbytes/sec] received

    Connection Times (ms)
                min  mean[+/-sd] median   max
    Connect:        0    1   1.8      0       7
    Processing:     2    9   2.2      9      16
    Waiting:        0    9   2.4      9      16
    Total:          5   10   3.0      9      19

    Percentage of the requests served within a certain time (ms)
    50%      9
    66%      9
    75%     10
    80%     11
    90%     15
    95%     18
    98%     19
    99%     19
    100%     19 (longest request)
   ```

   2 . 频率限制后(限制为9),`ab -n 100 -c 10 localhost/index.php`
   
   ```bash
    ➜  ~ ab -n 100 -c 10 localhost/index.php
    This is ApacheBench, Version 2.3 <$Revision: 1843412 $>
    Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
    Licensed to The Apache Software Foundation, http://www.apache.org/

    Benchmarking localhost (be patient).....done


    Server Software:        openresty
    Server Hostname:        localhost
    Server Port:            80

    Document Path:          /index.php
    Document Length:        3 bytes

    Concurrency Level:      10
    Time taken for tests:   0.088 seconds
    Complete requests:      100
    Failed requests:        89
    (Connect: 0, Receive: 0, Length: 89, Exceptions: 0)
    Non-2xx responses:      89
    Total transferred:      29650 bytes
    HTML transferred:       14807 bytes
    Requests per second:    1131.03 [#/sec] (mean)
    Time per request:       8.841 [ms] (mean)
    Time per request:       0.884 [ms] (mean, across all concurrent requests)
    Transfer rate:          327.49 [Kbytes/sec] received

    Connection Times (ms)
                min  mean[+/-sd] median   max
    Connect:        0    0   0.2      0       1
    Processing:     4    8   1.5      8      15
    Waiting:        4    8   1.5      8      15
    Total:          4    8   1.5      8      15

    Percentage of the requests served within a certain time (ms)
    50%      8
    66%      9
    75%      9
    80%      9
    90%     10
    95%     10
    98%     14
    99%     15
    100%     15 (longest request)
   ```

   3 . 频率限制前,`ab -n 100 -c 10 -H 'Authorization: Bearer TestToken' localhost/index.php`
   
   ```bash
    ➜  ~ ab -n 100 -c 10 -H 'Authorization: Bearer TestToken' localhost/index.php
    This is ApacheBench, Version 2.3 <$Revision: 1843412 $>
    Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
    Licensed to The Apache Software Foundation, http://www.apache.org/

    Benchmarking localhost (be patient).....done


    Server Software:        openresty
    Server Hostname:        localhost
    Server Port:            80

    Document Path:          /index.php
    Document Length:        3 bytes

    Concurrency Level:      10
    Time taken for tests:   0.097 seconds
    Complete requests:      100
    Failed requests:        0
    Total transferred:      16300 bytes
    HTML transferred:       300 bytes
    Requests per second:    1028.65 [#/sec] (mean)
    Time per request:       9.721 [ms] (mean)
    Time per request:       0.972 [ms] (mean, across all concurrent requests)
    Transfer rate:          163.74 [Kbytes/sec] received

    Connection Times (ms)
                min  mean[+/-sd] median   max
    Connect:        0    0   0.1      0       1
    Processing:     3    9   1.5      9      14
    Waiting:        2    9   1.5      9      14
    Total:          3    9   1.6      9      14

    Percentage of the requests served within a certain time (ms)
    50%      9
    66%     10
    75%     10
    80%     11
    90%     11
    95%     12
    98%     13
    99%     14
    100%     14 (longest request)
   ```


   4 . 频率限制后(限制为9),`ab -n 100 -c 10 -H 'Authorization: Bearer TestToken' localhost/index.php`


   ```bash
    ➜  ~ ab -n 100 -c 10 -H 'Authorization: Bearer TestToken' localhost/index.php
    This is ApacheBench, Version 2.3 <$Revision: 1843412 $>
    Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
    Licensed to The Apache Software Foundation, http://www.apache.org/

    Benchmarking localhost (be patient).....done


    Server Software:        openresty
    Server Hostname:        localhost
    Server Port:            80

    Document Path:          /index.php
    Document Length:        3 bytes

    Concurrency Level:      10
    Time taken for tests:   0.076 seconds
    Complete requests:      100
    Failed requests:        89
    (Connect: 0, Receive: 0, Length: 89, Exceptions: 0)
    Non-2xx responses:      89
    Total transferred:      29650 bytes
    HTML transferred:       14807 bytes
    Requests per second:    1307.21 [#/sec] (mean)
    Time per request:       7.650 [ms] (mean)
    Time per request:       0.765 [ms] (mean, across all concurrent requests)
    Transfer rate:          378.50 [Kbytes/sec] received

    Connection Times (ms)
                min  mean[+/-sd] median   max
    Connect:        0    0   0.1      0       0
    Processing:     2    7   1.2      7      14
    Waiting:        2    7   1.2      7      14
    Total:          2    7   1.2      7      14

    Percentage of the requests served within a certain time (ms)
    50%      7
    66%      7
    75%      8
    80%      8
    90%      8
    95%      9
    98%     12
    99%     14
    100%     14 (longest request)
   ```

   5 . 在redis-cli中也可以获取到`block`数据
   
   ```bash
    127.0.0.1:6379> get userIp:172.27.0.1:block
    "1"
   ```

## 其他
- 以上请求频率限制+自动拉黑一段时间的方式可以一定程度上拦截一些恶意请求,误伤小,让通过脚本携带token/cookie进行大量请求攻击难度变大  
- 最近把自己本地的[开发环境](https://github.com/lestat220255/allindocker)发布到了github上,以方便在任何地方都可以快速搭建自己用着顺手的开发环境  
- redis的key太长(目前用token作为key)会明显影响性能吗?答案是:**不会**  [参考网址](https://stackoverflow.com/questions/6320739/does-name-length-impact-performance-in-redis)
- 关于docker容器内的DNS服务器地址为`127.0.0.11`的[官方说明](https://docs.docker.com/v17.09/engine/userguide/networking/configure-dns/)  