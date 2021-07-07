---
title: 关于docker内nginx获取真实client-ip的问题
date: 2018-11-09T22:39:11.923Z
draft: false
path: /blog/关于docker内nginx获取真实client-ip的问题
description: MacOS有坑
tags: ['docker', 'nginx']
---

### 环境
系统:MacOS Mojave  
web环境:docker+nginx+php-fpm

### 问题
nginx始终无法获取到正确的客户端ip地址,获取到的是nginx所在docker容器的网关ip

### 原因
后来发现是MacOS下才有的问题,在linux下正常

### 方法
在nginx配置文件的`server`段加入以下
```
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header Host $http_host;
proxy_set_header X-NginX-Proxy true;
```

### 现存问题
当前配置可在linux下获取到正确的客户端ip,但macOS系统获取到的依然是gateway地址,目前多次google后仍然无果,以下为部分该问题相关的参考地址  
[Original ip is not passed to containers](https://github.com/docker/for-mac/issues/180)  
[Docker Beta on Mac : Cannot use ip to access nginx container](https://stackoverflow.com/questions/38340110/docker-beta-on-mac-cannot-use-ip-to-access-nginx-container)  
[docker 如何让 Nginx 获取到访问者 IP?](https://www.v2ex.com/t/488997)  

> 后续需要继续关注该问题的解决方案
