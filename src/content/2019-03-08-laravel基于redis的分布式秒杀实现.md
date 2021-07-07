---
title: laravel基于redis的分布式秒杀系统
date: 2019-03-08T22:39:11.923Z
draft: false
path: /blog/laravel基于redis的分布式秒杀系统
description: 通过redis的lpop实现防超卖
tags: ['laravel', 'redis']
---

## 场景
本文暂不讨论前端页面,cdn在秒杀上的性能优化,只关注从用户请求到达web服务器开始直至秒杀完成在redis中生成订单结束这个阶段的实现,后续还需要使用redis队列异步生成mysql订单实现数据的持久化  

## 实现

为了方便测试结果,当前本地的测试环境如下:  

### web服务器
使用了openresty监听本地的80端口,并代理到3台负载均衡服务器,由负载均衡服务器调用php-fpm实际处理所有请求的业务

nginx.conf中加入

```conf
upstream test {
    server localhost:16888;
    server localhost:16889;
    server localhost:16890;
}
```

conf.d/default.conf中加入

```conf
server {
    listen       80;
    server_name  localhost;

    location / {
        proxy_set_header        Host $host;
        proxy_set_header        X-Real-IP $remote_addr;
        proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass http://test;
    }
}

server {
    listen              16888;
    server_name         localhost;

    access_log  /var/log/nginx/balancer-1.access.log  main;
    error_log  /var/log/nginx/balancer-1.error.log  warn;

    root   /data/www/community/public;

    location / {
        access_by_lua_block{
            -- request header方便后台分辨请求来源服务器
            ngx.req.set_header('balancer', 'balancer-1')
            -- response header方便客户端查看当前请求由哪个服务器处理(仅测试用)
            ngx.header['balancer'] = 'balancer-1'
        }
        try_files $uri $uri/ /index.php?$query_string;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_set_header X-NginX-Proxy true;
        index  index.html index.htm index.php;
    }

    location ~ \.php$ {
        fastcgi_pass   php72:9000;
        fastcgi_index  index.php;
        fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
        include        fastcgi_params;
    }
}

server {
    listen              16889;
    server_name         localhost;

    access_log  /var/log/nginx/balancer-2.access.log  main;
    error_log  /var/log/nginx/balancer-2.error.log  warn;

    root   /data/www/community/public;

    location / {
        access_by_lua_block{
            ngx.req.set_header('balancer', 'balancer-2')
            ngx.header['balancer'] = 'balancer-2'
        }
        try_files $uri $uri/ /index.php?$query_string;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_set_header X-NginX-Proxy true;
        index  index.html index.htm index.php;
    }

    location ~ \.php$ {
        fastcgi_pass   php72:9000;
        fastcgi_index  index.php;
        fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
        include        fastcgi_params;
    }

}

server {
    listen              16890;
    server_name         localhost;

    access_log  /var/log/nginx/balancer-3.access.log  main;
    error_log  /var/log/nginx/balancer-3.error.log  warn;

    root   /data/www/community/public;

    location / {
        access_by_lua_block{
            ngx.req.set_header('balancer', 'balancer-3')
            ngx.header['balancer'] = 'balancer-3'
        }
        try_files $uri $uri/ /index.php?$query_string;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_set_header X-NginX-Proxy true;
        index  index.html index.htm index.php;
    }

    location ~ \.php$ {
        fastcgi_pass   php72:9000;
        fastcgi_index  index.php;
        fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
        include        fastcgi_params;
    }
}
```

同时开放本地的`16888`,`16889`,`16890`接口

### php代码

> 当前框架为laravel5.5

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class TestController extends Controller
{
    //商品id
    private $goods_id = 'spiketest';

    //库存数量
    private $store = 100;

    /*
    * 秒杀开始时,生成redis list
    * */
    public function genList()
    {
        //批量加入redis list
        for ($i = 0; $i < $this->store; $i++) {
            Redis::lpush($this->goods_id, 1);
        }
    }

    /*
    * 商品秒杀业务
    * */
    public function spike()
    {
        //记录秒杀开始时间
        if(100 == Redis::llen($this->goods_id)){
            Log::debug('秒杀开始:' . time());
        }

        //获取用户id
        $user_id = mt_rand(1, 999999999);

        //模拟生成订单(此处使用自定义的request header`HTTP_BALANCER`区分来自哪个负载均衡服务器,可用于统计)
        $order = ['source' => 'from-server:' . $_SERVER['HTTP_BALANCER'], 'id' => mt_rand(1, 999999999), 'user_id' => $user_id];

        //秒杀时间(测试效果)
        //$start = time() + 1;

        //判断是否到达秒杀时间
        /*if (time() < $start) {
            echo '秒杀尚未开始';
            return;
        }*/

        //判断当前用户是否已经成功秒杀过
        if (Redis::hexists('successList', $user_id)) {
            echo '不能重复秒杀';
            return;
        }

        //库存减少1
        $count = Redis::lpop($this->goods_id);

        if (!$count) {
            echo '库存不足';
            return;
        }

        //生成订单
        Redis::hSet("successList", $user_id, json_encode($order));

        //记录秒杀开始时间
        if(!Redis::llen($this->goods_id)){
            Log::debug('秒杀结束:' . time());
        }
    }
}
```

## 测试

1. 首先用`genList`生成100条库存
2. 用jmeter或者ab进行对`spike`发起的并发10000总数为50000的请求,测试秒杀耗时以及是否会出现超卖的情况
   
## 测试结果
生成记录后在redis中查看
```bash
127.0.0.1:6379> llen spiketest
(integer) 100
```

这里使用`ab -n 50000 -c 10000 localhost/test`测试,再到redis中查看
```bash
127.0.0.1:6379> llen spiketest
(integer) 0
127.0.0.1:6379> HLEN successList
(integer) 100
127.0.0.1:6379> HKEYS successList
  1) "600115918"
  2) "795114864"
  3) "655637466"
..................省略...................
 98) "239547040"
 99) "802502220"
100) "355926384"
127.0.0.1:6379> 
```

日志中的时间记录
```
[2019-03-08 14:39:28] local.DEBUG: 秒杀开始  
[2019-03-08 14:39:32] local.DEBUG: 秒杀结束  
```

以上秒杀方案虽然支持分布式的业务服务器,但测试用redis为单机版,如果是分布式redis则还需要ZooKeeper这样的分布式锁解决方案